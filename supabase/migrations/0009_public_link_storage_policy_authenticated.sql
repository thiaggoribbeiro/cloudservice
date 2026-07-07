-- A logged-in user who is NOT the owner can still open someone else's public
-- share link (e.g. a teammate who happens to have a session in the same
-- browser). Their request reaches PostgREST/Storage with the `authenticated`
-- role (their JWT), not `anon`, so the anon-only policy from 0003 does not
-- apply to them. Mirror it for `authenticated` using the same validity check.
create policy "Download publico via link valido (autenticado)"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avesta-files'
  and (select public.object_has_valid_public_link(name))
);
