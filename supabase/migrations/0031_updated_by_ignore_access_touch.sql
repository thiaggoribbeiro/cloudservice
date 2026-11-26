-- ============================================================
-- Opening or downloading a file writes files.last_accessed_at (it powers
-- "Página inicial"). set_updated_by() stamped updated_at/updated_by on
-- EVERY update, so merely viewing a file made the viewer show up as the
-- person who last modified it - and, through get_folders_last_modified,
-- as the last modifier of every folder above it.
--
-- Now an UPDATE that changes nothing but last_accessed_at keeps the
-- previous stamp. Any real change (rename, move, content, lock, trash...)
-- still stamps as before. Shared by files and folders; folders simply
-- have no last_accessed_at column, so the comparison is a no-op there.
-- ============================================================

create or replace function public.set_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
     and (to_jsonb(NEW) - 'last_accessed_at' - 'updated_at' - 'updated_by')
       = (to_jsonb(OLD) - 'last_accessed_at' - 'updated_at' - 'updated_by') then
    NEW.updated_at := OLD.updated_at;
    NEW.updated_by := OLD.updated_by;
    return NEW;
  end if;

  NEW.updated_at := now();
  NEW.updated_by := (select auth.uid());
  return NEW;
end;
$$;

-- ------------------------------------------------------------
-- One-off repair: files whose current stamp came from an open/download
-- (stamp == last_accessed_at, and later than the upload) go back to
-- their last REAL change recorded in event_logs (upload, move, rename).
-- The stamping trigger is paused for this statement only, otherwise it
-- would overwrite the restored values. Measured on 2026-11-26: 63 files,
-- all with a matching event; none ends up newer than its current stamp.
-- ------------------------------------------------------------
begin;

alter table public.files disable trigger files_set_updated_by;

with affected as (
  select f.id from public.files f
  where f.deleted_at is null
    and f.last_accessed_at is not null
    and abs(extract(epoch from f.updated_at - f.created_at)) >= 2
    and abs(extract(epoch from f.updated_at - f.last_accessed_at)) < 2
), real_change as (
  select distinct on (e.target_id) e.target_id, e.created_at, e.user_id
  from public.event_logs e
  where e.target_type = 'arquivo'
    and e.action in ('upload_arquivo', 'mover_arquivo', 'renomear_arquivo')
  order by e.target_id, e.created_at desc
)
update public.files f
set updated_at = rc.created_at,
    updated_by = rc.user_id
from affected a
join real_change rc on rc.target_id = a.id
where f.id = a.id;

alter table public.files enable trigger files_set_updated_by;

commit;
