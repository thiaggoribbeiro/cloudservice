-- ============================================================
-- favorites: personal bookmark of a file or folder (per user)
-- ============================================================
create table public.favorites (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid references public.files(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (file_id is not null and folder_id is null) or
    (file_id is null and folder_id is not null)
  )
);

create unique index favorites_unique_file on public.favorites (user_id, file_id) where file_id is not null;
create unique index favorites_unique_folder on public.favorites (user_id, folder_id) where folder_id is not null;
create index favorites_user_id_idx on public.favorites (user_id);

alter table public.favorites enable row level security;

create policy "Usuario ve seus proprios favoritos"
on public.favorites for select
to authenticated
using ( user_id = (select auth.uid()) );

create policy "Usuario favorita itens que pode acessar"
on public.favorites for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (file_id is not null and exists (
      select 1 from public.files f
      where f.id = file_id and f.deleted_at is null
        and (f.owner_id = (select auth.uid())
             or (f.folder_id is not null and public.user_can_access_folder(f.folder_id, (select auth.uid()))))
    ))
    or
    (folder_id is not null and exists (
      select 1 from public.folders fo
      where fo.id = folder_id and fo.deleted_at is null
        and (fo.owner_id = (select auth.uid()) or public.user_can_access_folder(fo.id, (select auth.uid())))
    ))
  )
);

create policy "Usuario remove seus proprios favoritos"
on public.favorites for delete
to authenticated
using ( user_id = (select auth.uid()) );

-- ============================================================
-- last_accessed_at: powers "Pagina Inicial" (recently accessed files)
-- ============================================================
alter table public.files add column last_accessed_at timestamptz not null default now();
create index files_last_accessed_at_idx on public.files (owner_id, last_accessed_at desc);

-- ============================================================
-- Trash lock: a user can only permanently delete a folder/file
-- (hard DELETE) once it has been in the trash for 30+ days. The
-- pg_cron purge job runs as the table owner and is not subject to
-- RLS, so automatic purging after 30 days is unaffected.
-- ============================================================
drop policy "Excluir pastas apenas dono" on public.folders;
create policy "Excluir pastas apenas dono apos 30 dias na lixeira"
on public.folders for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and deleted_at is not null
  and deleted_at < now() - interval '30 days'
);

drop policy "Excluir arquivos apenas dono" on public.files;
create policy "Excluir arquivos apenas dono apos 30 dias na lixeira"
on public.files for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and deleted_at is not null
  and deleted_at < now() - interval '30 days'
);
