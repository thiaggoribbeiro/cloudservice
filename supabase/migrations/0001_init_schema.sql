-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp" schema extensions;
create extension if not exists "pgcrypto" schema extensions;

-- ============================================================
-- profiles: thin mirror of auth.users for FK-ability + display name + quota
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  storage_quota_bytes bigint not null default 5368709120, -- 5 GiB default quota
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuarios podem ver todos os perfis basicos"
on public.profiles for select
to authenticated
using ( true );

create policy "Usuario so edita o proprio perfil"
on public.profiles for update
to authenticated
using ( (select auth.uid()) = id )
with check ( (select auth.uid()) = id );

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- folders
-- ============================================================
create table public.folders (
  id uuid primary key default extensions.uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Only enforce unique sibling names among active (non-trashed) folders,
-- so a trashed "Relatorios" doesn't block creating a new one with the same name.
create unique index folders_unique_active_name
  on public.folders (owner_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
  where deleted_at is null;

create index folders_owner_id_idx on public.folders (owner_id);
create index folders_parent_id_idx on public.folders (parent_id);
create index folders_deleted_at_idx on public.folders (deleted_at) where deleted_at is not null;

alter table public.folders enable row level security;

-- ============================================================
-- files (metadata only; bytes live in Supabase Storage)
-- ============================================================
create table public.files (
  id uuid primary key default extensions.uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index files_unique_active_name
  on public.files (owner_id, coalesce(folder_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
  where deleted_at is null;

create index files_owner_id_idx on public.files (owner_id);
create index files_folder_id_idx on public.files (folder_id);
create index files_deleted_at_idx on public.files (deleted_at) where deleted_at is not null;

alter table public.files enable row level security;

-- ============================================================
-- folder_shares: user-to-user sharing (recursive to subfolders/files)
-- ============================================================
create type public.share_permission as enum ('view_edit');

create table public.folder_shares (
  id uuid primary key default extensions.uuid_generate_v4(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete cascade,
  permission public.share_permission not null default 'view_edit',
  created_at timestamptz not null default now(),
  unique (folder_id, shared_with_user_id)
);

create index folder_shares_shared_with_idx on public.folder_shares (shared_with_user_id);
create index folder_shares_folder_id_idx on public.folder_shares (folder_id);

alter table public.folder_shares enable row level security;

-- ============================================================
-- share_links: public token-based sharing (file OR folder), no login required
-- ============================================================
create table public.share_links (
  id uuid primary key default extensions.uuid_generate_v4(),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'base64url'),
  file_id uuid references public.files(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (file_id is not null and folder_id is null) or
    (file_id is null and folder_id is not null)
  )
);

create index share_links_token_idx on public.share_links (token);
create index share_links_created_by_idx on public.share_links (created_by);

alter table public.share_links enable row level security;

-- ============================================================
-- Helper functions (SECURITY DEFINER)
-- ============================================================

create or replace function public.user_can_access_folder(p_folder_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive ancestors as (
    select id, owner_id, parent_id
    from public.folders
    where id = p_folder_id

    union all

    select f.id, f.owner_id, f.parent_id
    from public.folders f
    join ancestors a on f.id = a.parent_id
  )
  select exists (
    select 1 from ancestors a
    where a.owner_id = p_user
       or exists (
            select 1 from public.folder_shares fs
            where fs.folder_id = a.id and fs.shared_with_user_id = p_user
          )
  );
$$;

create or replace function public.user_can_edit_folder(p_folder_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive ancestors as (
    select id, owner_id, parent_id
    from public.folders
    where id = p_folder_id

    union all

    select f.id, f.owner_id, f.parent_id
    from public.folders f
    join ancestors a on f.id = a.parent_id
  )
  select exists (
    select 1 from ancestors a
    where a.owner_id = p_user
       or exists (
            select 1 from public.folder_shares fs
            where fs.folder_id = a.id
              and fs.shared_with_user_id = p_user
              and fs.permission = 'view_edit'
          )
  );
$$;

grant execute on function public.user_can_access_folder(uuid, uuid) to authenticated;
grant execute on function public.user_can_edit_folder(uuid, uuid) to authenticated;

-- ============================================================
-- RLS Policies: folders
-- ============================================================
create policy "Ver pastas proprias ou compartilhadas"
on public.folders for select
to authenticated
using (
  deleted_at is null
  and ( (select auth.uid()) = owner_id
        or (select public.user_can_access_folder(id, (select auth.uid()))) )
);

create policy "Ver proprias pastas na lixeira"
on public.folders for select
to authenticated
using ( deleted_at is not null and (select auth.uid()) = owner_id );

create policy "Criar pastas raiz propria ou dentro de pasta com permissao"
on public.folders for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    parent_id is null
    or (select public.user_can_edit_folder(parent_id, (select auth.uid())))
  )
);

create policy "Renomear mover pastas com permissao de edicao"
on public.folders for update
to authenticated
using ( (select public.user_can_edit_folder(id, (select auth.uid()))) )
with check (
  parent_id is null or (select public.user_can_edit_folder(parent_id, (select auth.uid())))
);

create policy "Excluir pastas apenas dono"
on public.folders for delete
to authenticated
using ( owner_id = (select auth.uid()) );

-- ============================================================
-- RLS Policies: files
-- ============================================================
create policy "Ver arquivos proprios ou de pastas compartilhadas"
on public.files for select
to authenticated
using (
  deleted_at is null
  and ( (select auth.uid()) = owner_id
        or (folder_id is not null and (select public.user_can_access_folder(folder_id, (select auth.uid())))) )
);

create policy "Ver proprios arquivos na lixeira"
on public.files for select
to authenticated
using ( deleted_at is not null and (select auth.uid()) = owner_id );

create policy "Criar arquivos raiz propria ou pasta com permissao"
on public.files for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    folder_id is null
    or (select public.user_can_edit_folder(folder_id, (select auth.uid())))
  )
);

create policy "Editar arquivos com permissao"
on public.files for update
to authenticated
using (
  owner_id = (select auth.uid())
  or (folder_id is not null and (select public.user_can_edit_folder(folder_id, (select auth.uid()))))
)
with check (
  folder_id is null or (select public.user_can_edit_folder(folder_id, (select auth.uid())))
);

create policy "Excluir arquivos apenas dono"
on public.files for delete
to authenticated
using ( owner_id = (select auth.uid()) );

-- ============================================================
-- RLS Policies: folder_shares
-- ============================================================
create policy "Ver compartilhamentos relevantes"
on public.folder_shares for select
to authenticated
using (
  granted_by = (select auth.uid())
  or shared_with_user_id = (select auth.uid())
);

create policy "Somente dono da pasta pode compartilhar"
on public.folder_shares for insert
to authenticated
with check (
  granted_by = (select auth.uid())
  and exists (
    select 1 from public.folders f
    where f.id = folder_id and f.owner_id = (select auth.uid()) and f.deleted_at is null
  )
);

create policy "Somente dono da pasta pode revogar compartilhamento"
on public.folder_shares for delete
to authenticated
using (
  exists (
    select 1 from public.folders f
    where f.id = folder_id and f.owner_id = (select auth.uid())
  )
);

-- ============================================================
-- RLS Policies: share_links
-- ============================================================
create policy "Dono ve seus proprios links"
on public.share_links for select
to authenticated
using ( created_by = (select auth.uid()) );

create policy "Dono cria links para seus proprios itens"
on public.share_links for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (file_id is not null and exists (
      select 1 from public.files f where f.id = file_id and f.owner_id = (select auth.uid())
    ))
    or
    (folder_id is not null and exists (
      select 1 from public.folders fo where fo.id = folder_id and fo.owner_id = (select auth.uid())
    ))
  )
);

create policy "Dono revoga seus proprios links"
on public.share_links for delete
to authenticated
using ( created_by = (select auth.uid()) );
