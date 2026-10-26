-- hours given per state, for the public map on the home page. Totals only: no names, and only approved hours (rule 7).
create view public.public_state_hours as
  select vp.state, coalesce(sum(h.hours), 0) as hours
  from hour_logs h
  join volunteer_profiles vp on vp.user_id = h.user_id
  where h.status = 'approved' and vp.state is not null
  group by vp.state;
grant select on public.public_state_hours to anon, authenticated;
