-- Admins and managers can list every repository. They also need to
-- read/manage the repository folders and files that back those rows;
-- otherwise the repository card opens with an inaccessible root folder.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folders'
      AND policyname = 'Admin e gestor veem pastas de repositorios'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor veem pastas de repositorios"
      ON public.folders FOR SELECT
      TO authenticated
      USING (
        repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folders'
      AND policyname = 'Admin e gestor criam pastas em repositorios'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor criam pastas em repositorios"
      ON public.folders FOR INSERT
      TO authenticated
      WITH CHECK (
        owner_id = (SELECT auth.uid())
        AND repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folders'
      AND policyname = 'Admin e gestor editam pastas de repositorios'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor editam pastas de repositorios"
      ON public.folders FOR UPDATE
      TO authenticated
      USING (
        repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
      WITH CHECK (
        repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'files'
      AND policyname = 'Admin e gestor veem arquivos de repositorios'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor veem arquivos de repositorios"
      ON public.files FOR SELECT
      TO authenticated
      USING (
        repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'files'
      AND policyname = 'Admin e gestor criam arquivos em repositorios'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor criam arquivos em repositorios"
      ON public.files FOR INSERT
      TO authenticated
      WITH CHECK (
        owner_id = (SELECT auth.uid())
        AND repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'files'
      AND policyname = 'Admin e gestor editam arquivos de repositorios'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor editam arquivos de repositorios"
      ON public.files FOR UPDATE
      TO authenticated
      USING (
        repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
      WITH CHECK (
        repository_id IS NOT NULL
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;