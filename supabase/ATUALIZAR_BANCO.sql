-- ==============================================================================
-- ATUALIZAÇÃO DO BANCO - Folha da Região Online
--
-- Reúne, na ordem certa, as migrações que ainda não foram aplicadas no Supabase:
--   supabase/migrations/20261020000000_classifieds_active_user_rls.sql
--   supabase/migrations/20261024000000_supabase_source_of_truth.sql
--   supabase/migrations/20261025000000_ads_sidebar_300x300_extra.sql
--
-- Como usar: Supabase -> SQL Editor -> New query -> cole este arquivo inteiro -> Run.
-- Roda numa única transação: se algo falhar, nada é alterado. Pode ser executado
-- mais de uma vez sem duplicar nada.
-- ==============================================================================

BEGIN;

-- >>>>>>>>>> 20261020000000_classifieds_active_user_rls.sql

-- ==============================================================================
-- MIGRAÇÃO: Acesso e Publicação de Classificados para Usuários com Conta Ativa
--
-- Regras aplicadas:
-- 1. Não exigir confirmação de e-mail para publicar anúncios.
-- 2. Não exigir token ou etapa adicional de validação.
-- 3. Cadastro obrigatório: usuário precisa ter conta cadastrada (perfil existente).
-- 4. Conta ativa e login: qualquer usuário autenticado com status 'active' pode publicar.
-- 5. Bloqueio: visitantes anônimos e contas inativas, suspensas ou bloqueadas NÃO publicam.
-- ==============================================================================

-- 1. Função auxiliar para verificar se o usuário autenticado atual possui conta ativa
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;

-- 2. Atualização das Políticas de RLS em public.classifieds

-- INSERT: Apenas usuários autenticados com conta ativa podem publicar anúncios
DROP POLICY IF EXISTS "Usuários autenticados podem publicar anúncios" ON public.classifieds;
DROP POLICY IF EXISTS "Usuários autenticados com conta ativa podem publicar anúncios" ON public.classifieds;
CREATE POLICY "Usuários autenticados com conta ativa podem publicar anúncios"
  ON public.classifieds FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (SELECT public.is_active_user())
  );

-- UPDATE: Usuário dono com conta ativa ou administradores podem editar
DROP POLICY IF EXISTS "Usuários podem editar seus próprios anúncios" ON public.classifieds;
DROP POLICY IF EXISTS "Usuários ativos ou admins podem editar seus próprios anúncios" ON public.classifieds;
CREATE POLICY "Usuários ativos ou admins podem editar seus próprios anúncios"
  ON public.classifieds FOR UPDATE
  TO authenticated
  USING (
    ((SELECT auth.uid()) = user_id AND (SELECT public.is_active_user()))
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id AND (SELECT public.is_active_user()))
    OR (SELECT public.is_admin())
  );

-- DELETE: Usuário dono com conta ativa ou administradores podem excluir
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios anúncios" ON public.classifieds;
DROP POLICY IF EXISTS "Usuários ativos ou admins podem excluir seus próprios anúncios" ON public.classifieds;
CREATE POLICY "Usuários ativos ou admins podem excluir seus próprios anúncios"
  ON public.classifieds FOR DELETE
  TO authenticated
  USING (
    ((SELECT auth.uid()) = user_id AND (SELECT public.is_active_user()))
    OR (SELECT public.is_admin())
  );

-- >>>>>>>>>> 20261024000000_supabase_source_of_truth.sql

-- ==============================================================================
-- MIGRAÇÃO: Supabase como fonte única dos dados - Folha da Região Online
-- Para executar: Supabase -> SQL Editor -> cole este arquivo inteiro -> Run
-- Idempotente: pode ser executada mais de uma vez sem efeitos colaterais.
--
-- Até aqui o app gravava notícias, anúncios, configurações, comentários e
-- denúncias apenas no localStorage do navegador de quem editou (e as tabelas
-- não tinham as colunas que o app envia). Esta migração:
--   1. Alinha as tabelas com o que o app grava (articles.status, colunas de ads)
--   2. Cria site_settings (configurações do portal e dos espaços publicitários)
--   3. Cria user_audit_logs (auditoria de moderação)
--   4. Cria RPCs administrativas que substituem as rotas /api do servidor Express
--      (que não existe no GitHub Pages)
--   5. Gera notificações de novas matérias no próprio banco
--   6. Cria o bucket de mídia "media" no Storage (imagens deixam de ir em base64)
--   7. Popula as categorias padrão dos classificados
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. PROFILES: status 'inactive' já é usado pelo app
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'suspended', 'blocked', 'inactive'));

-- ------------------------------------------------------------------------------
-- 2. ARTICLES: coluna status (rascunho/publicado) e leitura pública só do publicado
-- ------------------------------------------------------------------------------
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles
  ADD CONSTRAINT articles_status_check CHECK (status IN ('published', 'draft'));
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);

