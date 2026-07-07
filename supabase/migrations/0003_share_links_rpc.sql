-- ============================================================
-- Public share link resolution (SECURITY DEFINER, callable by anon)
-- ============================================================
create or replace function public.resolve_share_link(p_token text)
returns table (
  kind text,
  id uuid,
  name text,
  mime_type text,
  size_bytes bigint,
  storage_path text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_link record;
begin
  select * into v_link
  from public.share_links sl
  where sl.token = p_token
    and (sl.expires_at is null or sl.expires_at > now());

  if not found then
    return;
  end if;

  if v_link.file_id is not null then
    return query
      select 'file'::text, f.id, f.name, f.mime_type, f.size_bytes, f.storage_path
      from public.files f
      where f.id = v_link.file_id and f.deleted_at is null;
  else
    return query
      select 'folder'::text, fo.id, fo.name, null::text, null::bigint, null::text
      from public.folders fo
      where fo.id = v_link.folder_id and fo.deleted_at is null;
  end if;
end;
$$;

grant execute on function public.resolve_share_link(text) to anon, authenticated;

create or replace function public.list_public_folder_files(p_token text)
returns table (
  id uuid,
  name text,
  mime_type text,
  size_bytes bigint,
  storage_path text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_link record;
begin
  select * into v_link
  from public.share_links sl
  where sl.token = p_token
    and sl.folder_id is not null
    and (sl.expires_at is null or sl.expires_at > now());

  if not found then
    return;
  end if;

  return query
    select f.id, f.name, f.mime_type, f.size_bytes, f.storage_path
    from public.files f
    where f.folder_id = v_link.folder_id and f.deleted_at is null;
end;
$$;

grant execute on function public.list_public_folder_files(text) to anon, authenticated;

-- ============================================================
-- Storage access for anon role via a valid public share link.
-- Needed so an unauthenticated visitor's createSignedUrl()/download() call
-- (made with the anon key) passes Storage RLS for exactly the object(s)
-- covered by a non-expired share_links row - either the linked file itself,
-- or a direct child file of a linked folder (matches list_public_folder_files
-- non-recursive scope above).
-- ============================================================
create or replace function public.object_has_valid_public_link(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.share_links sl
    join public.files f on (sl.file_id = f.id) or (sl.folder_id = f.folder_id)
    where f.storage_path = p_object_name
      and f.deleted_at is null
      and (sl.expires_at is null or sl.expires_at > now())
  );
$$;

grant execute on function public.object_has_valid_public_link(text) to anon;

create policy "Download publico via link valido"
on storage.objects for select
to anon
using (
  bucket_id = 'avesta-files'
  and (select public.object_has_valid_public_link(name))
);
