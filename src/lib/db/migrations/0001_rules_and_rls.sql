-- =====================================================================================================
-- Devatop Volunteers: database rules and row-level security (RLS)
--
-- Written for Supabase (auth.uid(), auth.jwt(), roles anon / authenticated / service_role).
-- Read docs/developer/database.md for the plain-English version.
--
-- HOW TO READ THIS FILE
--   1. Helper functions   who is the caller? what may they do? is a volunteer inside their scope?
--   2. Rule triggers      the rules that must hold even if app code is wrong (CLAUDE.md rules 4, 6, 7, 8)
--   3. Functions          the few things callers do through a function instead of a table (QR check-in, guardian link, ...)
--   4. RLS policies       who can read or write which rows. Everything is DENIED unless a policy allows it.
--   5. Grants             least privilege for the API roles.
--
-- A NOTE ON TRIGGERS AND ROLES
--   Guard triggers are SECURITY INVOKER and only restrict the API roles (authenticated, anon): they test
--   current_user. Effect triggers (e.g. "approving an application activates the volunteer") are SECURITY
--   DEFINER and run as the table owner, so they are not blocked by the guards. The service role and
--   migrations are never restricted by a guard, but the HARD RULES below apply to everyone.
-- =====================================================================================================

-- ---------------------------------------------------------------------------- 0. identity link
alter table public.users
  add constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id) values (new.id) on conflict do nothing;  -- role defaults to 'volunteer'
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- certificates get a short public verification code, e.g. DVT-7K2M-9QXA (no 0/O/1/I to avoid misreading)
create function public.new_cert_code() returns text language plpgsql volatile as $$
declare chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; out text := 'DVT-'; i int;
begin
  for i in 1..8 loop
    out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    if i = 4 then out := out || '-'; end if;
  end loop;
  return out;
end $$;
alter table public.certificates alter column code set default public.new_cert_code();

-- ---------------------------------------------------------------------------- 1. helper functions
-- Is this an API caller (as opposed to the service role, a migration, or a definer trigger)?
create function public.is_api_caller() returns boolean language sql stable as $$
  select current_user in ('authenticated', 'anon')  -- inside a SECURITY DEFINER function current_user is the owner, so definer effects are never blocked by guards
$$;

-- Admins must have signed in with two-factor (Supabase assurance level aal2). Without it, nobody is an admin.
create function public.is_aal2() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create function public.has_perm(p text) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_aal2() and exists (
    select 1 from admin_roles ar join role_permissions rp on rp.role = ar.role
    where ar.user_id = auth.uid() and rp.action = p)
$$;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_aal2() and exists (select 1 from admin_roles where user_id = auth.uid())
$$;

create function public.my_admin_role() returns public.admin_role_kind language sql stable security definer set search_path = public as $$
  select role from admin_roles where user_id = auth.uid() and public.is_aal2()
$$;

-- Is this volunteer inside the calling admin's scope? (matrix: "Own programme" / "Own state" / department)
-- Applied inside the query by RLS, so out-of-scope rows are never even loaded.
create function public.in_scope(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_aal2() and exists (
    select 1 from admin_roles ar where ar.user_id = auth.uid() and (
      ar.role in ('super_admin', 'volunteer_coordinator', 'viewer')
      or (ar.role = 'state_lead' and exists (select 1 from volunteer_profiles vp where vp.user_id = target and vp.state = ar.state))
      or (ar.role = 'department_lead' and (
            exists (select 1 from department_memberships dm where dm.user_id = target and dm.department_id = ar.department_id and dm.status <> 'left')
         or exists (select 1 from applications a join application_departments ad on ad.application_id = a.id
                    where a.user_id = target and ad.department_id = ar.department_id)))
      or (ar.role = 'programme_manager' and exists (select 1 from volunteer_programmes vpg where vpg.user_id = target and vpg.programme_id = ar.programme_id))
    ))
$$;

-- Is an opportunity (state, programme, department) inside the calling admin's scope?
create function public.opp_in_scope(s text, p uuid, d uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_aal2() and exists (
    select 1 from admin_roles ar where ar.user_id = auth.uid() and (
      ar.role in ('super_admin', 'volunteer_coordinator')
      or (ar.role = 'state_lead' and s is not null and s = ar.state)
      or (ar.role = 'programme_manager' and p = ar.programme_id)
      or (ar.role = 'department_lead' and d is not null and d = ar.department_id)))
$$;
create function public.opp_scope(oid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select public.opp_in_scope(o.state, o.programme_id, o.department_id) from opportunities o where o.id = oid), false)
$$;

create function public.age_years(dob date) returns int language sql immutable as $$
  select date_part('year', age(current_date, dob))::int
$$;
-- Age of a volunteer, read with definer rights: the guards must know it even when the caller cannot see date of birth (e.g. a State Lead).
create function public.volunteer_age(uid uuid) returns int language sql stable security definer set search_path = public as $$
  select public.age_years(date_of_birth) from volunteer_private where user_id = uid
$$;
create function public.min_age() returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from app_settings where key = 'min_age'), 16)
$$;
-- latest consent of a kind is "given" (a withdrawal is a newer row)
create function public.has_consent(uid uuid, k public.consent_kind) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select action = 'given' from consents where user_id = uid and kind = k order by created_at desc, id desc limit 1), false)
$$;
create function public.has_verified_guardian(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from guardian_consents where user_id = uid and verified)
$$;
create function public.confirmed_count(oid uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from signups where opportunity_id = oid and status = 'confirmed'
$$;
create function public.approved_hours(uid uuid, d1 date, d2 date) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(hours), 0) from hour_logs where user_id = uid and status = 'approved' and worked_on between d1 and d2
$$;
create function public.super_admin_count() returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from admin_roles where role = 'super_admin'
$$;

