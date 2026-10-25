-- site_images: who may read and change the replacement pictures and clips (Admin > Site images)
alter table public.site_images add constraint site_images_kind_check check (kind in ('photo', 'video'));
alter table public.site_images add constraint site_images_poster_check check ((kind = 'video') = (poster_path is not null));
alter table public.site_images add constraint site_images_bytes_check check (bytes > 0 and bytes <= 20 * 1024 * 1024);
alter table public.site_images enable row level security;

-- everyone sees the public site, so everyone may read which slots were replaced
create policy si_select on public.site_images for select to anon, authenticated using (true);
-- only a role with settings.edit (Super Admin) changes them
create policy si_write on public.site_images for all to authenticated using (public.has_perm('settings.edit')) with check (public.has_perm('settings.edit'));

grant select on public.site_images to anon, authenticated;
grant insert, update, delete on public.site_images to authenticated;

-- every change is audited (rule 4); the slot id is the record id, nothing about who is in the picture
create function public.site_images_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.audit_event('site_images.' || lower(tg_op), 'site_images', coalesce(new.slot_id, old.slot_id), '{}');
  return coalesce(new, old);
end $$;
create trigger audit_site_images after insert or update or delete on public.site_images for each row execute function public.site_images_audit();
