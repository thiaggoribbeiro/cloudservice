-- Repoints 4 people's pre-SSO auth.users ids to their AvestaID-issued ids
-- across every table that stores attribution (ownership, grants, logs).
-- Their `profiles` rows for the old ids were deleted during the SSO
-- cutover, but other tables referencing the old id directly (this schema
-- has no FK from these tables to auth.users) were never repointed, unlike
-- Thiago's own identity (see repoint_thiago_profile_full_cascade /
-- repoint_thiago_owned_content, applied out-of-band, not in this repo).
-- Symptom: blank rows in the folder share list (ShareDialog joins
-- folder_shares -> profiles in JS, silently dropping the name/email for
-- rows with no matching profiles row) and files/folders these 4 people
-- owned pre-cutover becoming invisible under their new AvestaID session.
with mapping(old_id, new_id) as (
  values
    ('650b6ebd-4b44-4611-92ef-cbc9bda2bac7'::uuid, '03845ebf-0ce9-43d1-9ab7-adca72cca898'::uuid), -- Marcela Dias
    ('88f5aa31-46b7-4af4-a566-bedfcf40fafc'::uuid, '877cb4a9-d613-42ff-81e2-c754d043c98b'::uuid), -- Thiago (2nd pre-SSO account)
    ('2bd217ef-4376-423b-806e-f41ff9a8def7'::uuid, 'eeaa8e10-a988-4ccb-886c-7a38900c2264'::uuid), -- Rodrigo Leite
    ('ea0db12b-4c19-404b-bc78-d19f1dacf04c'::uuid, '650d453b-e411-4bc9-b5ad-e5b6b2568b18'::uuid)  -- Marilia Pino
)
update files f set owner_id = m.new_id from mapping m where f.owner_id = m.old_id;

with mapping(old_id, new_id) as (
  values
    ('650b6ebd-4b44-4611-92ef-cbc9bda2bac7'::uuid, '03845ebf-0ce9-43d1-9ab7-adca72cca898'::uuid),
    ('88f5aa31-46b7-4af4-a566-bedfcf40fafc'::uuid, '877cb4a9-d613-42ff-81e2-c754d043c98b'::uuid),
    ('2bd217ef-4376-423b-806e-f41ff9a8def7'::uuid, 'eeaa8e10-a988-4ccb-886c-7a38900c2264'::uuid),
    ('ea0db12b-4c19-404b-bc78-d19f1dacf04c'::uuid, '650d453b-e411-4bc9-b5ad-e5b6b2568b18'::uuid)
)
update folders fo set owner_id = m.new_id from mapping m where fo.owner_id = m.old_id;

with mapping(old_id, new_id) as (
  values
    ('650b6ebd-4b44-4611-92ef-cbc9bda2bac7'::uuid, '03845ebf-0ce9-43d1-9ab7-adca72cca898'::uuid),
    ('88f5aa31-46b7-4af4-a566-bedfcf40fafc'::uuid, '877cb4a9-d613-42ff-81e2-c754d043c98b'::uuid),
    ('2bd217ef-4376-423b-806e-f41ff9a8def7'::uuid, 'eeaa8e10-a988-4ccb-886c-7a38900c2264'::uuid),
    ('ea0db12b-4c19-404b-bc78-d19f1dacf04c'::uuid, '650d453b-e411-4bc9-b5ad-e5b6b2568b18'::uuid)
)
update folder_shares fs set granted_by = m.new_id from mapping m where fs.granted_by = m.old_id;

with mapping(old_id, new_id) as (
  values
    ('650b6ebd-4b44-4611-92ef-cbc9bda2bac7'::uuid, '03845ebf-0ce9-43d1-9ab7-adca72cca898'::uuid),
    ('88f5aa31-46b7-4af4-a566-bedfcf40fafc'::uuid, '877cb4a9-d613-42ff-81e2-c754d043c98b'::uuid),
    ('2bd217ef-4376-423b-806e-f41ff9a8def7'::uuid, 'eeaa8e10-a988-4ccb-886c-7a38900c2264'::uuid),
    ('ea0db12b-4c19-404b-bc78-d19f1dacf04c'::uuid, '650d453b-e411-4bc9-b5ad-e5b6b2568b18'::uuid)
)
update event_logs el set user_id = m.new_id from mapping m where el.user_id = m.old_id;

-- These 4 folder_shares rows are stale duplicates: each person already
-- has a valid share row under their new AvestaID id for the same folder
-- (created during the SSO cutover), which is exactly why a plain repoint
-- UPDATE would violate folder_shares_folder_id_shared_with_user_id_key.
-- Delete the leftover old rows instead of repointing them.
delete from folder_shares
where id in (
  'a0471ee8-36ba-4cc0-be7c-42adb9c0bfba',
  '6c36b32b-b0c8-4669-afae-dab07f4d0fb3',
  'a26b44f8-8d1a-48e1-9f57-a4e8f1909d01',
  'baf911ee-f695-4360-892f-8b655a8d4a5f'
);