-- ---------------------------------------------------------------------------- 2. audit log (rule 4)
-- Written by triggers so no code path can forget. Holds ids and enum values only: never names, phones or emails (rule 5).
create function public.audit_event(p_action text, p_table text, p_record text, p_detail jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into audit_logs (actor_id, action, table_name, record_id, detail) values (auth.uid(), p_action, p_table, p_record, p_detail)
$$;

create function public.audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_logs is append-only' using errcode = '42501'; end $$;
create trigger audit_logs_no_update before update or delete on public.audit_logs for each row execute function public.audit_immutable();

-- ---------------------------------------------------------------------------- 3. rule triggers
-- 3a. users: the role can never be changed through the API (admins are made by a super admin via admin_roles / service role)
create function public.users_guard() returns trigger language plpgsql as $$
begin
  if public.is_api_caller() and new.role is distinct from old.role then raise exception 'role cannot be changed' using errcode = '42501'; end if;
  if new.id is distinct from old.id then raise exception 'id is immutable'; end if;
  return new;
end $$;
create trigger users_guard_t before update on public.users for each row execute function public.users_guard();

-- 3b. volunteer_profiles: owners cannot change their own status, except toggling active <-> inactive
create function public.profiles_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if public.is_api_caller() then new.status := 'applicant'; new.roll_opt_in := coalesce(new.roll_opt_in, false); end if;
    return new;
  end if;
  if new.user_id is distinct from old.user_id then raise exception 'user_id is immutable'; end if;
  if public.is_api_caller() and new.status is distinct from old.status then
    if public.has_perm('volunteers.suspend') and public.in_scope(old.user_id) then
      null; -- an admin suspending / reactivating inside their scope
    elsif auth.uid() = old.user_id and old.status in ('active', 'inactive') and new.status in ('active', 'inactive') then
      null; -- "Yes, any time. Set your profile to inactive."
    else
      raise exception 'status can only be changed by an admin' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard_t before insert or update on public.volunteer_profiles for each row execute function public.profiles_guard();

-- 3c. date of birth: once given it cannot be edited by the volunteer (otherwise a minor could turn into an adult after the guardian check)
create function public.private_guard() returns trigger language plpgsql as $$
begin
  if public.is_api_caller() and new.date_of_birth is distinct from old.date_of_birth and not public.has_perm('volunteers.dob') then
    raise exception 'date of birth can only be corrected by an authorised admin' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger private_guard_t before update on public.volunteer_private for each row execute function public.private_guard();

-- 3d. applications: age check, guardian check, consents, and the stage rules
create function public.applications_insert_guard() returns trigger language plpgsql as $$
declare age int := public.volunteer_age(new.user_id);
begin
  if public.is_api_caller() then new.stage := 'submitted'; new.reviewed_by := null; new.reviewed_at := null; end if;
  if age is null then raise exception 'date of birth is required before applying'; end if;
  if age < public.min_age() then raise exception 'below_minimum_age'; end if;
  -- an applicant under 18 cannot submit until a parent or guardian has confirmed (acceptance criteria, Application)
  if age < 18 and not public.has_verified_guardian(new.user_id) then raise exception 'under_18_needs_guardian_consent'; end if;
  -- every required consent must be on record, with its exact wording (rule 8)
  if not (public.has_consent(new.user_id, 'code_of_conduct') and public.has_consent(new.user_id, 'safeguarding') and public.has_consent(new.user_id, 'privacy')) then
    raise exception 'required_consents_missing';
  end if;
  return new;
end $$;
create trigger applications_insert_guard_t before insert on public.applications for each row execute function public.applications_insert_guard();

create function public.applications_update_guard() returns trigger language plpgsql as $$
declare age int := public.volunteer_age(old.user_id); is_minor boolean;
begin
  if new.user_id is distinct from old.user_id then raise exception 'user_id is immutable'; end if;
  if new.stage is distinct from old.stage then
    -- RULE 6: an under-18 cannot be approved without a verified guardian consent. Applies to EVERYONE, including the service role.
    if new.stage = 'approved' then
      is_minor := age is null or age < 18;  -- unknown age is treated as a minor: the safe default
      if is_minor and not public.has_verified_guardian(new.user_id) then raise exception 'under_18_needs_guardian_consent' using errcode = 'P0001'; end if;
      if new.user_id = auth.uid() then raise exception 'you cannot approve your own application' using errcode = '42501'; end if;
    end if;
    if public.is_api_caller() then
      if auth.uid() = old.user_id and not public.has_perm('applications.decide') then
        -- an applicant may only send an application back to the queue after "needs more info"
        if not (old.stage = 'needs_info' and new.stage = 'submitted') then raise exception 'only a reviewer can change the stage' using errcode = '42501'; end if;
      else
        if not (public.has_perm('applications.decide') and public.in_scope(old.user_id)) then raise exception 'not allowed' using errcode = '42501'; end if;
        if new.stage = 'approved' then
          if (age is null or age < 18) and not public.has_perm('applications.approveMinor') then
            raise exception 'your role cannot approve an under-18 applicant' using errcode = '42501';
          end if;
        end if;
        new.reviewed_by := auth.uid(); new.reviewed_at := now();
      end if;
    end if;
  elsif public.is_api_caller() and not (public.has_perm('applications.decide') and public.in_scope(old.user_id)) then
    -- an applicant editing answers cannot touch reviewer fields
    new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at; new.reviewer_note := old.reviewer_note; new.needs_info_note := old.needs_info_note;
    if old.stage not in ('submitted', 'needs_info') then raise exception 'application can no longer be edited' using errcode = '42501'; end if;
  end if;
  return new;
end $$;
create trigger applications_update_guard_t before update on public.applications for each row execute function public.applications_update_guard();

-- approving activates the volunteer; audit every decision
create function public.applications_after_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    if new.stage = 'approved' then update volunteer_profiles set status = 'active' where user_id = new.user_id and status = 'applicant'; end if;
    perform public.audit_event('application.' || new.stage::text, 'applications', new.id::text, jsonb_build_object('from', old.stage, 'to', new.stage));
  end if;
  return new;
end $$;
create trigger applications_after_update_t after update on public.applications for each row execute function public.applications_after_update();

-- 3e. consents: append-only proof (rule 8). The only permitted edit is the anonymising set-null when an account is deleted.
create function public.consents_immutable() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.user_id is null and old.user_id is not null
     and new.kind = old.kind and new.action = old.action and new.text_version = old.text_version and new.text_snapshot = old.text_snapshot and new.created_at = old.created_at then
    return new;
  end if;
  raise exception 'consents are append-only: add a withdrawal row instead' using errcode = '42501';
end $$;
create trigger consents_immutable_t before update or delete on public.consents for each row execute function public.consents_immutable();

-- withdrawing privacy / data-use consent takes the volunteer off the public Roll straight away
create function public.consents_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.action = 'withdrawn' and new.kind in ('privacy', 'data_use') and new.user_id is not null then
    update volunteer_profiles set roll_opt_in = false where user_id = new.user_id;
  end if;
  return new;
end $$;
create trigger consents_after_insert_t after insert on public.consents for each row execute function public.consents_after_insert();

-- 3f. signups: capacity, deadline, active volunteers only, waitlist, and cancelling frees the slot immediately
create function public.signups_before_insert() returns trigger language plpgsql as $$
declare o record; st public.volunteer_status;
begin
  select * into o from opportunities where id = new.opportunity_id;
  if not found then raise exception 'opportunity not found'; end if;
  if public.is_api_caller() and not public.has_perm('opportunities.edit') then
    if new.user_id is distinct from auth.uid() then raise exception 'you can only sign yourself up' using errcode = '42501'; end if;
    if now() > o.signup_deadline then raise exception 'signup_closed'; end if;
    select status into st from volunteer_profiles where user_id = new.user_id;
    if st is distinct from 'active' then raise exception 'only_active_volunteers'; end if;
  end if;
  new.cancelled_at := null;
  new.status := case when public.confirmed_count(new.opportunity_id) >= o.slots then 'waitlisted' else 'confirmed' end;
  return new;
end $$;
create trigger signups_before_insert_t before insert on public.signups for each row execute function public.signups_before_insert();

create function public.signups_before_update() returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id or new.opportunity_id is distinct from old.opportunity_id then raise exception 'immutable'; end if;
  if public.is_api_caller() and not (public.has_perm('opportunities.edit') and public.opp_scope(old.opportunity_id)) then
    if new.status is distinct from 'cancelled' then raise exception 'you can only cancel your own sign-up' using errcode = '42501'; end if;
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then new.cancelled_at := now(); end if;
  return new;
end $$;
create trigger signups_before_update_t before update on public.signups for each row execute function public.signups_before_update();

create function public.signups_after_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'confirmed' and new.status = 'cancelled' then
    update signups set status = 'confirmed' where id = (
      select id from signups where opportunity_id = new.opportunity_id and status = 'waitlisted' order by created_at, id limit 1);
  end if;
  return new;
end $$;
create trigger signups_after_update_t after update on public.signups for each row execute function public.signups_after_update();

-- 3g. hour_logs: RULE 7, only an admin can approve hours, and only approved hours count (everywhere else filters status = 'approved')
create function public.hours_guard() returns trigger language plpgsql as $$
declare is_staff boolean;
begin
  if tg_op = 'INSERT' then
    if public.is_api_caller() then
      is_staff := public.has_perm('attendance.take') and new.user_id is not null and public.in_scope(new.user_id);
      if not is_staff then
        if new.user_id is distinct from auth.uid() or new.method <> 'remote_log' then raise exception 'volunteers can only log their own remote hours' using errcode = '42501'; end if;
      end if;
      new.status := 'pending'; new.decided_by := null; new.decided_at := null; new.decision_note := null;
    end if;
    -- even the service role cannot insert an approved log without a deciding admin
    if new.status <> 'pending' and not exists (select 1 from admin_roles where user_id = new.decided_by) then raise exception 'hours_approval_needs_admin'; end if;
    return new;
  end if;

  -- UPDATE
  if new.user_id is distinct from old.user_id and public.is_api_caller() then raise exception 'user_id is immutable'; end if;
  if new.status is distinct from old.status or new.decided_by is distinct from old.decided_by then
    if public.is_api_caller() then
      if not (public.has_perm('hours.approve') and old.user_id is not null and public.in_scope(old.user_id)) then raise exception 'only an admin can approve, reject or reopen hours' using errcode = '42501'; end if;
      if old.user_id = auth.uid() then raise exception 'you cannot decide your own hours' using errcode = '42501'; end if;
      new.decided_by := auth.uid(); new.decided_at := case when new.status = 'pending' then null else now() end;
    end if;
    if new.status <> 'pending' and not exists (select 1 from admin_roles where user_id = new.decided_by) then raise exception 'hours_approval_needs_admin'; end if;
  elsif public.is_api_caller() and old.status <> 'pending' and not (public.has_perm('hours.approve') and public.in_scope(old.user_id)) then
    raise exception 'decided hours cannot be edited' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger hours_guard_t before insert or update on public.hour_logs for each row execute function public.hours_guard();

create function public.hours_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.audit_event('hours.' || new.status::text, 'hour_logs', new.id::text, jsonb_build_object('from', old.status, 'to', new.status, 'hours', new.hours));
  end if;
  return new;
end $$;
create trigger hours_audit_t after update on public.hour_logs for each row execute function public.hours_audit();

-- 3h. certificates: "A certificate cannot be issued for hours that are not approved." Only revocation may be edited later.
create function public.certificates_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id is null then raise exception 'a certificate needs a volunteer'; end if;
    if abs(new.hours - public.approved_hours(new.user_id, new.period_start, new.period_end)) > 0.05 then
      raise exception 'certificate_needs_approved_hours: approved hours in this period are %', public.approved_hours(new.user_id, new.period_start, new.period_end);
    end if;
    if public.is_api_caller() then new.issued_by := auth.uid(); new.revoked_at := null; end if;
    return new;
  end if;
  if (to_jsonb(new) - 'revoked_at' - 'user_id') is distinct from (to_jsonb(old) - 'revoked_at' - 'user_id') then raise exception 'issued certificates are immutable (revoke instead)' using errcode = '42501'; end if;
  return new;
end $$;
create trigger certificates_guard_t before insert or update on public.certificates for each row execute function public.certificates_guard();

-- 3i. departments: archive or merge, never lose history (rule 10)
create function public.departments_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from department_memberships where department_id = old.id)
       or exists (select 1 from opportunities where department_id = old.id)
       or exists (select 1 from guides where department_id = old.id)
       or exists (select 1 from application_departments where department_id = old.id)
       or exists (select 1 from certificates where department_id = old.id) then
      raise exception 'department_has_history: archive or merge it instead' using errcode = '23503';
    end if;
    return old;
  end if;
  if new.status = 'archived' and old.status = 'active' and exists (select 1 from department_memberships where department_id = old.id and status = 'active') then
    raise exception 'department_has_active_members: move or release them first' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger departments_guard_t before update or delete on public.departments for each row execute function public.departments_guard();

