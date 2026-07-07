-- ============================================================
-- Storage bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avesta-files', 'avesta-files', false)
on conflict (id) do nothing;

-- ============================================================
-- Helper functions joining storage.objects -> public.files
-- ============================================================
create or replace function public.user_can_access_storage_object(p_object_name text, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.files f
    where f.storage_path = p_object_name
      and f.deleted_at is null
      and (
        f.owner_id = p_user
        or (f.folder_id is not null and public.user_can_access_folder(f.folder_id, p_user))
      )
  );
$$;

create or replace function public.user_can_edit_storage_object(p_object_name text, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.files f
    where f.storage_path = p_object_name
      and (
        f.owner_id = p_user
        or (f.folder_id is not null and public.user_can_edit_folder(f.folder_id, p_user))
      )
  );
$$;

grant execute on function public.user_can_access_storage_object(text, uuid) to authenticated;
grant execute on function public.user_can_edit_storage_object(text, uuid) to authenticated;

-- ============================================================
-- Storage RLS policies
-- ============================================================
create policy "Download dono ou compartilhado"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avesta-files'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.user_can_access_storage_object(name, (select auth.uid())))
  )
);

create policy "Upload apenas no proprio prefixo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avesta-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Atualizar apenas no proprio prefixo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avesta-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avesta-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Excluir dono ou compartilhado com edicao"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avesta-files'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.user_can_edit_storage_object(name, (select auth.uid())))
  )
);
