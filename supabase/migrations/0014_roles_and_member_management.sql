-- ============================================================
-- Roles: administrador, gestor, usuario, convidado
-- ============================================================
create type public.user_role as enum ('admin', 'manager', 'user', 'guest');

alter table public.profiles
  add column role public.user_role not null default 'user',
  add column must_change_password boolean not null default false;

-- New accounts default to 1.5 GiB (was 5 GiB). Existing rows are untouched -
-- this only changes what new inserts get when no explicit value is passed.
alter table public.profiles
  alter column storage_quota_bytes set default 1610612736;

-- Convidado (guest) accounts never get personal drive space: they only ever
-- touch folders explicitly shared with them, never their own root.
alter table public.profiles
  add constraint profiles_guest_zero_quota
  check (role <> 'guest' or storage_quota_bytes = 0);

-- create-member (Edge Function, service role) passes role/quota/must_change
-- through auth user_metadata at creation time; fold that into the trigger
-- instead of always hardcoding the regular-user defaults.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'user');
  v_quota bigint := case
    when new.raw_user_meta_data ? 'storage_quota_bytes'
      then (new.raw_user_meta_data->>'storage_quota_bytes')::bigint
    when coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'user') = 'guest'
      then 0
    else 1610612736
  end;
begin
  insert into public.profiles (id, email, display_name, role, storage_quota_bytes, must_change_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    v_role,
    v_quota,
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  return new;
end;
$$;

-- ============================================================
-- Storage quota enforcement (previously display-only)
-- ============================================================
create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota bigint;
  v_used bigint;
begin
  select storage_quota_bytes into v_quota from public.profiles where id = new.owner_id;

  select coalesce(sum(size_bytes), 0) into v_used
  from public.files
  where owner_id = new.owner_id and deleted_at is null;

  if v_used + new.size_bytes > v_quota then
    raise exception 'Cota de armazenamento excedida (limite de % bytes)', v_quota
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger enforce_storage_quota_before_insert
before insert on public.files
for each row execute function public.enforce_storage_quota();

-- ============================================================
-- Admin-only: list every folder in the system (for granting a Convidado
-- access to a folder the admin doesn't personally own). Silently returns
-- nothing for non-admin callers rather than raising, since it's used
-- straight from a client-side query.
-- ============================================================
create or replace function public.admin_list_all_folders()
returns table (id uuid, name text, parent_id uuid, owner_id uuid, owner_email text)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.name, f.parent_id, f.owner_id, p.email
  from public.folders f
  join public.profiles p on p.id = f.owner_id
  where f.deleted_at is null
    and exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid()) and me.role = 'admin'
    )
  order by p.email, f.name;
$$;

grant execute on function public.admin_list_all_folders() to authenticated;
