-- ==============================================================================
-- MÍDIA IMPRESSA: edições mensais do jornal em PDF
--
-- 1. Tabela print_editions: ano do jornal (exibido em algarismos romanos), número
--    da edição, mês/ano de circulação, manchete principal e caminho do PDF.
--    Os dados das edições publicadas são públicos (o visitante vê o que existe e
--    é convidado a se cadastrar); rascunhos só a equipe vê.
-- 2. Bucket PRIVADO "print-editions": o PDF só abre por link temporário (assinado),
--    e só para quem tem conta ativa no portal. A equipe (editor/admin) envia e remove.
--
-- Pode ser executado mais de uma vez.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.print_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_year INTEGER NOT NULL CHECK (volume_year BETWEEN 1 AND 3999),
  edition_number INTEGER NOT NULL CHECK (edition_number > 0),
  edition_month SMALLINT NOT NULL CHECK (edition_month BETWEEN 1 AND 12),
  edition_year SMALLINT NOT NULL CHECK (edition_year BETWEEN 1900 AND 2200),
  headline TEXT NOT NULL CHECK (char_length(btrim(headline)) BETWEEN 3 AND 300),
  pdf_path TEXT NOT NULL,
  file_size BIGINT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT print_editions_edition_number_key UNIQUE (edition_number)
);

CREATE INDEX IF NOT EXISTS print_editions_pdf_path_idx ON public.print_editions (pdf_path);

ALTER TABLE public.print_editions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.print_editions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.print_editions TO authenticated;

DROP POLICY IF EXISTS "Edições impressas publicadas são públicas" ON public.print_editions;
CREATE POLICY "Edições impressas publicadas são públicas"
  ON public.print_editions FOR SELECT
  TO anon
  USING (published);

DROP POLICY IF EXISTS "Leitores veem publicadas e equipe vê todas as edições" ON public.print_editions;
CREATE POLICY "Leitores veem publicadas e equipe vê todas as edições"
  ON public.print_editions FOR SELECT
  TO authenticated
  USING (published OR (SELECT public.is_editor_or_admin()));

DROP POLICY IF EXISTS "Equipe cadastra edições impressas" ON public.print_editions;
CREATE POLICY "Equipe cadastra edições impressas"
  ON public.print_editions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_editor_or_admin()));

DROP POLICY IF EXISTS "Equipe edita edições impressas" ON public.print_editions;
CREATE POLICY "Equipe edita edições impressas"
  ON public.print_editions FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_editor_or_admin()))
  WITH CHECK ((SELECT public.is_editor_or_admin()));

DROP POLICY IF EXISTS "Equipe exclui edições impressas" ON public.print_editions;
CREATE POLICY "Equipe exclui edições impressas"
  ON public.print_editions FOR DELETE
  TO authenticated
  USING ((SELECT public.is_editor_or_admin()));

-- ------------------------------------------------------------------------------
-- STORAGE: bucket privado "print-editions" (somente PDF, até 50 MB)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('print-editions', 'print-editions', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura (gera o link temporário): equipe sempre; leitor com conta ativa só o PDF
-- de uma edição publicada
DROP POLICY IF EXISTS "Leitores cadastrados abrem a mídia impressa" ON storage.objects;
CREATE POLICY "Leitores cadastrados abrem a mídia impressa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'print-editions'
    AND (
      (SELECT public.is_editor_or_admin())
      OR (
        (SELECT public.is_active_user())
        AND EXISTS (
          SELECT 1 FROM public.print_editions e
          WHERE e.pdf_path = storage.objects.name AND e.published
        )
      )
    )
  );

DROP POLICY IF EXISTS "Equipe envia a mídia impressa" ON storage.objects;
CREATE POLICY "Equipe envia a mídia impressa"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'print-editions'
    AND (SELECT public.is_editor_or_admin())
  );

DROP POLICY IF EXISTS "Equipe remove a mídia impressa" ON storage.objects;
CREATE POLICY "Equipe remove a mídia impressa"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'print-editions'
    AND (SELECT public.is_editor_or_admin())
  );