DROP POLICY IF EXISTS "Notícias são públicas para leitura" ON public.articles;
DROP POLICY IF EXISTS "Notícias publicadas são públicas" ON public.articles;
CREATE POLICY "Notícias publicadas são públicas"
  ON public.articles FOR SELECT
  TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "Equipe vê rascunhos e publicadas" ON public.articles;
CREATE POLICY "Equipe vê rascunhos e publicadas"
  ON public.articles FOR SELECT
  TO authenticated
  USING (status = 'published' OR (SELECT public.is_editor_or_admin()));

-- ------------------------------------------------------------------------------
-- 3. ADS: colunas usadas pelo painel de publicidade (formato, carrossel, métricas)
-- ------------------------------------------------------------------------------
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ad_format TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS alt_text TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 5;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS open_in_new_tab BOOLEAN DEFAULT true;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS impressions_count INTEGER DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- O app usa mais espaços do que os três originais
ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_placement_check;
ALTER TABLE public.ads
  ADD CONSTRAINT ads_placement_check
  CHECK (placement IN ('header', 'feed', 'sidebar', 'article', 'footer', 'sidebar_300x900', 'sidebar_300x600'));
ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_status_check;
ALTER TABLE public.ads
  ADD CONSTRAINT ads_status_check CHECK (status IN ('active', 'paused', 'ended'));
CREATE INDEX IF NOT EXISTS idx_ads_display_order ON public.ads(display_order);

