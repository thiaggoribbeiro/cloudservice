create extension if not exists pg_cron;

create or replace function public.purge_old_trash()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.files where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.folders where deleted_at is not null and deleted_at < now() - interval '30 days';
end;
$$;

select cron.schedule('purge-old-trash-daily', '0 3 * * *', $$select public.purge_old_trash()$$);
