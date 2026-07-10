-- ============================================================
-- Public share links are being retired from the product (per-item
-- "Compartilhar" too - ownership now gates rename/move on the client,
-- and unrestricted ad-hoc sharing worked against that). Revoke the
-- anon-facing surface entirely rather than just hiding the UI, so an
-- old link can no longer resolve anything even if someone still has
-- the URL.
-- ============================================================

drop policy if exists "Download publico via link valido" on storage.objects;
drop policy if exists "Download publico via link valido (autenticado)" on storage.objects;

revoke execute on function public.resolve_share_link(text) from anon, authenticated;
revoke execute on function public.list_public_folder_files(text) from anon, authenticated;
revoke execute on function public.object_has_valid_public_link(text) from anon, authenticated;