-- Métricas de impressão/clique (visitantes anônimos não têm UPDATE em ads)
CREATE OR REPLACE FUNCTION public.increment_ad_metric(p_ad_id TEXT, p_metric TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_metric = 'click' THEN
    UPDATE public.ads SET clicks_count = COALESCE(clicks_count, 0) + 1 WHERE id = p_ad_id AND active = true;
  ELSIF p_metric = 'impression' THEN
    UPDATE public.ads SET impressions_count = COALESCE(impressions_count, 0) + 1 WHERE id = p_ad_id AND active = true;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_ad_metric(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_metric(TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. SITE_SETTINGS: configurações do portal e dos espaços publicitários
--    Chaves usadas pelo app: 'portal', 'ads_placement', 'ads_format'
--    Leitura pública (o rodapé/cabeçalho precisam delas); escrita só de admin.
--    A senha SMTP NUNCA é gravada aqui (o app remove antes de enviar).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Configurações do portal são públicas" ON public.site_settings;
CREATE POLICY "Configurações do portal são públicas"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas admins alteram configurações do portal" ON public.site_settings;
CREATE POLICY "Apenas admins alteram configurações do portal"
  ON public.site_settings FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ------------------------------------------------------------------------------
-- 5. USER_AUDIT_LOGS: histórico de moderação feito pelo painel
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  admin_id UUID,
  admin_email TEXT,
  admin_name TEXT,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT NOT NULL DEFAULT '',
  result TEXT DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON public.user_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON public.user_audit_logs(created_at DESC);

ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apenas admins leem auditoria" ON public.user_audit_logs;
CREATE POLICY "Apenas admins leem auditoria"
  ON public.user_audit_logs FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Apenas admins registram auditoria" ON public.user_audit_logs;
CREATE POLICY "Apenas admins registram auditoria"
  ON public.user_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()) AND admin_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 6. RPCs administrativas (substituem /api/admin/users e /api/admin/confirm-email)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  auth_created_at TIMESTAMP WITH TIME ZONE,
  profile JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, u.email_confirmed_at, u.last_sign_in_at, u.created_at, to_jsonb(p.*)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_user_email(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = target_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_confirm_user_email(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_confirm_user_email(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. Notificações de novas matérias geradas no banco
--    (editores não podem ler os perfis dos leitores, então o app não conseguia
--    descobrir quem tinha interesse na categoria)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_readers_of_article()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, article_id, article_slug, article_title, category, image_url, message)
  SELECT p.id, NEW.id, NEW.slug, NEW.title, NEW.category, NEW.image_url,
         'Nova matéria em ' || NEW.category || ': "' || NEW.title || '"'
  FROM public.profiles p
  WHERE p.status = 'active'
    AND EXISTS (
      SELECT 1 FROM unnest(COALESCE(p.interests, ARRAY[]::TEXT[])) AS i(interest)
      WHERE lower(i.interest) = lower(NEW.category)
         OR (lower(i.interest) = 'vídeos' AND NEW.is_video)
    );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_readers_of_article() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_readers_of_article ON public.articles;
CREATE TRIGGER notify_readers_of_article
  AFTER INSERT OR UPDATE OF status ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.notify_readers_of_article();

-- ------------------------------------------------------------------------------
-- 8. STORAGE: bucket público "media"
--    articles/...            -> editores e admins
--    ads/... e portal/...    -> admins
--    classifieds/<uid>/...   -> o próprio usuário com conta ativa
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 'media', true, 52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Equipe envia mídia de notícias" ON storage.objects;
CREATE POLICY "Equipe envia mídia de notícias"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'articles'
    AND (SELECT public.is_editor_or_admin())
  );

DROP POLICY IF EXISTS "Admins enviam mídia de publicidade e do portal" ON storage.objects;
CREATE POLICY "Admins enviam mídia de publicidade e do portal"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] IN ('ads', 'portal')
    AND (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "Usuários ativos enviam fotos dos seus classificados" ON storage.objects;
CREATE POLICY "Usuários ativos enviam fotos dos seus classificados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'classifieds'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (SELECT public.is_active_user())
  );

DROP POLICY IF EXISTS "Donos e admins removem mídia" ON storage.objects;
CREATE POLICY "Donos e admins removem mídia"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND (owner_id = (SELECT auth.uid())::text OR (SELECT public.is_admin()))
  );

-- ------------------------------------------------------------------------------
-- 9. Categorias padrão dos classificados (a tabela estava vazia; o app usava
--    só a lista embutida no código)
-- ------------------------------------------------------------------------------
INSERT INTO public.classified_categories (id, name, section) VALUES
  ('cat-prod-1', 'Veículos e motos', 'produtos_servicos'),
  ('cat-prod-2', 'Imóveis para venda', 'produtos_servicos'),
  ('cat-prod-3', 'Imóveis para aluguel', 'produtos_servicos'),
  ('cat-prod-4', 'Celulares e eletrônicos', 'produtos_servicos'),
  ('cat-prod-5', 'Móveis e eletrodomésticos', 'produtos_servicos'),
  ('cat-prod-6', 'Informática', 'produtos_servicos'),
  ('cat-prod-7', 'Moda e acessórios', 'produtos_servicos'),
  ('cat-prod-8', 'Casa e construção', 'produtos_servicos'),
  ('cat-prod-9', 'Serviços profissionais', 'produtos_servicos'),
  ('cat-prod-10', 'Outros produtos e serviços', 'produtos_servicos'),
  ('cat-vaga-1', 'Administração e escritório', 'vagas_emprego'),
  ('cat-vaga-2', 'Comércio e vendas', 'vagas_emprego'),
  ('cat-vaga-3', 'Saúde', 'vagas_emprego'),
  ('cat-vaga-4', 'Educação', 'vagas_emprego'),
  ('cat-vaga-5', 'Tecnologia', 'vagas_emprego'),
  ('cat-vaga-6', 'Serviços gerais', 'vagas_emprego'),
  ('cat-vaga-7', 'Construção civil', 'vagas_emprego'),
  ('cat-vaga-8', 'Transporte e logística', 'vagas_emprego'),
  ('cat-vaga-9', 'Estágio e jovem aprendiz', 'vagas_emprego'),
  ('cat-vaga-10', 'Trabalho autônomo', 'vagas_emprego'),
  ('cat-vaga-11', 'Outras oportunidades', 'vagas_emprego'),
  ('cat-cand-1', 'Administração e escritório', 'procuro_emprego'),
  ('cat-cand-2', 'Comércio e vendas', 'procuro_emprego'),
  ('cat-cand-3', 'Saúde', 'procuro_emprego'),
  ('cat-cand-4', 'Educação', 'procuro_emprego'),
  ('cat-cand-5', 'Tecnologia', 'procuro_emprego'),
  ('cat-cand-6', 'Serviços gerais', 'procuro_emprego'),
  ('cat-cand-7', 'Construção civil', 'procuro_emprego'),
  ('cat-cand-8', 'Transporte e logística', 'procuro_emprego'),
  ('cat-cand-9', 'Estágio e jovem aprendiz', 'procuro_emprego'),
  ('cat-cand-10', 'Trabalho autônomo', 'procuro_emprego'),
  ('cat-cand-11', 'Outras oportunidades', 'procuro_emprego')
ON CONFLICT (id) DO NOTHING;

-- >>>>>>>>>> 20261025000000_ads_sidebar_300x300_extra.sql

-- ==============================================================================
-- Dois painéis de publicidade 300x300 adicionais na coluna lateral
-- (sidebar_300x300_2 e sidebar_300x300_3), cada um com anúncios próprios.
--
-- Pré-requisito: 20261024000000_supabase_source_of_truth.sql aplicada.
-- Pode ser executado mais de uma vez.
-- ==============================================================================

ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_placement_check;
ALTER TABLE public.ads
  ADD CONSTRAINT ads_placement_check
  CHECK (placement IN (
    'header', 'feed', 'sidebar', 'article', 'footer', 'sidebar_300x900', 'sidebar_300x600',
    'sidebar_300x300_2', 'sidebar_300x300_3'
  ));

COMMIT;