-- 3j. admin roles: never fewer than two Super Admins, so Devatop can never be locked out
create function public.admin_roles_guard() returns trigger language plpgsql as $$
declare before_n int := public.super_admin_count(); after_n int;
begin
  after_n := before_n
    - case when tg_op in ('UPDATE', 'DELETE') and old.role = 'super_admin' then 1 else 0 end
    + case when tg_op in ('INSERT', 'UPDATE') and new.role = 'super_admin' then 1 else 0 end;
  if after_n < least(2, before_n) then raise exception 'at_least_two_super_admins: this change would leave % Super Admin(s)', after_n using errcode = 'P0001'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger admin_roles_guard_t before insert or update or delete on public.admin_roles for each row execute function public.admin_roles_guard();

-- 3k. opportunities: secret for the QR code, creator, audit
create function public.opportunities_before() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and public.is_api_caller() then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger opportunities_before_t before insert on public.opportunities for each row execute function public.opportunities_before();
create function public.opportunities_after() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then insert into opportunity_secrets (opportunity_id) values (new.id); end if;
  perform public.audit_event('opportunity.' || lower(tg_op), 'opportunities', new.id::text, '{}');
  return new;
end $$;
create trigger opportunities_after_t after insert or update on public.opportunities for each row execute function public.opportunities_after();

