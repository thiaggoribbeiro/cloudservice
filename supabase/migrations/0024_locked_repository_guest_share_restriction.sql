-- Even if a guest owns a locked repository folder, sharing it must stay
-- blocked. Other folder share policies are permissive, so this restrictive
-- policy adds the missing AND condition for direct API calls.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folder_shares'
      AND policyname = 'Convidado nao compartilha pasta travada de repositorio'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Convidado nao compartilha pasta travada de repositorio"
      ON public.folder_shares
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (
        NOT EXISTS (
          SELECT 1
          FROM public.folders f
          WHERE f.id = folder_id
            AND f.repository_id IS NOT NULL
            AND f.is_locked
            AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'guest'
        )
      )
    $policy$;
  END IF;
END $$;