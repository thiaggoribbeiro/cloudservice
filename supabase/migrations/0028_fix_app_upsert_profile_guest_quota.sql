-- app_upsert_profile (added out-of-band by the AvestaID integration, not
-- previously committed here) didn't set storage_quota_bytes, so it used
-- the column's 5GB default -- violating profiles_guest_zero_quota for any
-- role='guest' upsert and silently failing the whole profile write while
-- AvestaID's own app_access grant had already succeeded.
create or replace function public.app_upsert_profile(
  p_user_id uuid, p_email text, p_full_name text, p_role text, p_extra jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public
as $$
declare
  v_quota bigint := case when p_role = 'guest' then 0 else 5368709120 end;
begin
  insert into public.profiles (id, email, display_name, role, must_change_password, storage_quota_bytes)
  values (p_user_id, p_email, p_full_name, p_role::public.user_role, false, v_quota)
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    storage_quota_bytes = case
      when excluded.role = 'guest' then 0
      when profiles.role = 'guest' then 5368709120
      else profiles.storage_quota_bytes
    end;
end;
$$;