-- 3l. audit for other admin writes
create function public.audit_generic() returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
begin
  -- the record id is whichever identifier the table has; only ids are logged, never personal data
  perform public.audit_event(tg_table_name || '.' || lower(tg_op), tg_table_name, coalesce(j ->> 'id', j ->> 'key', j ->> 'user_id', j ->> 'code'), '{}');
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger audit_departments after insert or update or delete on public.departments for each row execute function public.audit_generic();
create trigger audit_admin_roles after insert or update or delete on public.admin_roles for each row execute function public.audit_generic();
create trigger audit_certificates after insert or update on public.certificates for each row execute function public.audit_generic();
create trigger audit_app_settings after insert or update or delete on public.app_settings for each row execute function public.audit_generic();
create trigger audit_email_templates after insert or update or delete on public.email_templates for each row execute function public.audit_generic();
create trigger audit_messages after insert on public.messages for each row execute function public.audit_generic();
create function public.profiles_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.audit_event('volunteer.status', 'volunteer_profiles', new.user_id::text, jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger profiles_audit_t after update on public.volunteer_profiles for each row execute function public.profiles_audit();

-- 3m. chat: author snapshot, no contact details in group rooms, reports and moderation
create function public.chat_can_read(r text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when r = 'general' then public.is_admin() or exists (select 1 from volunteer_profiles where user_id = auth.uid() and status = 'active')
    when r = 'heads' then coalesce(public.my_admin_role() <> 'viewer', false)
    when r like 'dept:%' then
         exists (select 1 from department_memberships dm where dm.user_id = auth.uid() and dm.status = 'active' and dm.department_id::text = substr(r, 6))
      or coalesce(public.my_admin_role() in ('super_admin', 'programme_manager', 'volunteer_coordinator'), false)
      or exists (select 1 from admin_roles ar where ar.user_id = auth.uid() and public.is_aal2() and ar.role = 'department_lead' and ar.department_id::text = substr(r, 6))
    when r like 'support:%' then auth.uid()::text = substr(r, 9)
      or coalesce(public.my_admin_role() in ('super_admin', 'programme_manager', 'volunteer_coordinator'), false)
    else false end
$$;
create function public.chat_can_post(r text) returns boolean language sql stable security definer set search_path = public as $$
  select public.chat_can_read(r) and coalesce(public.my_admin_role() is distinct from 'viewer', true)
$$;
create function public.chat_can_moderate(r text) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when coalesce(public.my_admin_role() in ('super_admin', 'programme_manager', 'volunteer_coordinator'), false) then true
    when r like 'dept:%' then exists (select 1 from admin_roles ar where ar.user_id = auth.uid() and public.is_aal2() and ar.role = 'department_lead' and ar.department_id::text = substr(r, 6))
    else false end
$$;

create function public.chat_guard() returns trigger language plpgsql as $$
declare p record;
begin
  if tg_op = 'INSERT' then
    if public.is_api_caller() then
      new.author_id := auth.uid(); new.reported := false; new.deleted_at := null;
      new.author_staff := public.is_admin();
      if new.author_staff then new.author_name := 'Devatop Team';
      else
        select first_name, last_name into p from volunteer_profiles where user_id = auth.uid();
        new.author_name := coalesce(p.first_name || ' ' || left(p.last_name, 1) || '.', 'Volunteer');
        -- safeguarding: no phone numbers or emails in group rooms (Support is private, so it is exempt)
        if new.room not like 'support:%' and new.body ~ '(\+?\d[\d\s-]{8,}\d)|([[:alnum:]._+-]+@[[:alnum:]-]+\.[[:alnum:].]+)' then
          raise exception 'no_contact_details_in_group_rooms' using errcode = 'P0001';
        end if;
      end if;
    end if;
    return new;
  end if;
  -- UPDATE: readers may only report; moderators may remove (the text is blanked)
  if public.is_api_caller() then
    if (to_jsonb(new) - 'reported' - 'deleted_at' - 'body') is distinct from (to_jsonb(old) - 'reported' - 'deleted_at' - 'body') then raise exception 'messages cannot be edited' using errcode = '42501'; end if;
    if new.deleted_at is distinct from old.deleted_at then
      if not public.chat_can_moderate(old.room) then raise exception 'only a moderator can remove messages' using errcode = '42501'; end if;
      new.body := '[removed by a moderator]';
    elsif new.body is distinct from old.body then raise exception 'messages cannot be edited' using errcode = '42501';
    end if;
    if new.reported = false and old.reported = true and not public.chat_can_moderate(old.room) then new.reported := true; end if;
  end if;
  return new;
end $$;
create trigger chat_guard_t before insert or update on public.chat_messages for each row execute function public.chat_guard();
create function public.chat_after_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    perform public.audit_event('chat.removed', 'chat_messages', new.id::text, jsonb_build_object('room', new.room));
  end if;
  return new;
end $$;
create trigger chat_after_update_t after update on public.chat_messages for each row execute function public.chat_after_update();

-- 3n. guides: touch updated_at
create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger guides_touch before update on public.guides for each row execute function public.touch_updated_at();

-- 3o. department memberships: a volunteer may ask to join, or leave; only an admin accepts
create function public.memberships_guard() returns trigger language plpgsql as $$
begin
  if public.is_api_caller() and not public.has_perm('departments.assign') then
    if tg_op = 'INSERT' then
      if new.user_id is distinct from auth.uid() then raise exception 'you can only request for yourself' using errcode = '42501'; end if;
      new.status := 'requested'; new.role := 'member'; new.joined_at := null; new.left_at := null;
    else
      if new.status is distinct from 'left' or new.role is distinct from old.role then raise exception 'you can only leave a department' using errcode = '42501'; end if;
      new.left_at := now();
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'active' and old.status = 'requested' then
    new.joined_at := now();
  end if;
  return new;
end $$;
create trigger memberships_guard_t before insert or update on public.department_memberships for each row execute function public.memberships_guard();

-- ---------------------------------------------------------------------------- 4. functions callers use directly
-- Guardian (not logged in): look up the request behind an emailed link. Only the minimum needed to show the page.
create function public.guardian_request_info(p_token text) returns table (applicant_first_name text, guardian_name text, decision public.guardian_decision, expired boolean)
language sql stable security definer set search_path = public as $$
  select vp.first_name, gr.guardian_name, gr.decision, gr.expires_at < now()
  from guardian_requests gr join volunteer_profiles vp on vp.user_id = gr.user_id
  where gr.token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')
$$;

-- Guardian gives or refuses consent. A verified guardian_consents row is what lets an under-18 be approved (rule 6).
create function public.record_guardian_decision(p_token text, p_decision public.guardian_decision) returns public.guardian_decision
language plpgsql security definer set search_path = public as $$
declare r guardian_requests;
begin
  if p_decision not in ('given', 'refused') then raise exception 'decision must be given or refused'; end if;
  select * into r from guardian_requests where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') for update;
  if not found then raise exception 'unknown_link'; end if;
  if r.decision <> 'pending' then raise exception 'already_decided'; end if;
  if r.expires_at < now() then raise exception 'link_expired'; end if;
  update guardian_requests set decision = p_decision, decided_at = now() where id = r.id;
  if p_decision = 'given' then
    insert into guardian_consents (user_id, request_id, guardian_name, guardian_contact, verified, verified_at) values (r.user_id, r.id, r.guardian_name, r.guardian_contact, true, now());
  end if;
  return p_decision;
end $$;

-- QR check-in and check-out. The volunteer scans a code containing the opportunity id and its secret.
create function public.qr_window_ok(o opportunities) returns boolean language sql stable as $$
  select now() between o.starts_at - interval '3 hours' and coalesce(o.ends_at, o.starts_at + interval '12 hours') + interval '6 hours'
$$;
create function public.check_in(p_opportunity uuid, p_secret text) returns void language plpgsql security definer set search_path = public as $$
declare o opportunities; me uuid := auth.uid();
begin
  select * into o from opportunities where id = p_opportunity;
  if not found or not exists (select 1 from opportunity_secrets where opportunity_id = p_opportunity and qr_secret = p_secret) then raise exception 'invalid_qr'; end if;
  if not public.qr_window_ok(o) then raise exception 'outside_event_window'; end if;
  if not exists (select 1 from volunteer_profiles where user_id = me and status = 'active') then raise exception 'only_active_volunteers'; end if;
  -- walk-ins are allowed at the door; the coordinator sees them on the list
  insert into signups (user_id, opportunity_id) values (me, p_opportunity) on conflict (user_id, opportunity_id) do nothing;
  insert into attendance (opportunity_id, user_id, checked_in_at, method) values (p_opportunity, me, now(), 'qr')
    on conflict (opportunity_id, user_id) do update set checked_in_at = coalesce(attendance.checked_in_at, excluded.checked_in_at);
end $$;
create function public.check_out(p_opportunity uuid, p_secret text) returns numeric language plpgsql security definer set search_path = public as $$
declare o opportunities; a attendance; me uuid := auth.uid(); h numeric;
begin
  select * into o from opportunities where id = p_opportunity;
  if not found or not exists (select 1 from opportunity_secrets where opportunity_id = p_opportunity and qr_secret = p_secret) then raise exception 'invalid_qr'; end if;
  select * into a from attendance where opportunity_id = p_opportunity and user_id = me;
  if not found or a.checked_in_at is null then raise exception 'not_checked_in'; end if;
  if a.checked_out_at is not null then raise exception 'already_checked_out'; end if;
  update attendance set checked_out_at = now() where id = a.id;
  h := greatest(0.5, least(24, round(extract(epoch from (now() - a.checked_in_at)) / 3600 * 2) / 2));
  -- hours are recorded automatically, but stay PENDING until an admin approves them (rule 7)
  insert into hour_logs (user_id, opportunity_id, programme_id, activity, worked_on, hours, method, status)
    values (me, p_opportunity, o.programme_id, o.title, current_date, h, 'qr', 'pending');
  return h;
end $$;

-- Public certificate check: shows only that it is genuine, with name, hours and dates. Nothing else about the person.
create function public.verify_certificate(p_code text) returns table (holder_name text, hours numeric, period_start date, period_end date)
language sql stable security definer set search_path = public as $$
  select holder_name, hours, period_start, period_end from certificates where code = upper(trim(p_code)) and revoked_at is null
$$;

-- Merge one department into another: members, opportunities, guides, applications move; history is kept; the old one is archived.
create function public.merge_departments(p_from uuid, p_into uuid) returns int language plpgsql security definer set search_path = public as $$
declare moved int;
begin
  if not public.has_perm('departments.manage') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_from = p_into then raise exception 'cannot merge a department into itself'; end if;
  if not exists (select 1 from departments where id = p_into and status = 'active') then raise exception 'target must be an active department'; end if;
  select count(*) into moved from department_memberships where department_id = p_from and status <> 'left';
  -- members already in the target keep their target row
  delete from department_memberships dm where dm.department_id = p_from and exists (select 1 from department_memberships t where t.department_id = p_into and t.user_id = dm.user_id);
  update department_memberships set department_id = p_into where department_id = p_from;
  update opportunities set department_id = p_into where department_id = p_from;
  update guides set department_id = p_into where department_id = p_from;
  -- issued certificates are NOT rewritten: they keep naming the department as it was when they were issued
  delete from application_departments ad where ad.department_id = p_from and exists (select 1 from application_departments t where t.application_id = ad.application_id and t.department_id = p_into);
  update application_departments set department_id = p_into where department_id = p_from;
  update departments set status = 'archived', merged_into_id = p_into where id = p_from;
  return moved;
end $$;

-- "Withdraw consent / delete my account". Records the withdrawal, then removes the person. Hours stay as anonymised totals,
-- certificates are revoked, consent records stay as an anonymous proof trail. (The auth user is removed by the server with the service role.)
create function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k public.consent_kind;
begin
  if me is null then raise exception 'not signed in'; end if;
  for k in select distinct kind from consents where user_id = me loop
    if public.has_consent(me, k) then
      insert into consents (user_id, kind, action, text_version, text_snapshot) values (me, k, 'withdrawn', 'withdrawal-v1', 'Consent withdrawn and account deleted by the volunteer');
    end if;
  end loop;
  update certificates set revoked_at = now() where user_id = me and revoked_at is null;
  delete from public.users where id = me;  -- cascades personal data; hour_logs/consents/certificates keep their rows with user_id = null
end $$;

-- ---------------------------------------------------------------------------- 5. public views (Roll and impact numbers)
create view public.public_roll as
  select vp.first_name || ' ' || left(vp.last_name, 1) || '.' as display_name
  from volunteer_profiles vp
  where vp.roll_opt_in and vp.status = 'active' and public.has_consent(vp.user_id, 'privacy');
create view public.public_stats as
  select (select count(*) from volunteer_profiles where status = 'active')::int as volunteers,
         (select coalesce(sum(hours), 0) from hour_logs where status = 'approved') as hours,
         (select count(distinct state) from volunteer_profiles where status = 'active' and state is not null)::int as states;

-- ---------------------------------------------------------------------------- 6. row-level security
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- users
create policy users_select on public.users for select to authenticated using (id = auth.uid() or public.is_admin());
create policy users_insert on public.users for insert to authenticated with check (id = auth.uid() and role = 'volunteer');
create policy users_update on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- volunteer_profiles (names, state, skills)
create policy vp_select on public.volunteer_profiles for select to authenticated using (user_id = auth.uid() or (public.has_perm('volunteers.list') and public.in_scope(user_id)));
create policy vp_insert on public.volunteer_profiles for insert to authenticated with check (user_id = auth.uid());
create policy vp_update on public.volunteer_profiles for update to authenticated
  using (user_id = auth.uid() or (public.has_perm('volunteers.suspend') and public.in_scope(user_id)))
  with check (user_id = auth.uid() or (public.has_perm('volunteers.suspend') and public.in_scope(user_id)));

-- volunteer_contacts (phone, email, address): only roles with volunteers.contact, inside their scope
create policy vc_select on public.volunteer_contacts for select to authenticated using (user_id = auth.uid() or (public.has_perm('volunteers.contact') and public.in_scope(user_id)));
create policy vc_insert on public.volunteer_contacts for insert to authenticated with check (user_id = auth.uid());
create policy vc_update on public.volunteer_contacts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- volunteer_private (date of birth): only roles with volunteers.dob, inside their scope
create policy vpr_select on public.volunteer_private for select to authenticated using (user_id = auth.uid() or (public.has_perm('volunteers.dob') and public.in_scope(user_id)));
create policy vpr_insert on public.volunteer_private for insert to authenticated with check (user_id = auth.uid());
create policy vpr_update on public.volunteer_private for update to authenticated
  using (user_id = auth.uid() or (public.has_perm('volunteers.dob') and public.in_scope(user_id)))
  with check (user_id = auth.uid() or (public.has_perm('volunteers.dob') and public.in_scope(user_id)));

-- programmes (public to read; Super Admin edits)
create policy prog_select on public.programmes for select to anon, authenticated using (true);
create policy prog_write on public.programmes for all to authenticated using (public.has_perm('settings.edit')) with check (public.has_perm('settings.edit'));
create policy vprog_select on public.volunteer_programmes for select to authenticated using (user_id = auth.uid() or (public.has_perm('volunteers.list') and public.in_scope(user_id)));
create policy vprog_write on public.volunteer_programmes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- departments (the application form and filters show only active ones)
create policy dept_select on public.departments for select to anon, authenticated using (status = 'active' or public.is_admin());
create policy dept_write on public.departments for all to authenticated using (public.has_perm('departments.manage')) with check (public.has_perm('departments.manage'));
create policy dm_select on public.department_memberships for select to authenticated using (
  user_id = auth.uid() or (public.has_perm('departments.assign') and (public.in_scope(user_id)
    or exists (select 1 from admin_roles ar where ar.user_id = auth.uid() and ar.role = 'department_lead' and ar.department_id = department_memberships.department_id))));
create policy dm_insert on public.department_memberships for insert to authenticated with check (user_id = auth.uid() or public.has_perm('departments.assign'));
create policy dm_update on public.department_memberships for update to authenticated
  using (user_id = auth.uid() or (public.has_perm('departments.assign') and (public.in_scope(user_id)
    or exists (select 1 from admin_roles ar where ar.user_id = auth.uid() and ar.role = 'department_lead' and ar.department_id = department_memberships.department_id))));

-- admin_roles / permissions
create policy ar_select on public.admin_roles for select to authenticated using (user_id = auth.uid() or public.has_perm('admins.manage'));
create policy ar_write on public.admin_roles for all to authenticated using (public.has_perm('admins.manage')) with check (public.has_perm('admins.manage'));
create policy rp_select on public.role_permissions for select to authenticated using (true);

-- applications
create policy app_select on public.applications for select to authenticated using (user_id = auth.uid() or (public.has_perm('applications.decide') and public.in_scope(user_id)));
create policy app_insert on public.applications for insert to authenticated with check (user_id = auth.uid());
create policy app_update on public.applications for update to authenticated
  using (user_id = auth.uid() or (public.has_perm('applications.decide') and public.in_scope(user_id)))
  with check (user_id = auth.uid() or (public.has_perm('applications.decide') and public.in_scope(user_id)));
create policy appd_select on public.application_departments for select to authenticated using (exists (select 1 from applications a where a.id = application_id and (a.user_id = auth.uid() or (public.has_perm('applications.decide') and public.in_scope(a.user_id)))));
create policy appd_insert on public.application_departments for insert to authenticated with check (exists (select 1 from applications a where a.id = application_id and a.user_id = auth.uid()));
create policy appd_update on public.application_departments for update to authenticated using (exists (select 1 from applications a where a.id = application_id and public.has_perm('applications.decide') and public.in_scope(a.user_id)));

-- consents: append-only; the owner and the reviewers of that applicant can read
create policy consents_select on public.consents for select to authenticated using (user_id = auth.uid() or (public.has_perm('applications.decide') and user_id is not null and public.in_scope(user_id)));
create policy consents_insert on public.consents for insert to authenticated with check (user_id = auth.uid());

-- guardian requests and consents: the guardian is not logged in and goes through the functions above
create policy gr_select on public.guardian_requests for select to authenticated using (user_id = auth.uid());
create policy gr_insert on public.guardian_requests for insert to authenticated with check (user_id = auth.uid() and decision = 'pending');
create policy gc_select on public.guardian_consents for select to authenticated using (user_id = auth.uid() or (public.has_perm('volunteers.dob') and public.in_scope(user_id)));

-- opportunities: public board shows published ones; admins edit inside their scope
create policy opp_select on public.opportunities for select to anon, authenticated using (published or (public.has_perm('opportunities.edit') and public.opp_in_scope(state, programme_id, department_id)));
create policy opp_insert on public.opportunities for insert to authenticated with check (public.has_perm('opportunities.edit') and public.opp_in_scope(state, programme_id, department_id));
create policy opp_update on public.opportunities for update to authenticated using (public.has_perm('opportunities.edit') and public.opp_in_scope(state, programme_id, department_id)) with check (public.has_perm('opportunities.edit') and public.opp_in_scope(state, programme_id, department_id));
create policy opps_select on public.opportunity_secrets for select to authenticated using (public.has_perm('attendance.take') and public.opp_scope(opportunity_id));

-- signups
create policy su_select on public.signups for select to authenticated using (user_id = auth.uid() or (public.has_perm('attendance.take') and public.opp_scope(opportunity_id)));
create policy su_insert on public.signups for insert to authenticated with check (user_id = auth.uid() or (public.has_perm('opportunities.edit') and public.opp_scope(opportunity_id)));
create policy su_update on public.signups for update to authenticated using (user_id = auth.uid() or (public.has_perm('opportunities.edit') and public.opp_scope(opportunity_id)));

-- attendance: volunteers read their own; coordinators mark it; QR goes through check_in / check_out
create policy att_select on public.attendance for select to authenticated using (user_id = auth.uid() or (public.has_perm('attendance.take') and public.opp_scope(opportunity_id)));
create policy att_insert on public.attendance for insert to authenticated with check (public.has_perm('attendance.take') and public.opp_scope(opportunity_id) and method = 'coordinator');
create policy att_update on public.attendance for update to authenticated using (public.has_perm('attendance.take') and public.opp_scope(opportunity_id));

-- hour_logs
create policy hl_select on public.hour_logs for select to authenticated using (
  user_id = auth.uid() or (user_id is not null and (public.has_perm('hours.approve') or public.has_perm('reports.see')) and public.in_scope(user_id)));
create policy hl_insert on public.hour_logs for insert to authenticated with check (
  (user_id = auth.uid() and method = 'remote_log' and status = 'pending')
  or (public.has_perm('attendance.take') and user_id is not null and public.in_scope(user_id)));
create policy hl_update on public.hour_logs for update to authenticated
  using ((user_id = auth.uid() and status = 'pending') or (user_id is not null and public.has_perm('hours.approve') and public.in_scope(user_id)))
  with check (user_id = auth.uid() or (user_id is not null and public.has_perm('hours.approve') and public.in_scope(user_id)));
create policy hl_delete on public.hour_logs for delete to authenticated using (user_id = auth.uid() and status = 'pending');

-- trainings and certificates
create policy tr_select on public.trainings for select to authenticated using (true);
create policy tr_write on public.trainings for all to authenticated using (public.has_perm('trainings.manage')) with check (public.has_perm('trainings.manage'));
create policy tcmp_select on public.training_completions for select to authenticated using (user_id = auth.uid() or (public.has_perm('trainings.manage') and public.in_scope(user_id)));
create policy tcmp_write on public.training_completions for all to authenticated using (public.has_perm('trainings.manage') and public.in_scope(user_id)) with check (public.has_perm('trainings.manage') and public.in_scope(user_id));
create policy cert_select on public.certificates for select to authenticated using ((user_id = auth.uid() and revoked_at is null) or (user_id is not null and (public.has_perm('certificates.issue') or public.has_perm('reports.see')) and public.in_scope(user_id)));
create policy cert_insert on public.certificates for insert to authenticated with check (public.has_perm('certificates.issue') and user_id is not null and public.in_scope(user_id));
create policy cert_update on public.certificates for update to authenticated using (public.has_perm('certificates.issue') and user_id is not null and public.in_scope(user_id));

-- tags
create policy tags_select on public.tags for select to authenticated using (public.has_perm('volunteers.list'));
create policy tags_write on public.tags for all to authenticated using (public.has_perm('volunteers.contact')) with check (public.has_perm('volunteers.contact'));
create policy vt_select on public.volunteer_tags for select to authenticated using (public.has_perm('volunteers.list') and public.in_scope(user_id));
create policy vt_write on public.volunteer_tags for all to authenticated using (public.has_perm('volunteers.contact') and public.in_scope(user_id)) with check (public.has_perm('volunteers.contact') and public.in_scope(user_id));

-- messages, delivery log, templates, settings
create policy msg_select on public.messages for select to authenticated using (
  (kind = 'announcement' and (public.is_admin() or exists (select 1 from volunteer_profiles where user_id = auth.uid() and status = 'active')))
  or public.has_perm('email.bulk'));
create policy msg_insert on public.messages for insert to authenticated with check (public.has_perm('email.bulk') and sent_by = auth.uid());
create policy elog_select on public.email_log for select to authenticated using (public.has_perm('email.bulk'));
create policy etpl_select on public.email_templates for select to authenticated using (public.has_perm('email.bulk'));
create policy etpl_write on public.email_templates for all to authenticated using (public.has_perm('settings.edit')) with check (public.has_perm('settings.edit'));
create policy set_select_public on public.app_settings for select to anon, authenticated using (key in ('min_age', 'review_days'));
create policy set_select_active on public.app_settings for select to authenticated using (key = 'whatsapp_group' and exists (select 1 from volunteer_profiles where user_id = auth.uid() and status = 'active'));
create policy set_select_admin on public.app_settings for select to authenticated using (public.has_perm('settings.edit'));
create policy set_write on public.app_settings for all to authenticated using (public.has_perm('settings.edit')) with check (public.has_perm('settings.edit'));

-- chat
create policy chat_select on public.chat_messages for select to authenticated using (public.chat_can_read(room));
create policy chat_insert on public.chat_messages for insert to authenticated with check (public.chat_can_post(room) and author_id = auth.uid());
create policy chat_update on public.chat_messages for update to authenticated using (public.chat_can_read(room)) with check (public.chat_can_read(room));

-- guides: each guide shows only to its audience, and so does search
create function public.guide_visible(a public.guide_audience, d uuid) returns boolean language sql stable security definer set search_path = public as $$
  select case a
    when 'public' then true
    when 'volunteers' then public.is_admin() or exists (select 1 from volunteer_profiles where user_id = auth.uid() and status = 'active')
    when 'department' then exists (select 1 from department_memberships dm where dm.user_id = auth.uid() and dm.status = 'active' and dm.department_id = d)
                           or coalesce(public.my_admin_role() in ('super_admin', 'programme_manager', 'volunteer_coordinator'), false)
                           or exists (select 1 from admin_roles ar where ar.user_id = auth.uid() and public.is_aal2() and ar.role = 'department_lead' and ar.department_id = d)
    when 'admins' then public.is_admin()
  end
$$;
-- Matrix: Super writes all (incl. About + admin handbook); Coordinator volunteer guides only; Programme Manager volunteer + department guides;
-- Department Lead only their own department's guides.
create function public.guide_writable(a public.guide_audience, d uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.has_perm('guides.write') and case public.my_admin_role()
    when 'super_admin' then true
    when 'volunteer_coordinator' then a = 'volunteers'
    when 'programme_manager' then a in ('volunteers', 'department')
    when 'department_lead' then a = 'department' and exists (select 1 from admin_roles ar where ar.user_id = auth.uid() and ar.department_id = d)
    else false end
$$;
create policy guides_select on public.guides for select to anon, authenticated using ((published and public.guide_visible(audience, department_id)) or public.guide_writable(audience, department_id));
create policy guides_write on public.guides for all to authenticated using (public.guide_writable(audience, department_id)) with check (public.guide_writable(audience, department_id));
create policy gread_select on public.guide_reads for select to authenticated using (user_id = auth.uid());
create policy gread_insert on public.guide_reads for insert to authenticated with check (user_id = auth.uid());
create policy chk_select on public.checklist_progress for select to authenticated using (user_id = auth.uid());
create policy chk_insert on public.checklist_progress for insert to authenticated with check (user_id = auth.uid());

-- audit log: readable by roles with audit.see; written only by the triggers above
create policy audit_select on public.audit_logs for select to authenticated using (public.has_perm('audit.see'));

-- ---------------------------------------------------------------------------- 7. grants (least privilege)
-- Supabase grants broad default privileges to the API roles. Start from nothing, then add exactly what each table needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.programmes, public.departments, public.opportunities, public.guides, public.app_settings, public.public_roll, public.public_stats to anon;
grant select on all tables in schema public to authenticated;
grant insert, update on public.users, public.volunteer_profiles, public.volunteer_contacts, public.volunteer_private, public.applications, public.signups, public.hour_logs,
  public.department_memberships, public.opportunities, public.attendance, public.certificates, public.application_departments, public.training_completions, public.chat_messages to authenticated;
grant insert on public.consents, public.guardian_requests, public.guide_reads, public.checklist_progress, public.messages to authenticated;
grant insert, update, delete on public.programmes, public.departments, public.admin_roles, public.trainings, public.tags, public.volunteer_tags, public.guides, public.email_templates,
  public.app_settings, public.volunteer_programmes to authenticated;
grant delete on public.hour_logs, public.training_completions to authenticated;
-- the audit log and role matrix are read-only through the API (triggers and migrations write them)
revoke insert, update, delete on public.audit_logs, public.role_permissions, public.email_log from authenticated;

-- functions callable from the API
grant execute on function
  public.volunteer_age(uuid), public.is_admin(), public.has_perm(text), public.in_scope(uuid), public.opp_scope(uuid), public.opp_in_scope(text, uuid, uuid), public.my_admin_role(), public.is_aal2(), public.is_api_caller(),
  public.chat_can_read(text), public.chat_can_post(text), public.chat_can_moderate(text), public.guide_visible(public.guide_audience, uuid), public.guide_writable(public.guide_audience, uuid),
  public.has_consent(uuid, public.consent_kind), public.age_years(date), public.min_age(), public.has_verified_guardian(uuid), public.confirmed_count(uuid), public.approved_hours(uuid, date, date),
  public.super_admin_count(), public.qr_window_ok(opportunities), public.audit_event(text, text, text, jsonb), public.new_cert_code()
  to anon, authenticated;
grant execute on function public.check_in(uuid, text), public.check_out(uuid, text), public.merge_departments(uuid, uuid), public.delete_my_account() to authenticated;
grant execute on function public.guardian_request_info(text), public.record_guardian_decision(text, public.guardian_decision), public.verify_certificate(text) to anon, authenticated;
-- audit_event is internal: only triggers (definer) call it. Remove direct access again.
revoke execute on function public.audit_event(text, text, text, jsonb) from anon, authenticated;
