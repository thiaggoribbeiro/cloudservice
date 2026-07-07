-- Postgres' encode() only supports 'base64', 'hex', and 'escape' - there is no
-- 'base64url' encoding. The original default (0001) silently failed every
-- share_links insert with a 400 "unrecognized encoding" error, swallowed by
-- the client because the create-link mutation had no onError handler.
-- Hex is already URL-safe with no padding/character-replacement needed.
alter table public.share_links
  alter column token set default encode(extensions.gen_random_bytes(24), 'hex');
