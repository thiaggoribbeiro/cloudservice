-- The DELETE (soft-delete) / restore UPDATE on folders and files needs a
-- RETURNING under the hood in PostgREST (even with Prefer: return=minimal,
-- used internally to compute Content-Range), so the updated row must satisfy
-- a SELECT policy. The trash SELECT policies were owner-only, which blocked
-- an ancestor-folder owner (or a share collaborator with edit permission)
-- from soft-deleting/restoring a subfolder or file owned by someone else,
-- even though they have edit permission over it via user_can_edit_folder.

drop policy "Ver proprias pastas na lixeira" on public.folders;
create policy "Ver pastas na lixeira com permissao de edicao"
on public.folders for select to authenticated
using (
  deleted_at is not null
  and (
    owner_id = (select auth.uid())
    or user_can_edit_folder(id, (select auth.uid()))
  )
);

drop policy "Ver proprios arquivos na lixeira" on public.files;
create policy "Ver arquivos na lixeira com permissao de edicao"
on public.files for select to authenticated
using (
  deleted_at is not null
  and (
    owner_id = (select auth.uid())
    or (folder_id is not null and user_can_edit_folder(folder_id, (select auth.uid())))
  )
);
