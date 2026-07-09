-- Admin/gestor podem ver, ao menos, todos os repositorios do sistema (0018/0019),
-- mas a policy de folder_shares ainda exigia ser o dono da pasta para
-- compartilhar/revogar - deixando um admin/gestor sem poder convidar membros
-- para um repositorio criado por outra pessoa. Extende para: admin/gestor
-- podem compartilhar, ver e revogar compartilhamentos de qualquer pasta,
-- igual ja acontece para folders/files em 0019.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folder_shares'
      AND policyname = 'Admin e gestor veem qualquer compartilhamento'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor veem qualquer compartilhamento"
      ON public.folder_shares FOR SELECT
      TO authenticated
      USING (
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folder_shares'
      AND policyname = 'Admin e gestor podem compartilhar qualquer pasta'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor podem compartilhar qualquer pasta"
      ON public.folder_shares FOR INSERT
      TO authenticated
      WITH CHECK (
        granted_by = (SELECT auth.uid())
        AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
        AND EXISTS (
          SELECT 1 FROM public.folders f WHERE f.id = folder_id AND f.deleted_at IS NULL
        )
      )
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folder_shares'
      AND policyname = 'Admin e gestor podem revogar qualquer compartilhamento'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin e gestor podem revogar qualquer compartilhamento"
      ON public.folder_shares FOR DELETE
      TO authenticated
      USING (
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'manager')
      )
    $policy$;
  END IF;
END $$;
