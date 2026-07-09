-- ============================================================
-- Log de Eventos: audit trail visible only to admin/manager, covering
-- every non-admin member's actions (login/logout, file/folder CRUD,
-- trash, sharing, favorites, member and repository management).
--
-- Admin actions are never written at all - log_event() silently no-ops
-- when the caller's role is 'admin' - so "exceto administradores" needs
-- no read-time filtering. user_email/user_role are captured at write
-- time so the log survives the member being deleted later.
-- ============================================================

create table public.event_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  user_role public.user_role not null,
  action text not null,
  target_type text not null,
  target_name text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index event_logs_created_at_idx on public.event_logs (created_at desc);

alter table public.event_logs enable row level security;

-- No INSERT policy for authenticated: writes only happen through
-- log_event() (security definer) or the create-member edge function
-- calling log_event() with the caller's own JWT-scoped client, so a
-- client can never forge another user's user_id/action.
create policy "Admin e gestor veem o log de eventos"
on public.event_logs for select
to authenticated
using ( (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager') );

create or replace function public.log_event(
  p_action text,
  p_target_type text,
  p_target_name text default null,
  p_target_id uuid default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role public.user_role;
begin
  select email, role into v_email, v_role from public.profiles where id = (select auth.uid());

  if v_role is null or v_role = 'admin' then
    return;
  end if;

  insert into public.event_logs (user_id, user_email, user_role, action, target_type, target_name, target_id, metadata)
  values ((select auth.uid()), v_email, v_role, p_action, p_target_type, p_target_name, p_target_id, p_metadata);
end;
$$;

grant execute on function public.log_event(text, text, text, uuid, jsonb) to authenticated;
