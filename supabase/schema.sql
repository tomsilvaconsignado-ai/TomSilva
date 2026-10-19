-- ==============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS - FOLHA DA REGIÃO ONLINE (SUPABASE / POSTGRESQL)
-- Para executar: Abra seu projeto no Supabase -> Menu SQL Editor -> Cole este código -> Run
-- ==============================================================================

-- 1. Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (Integrada com Supabase Auth e Categorias de Interesse)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'reader' CHECK (role IN ('admin', 'editor', 'reader')),
  avatar_url TEXT,
  interests TEXT[] DEFAULT ARRAY['Política', 'Cidades'], -- Categorias de interesse para notificações
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
  account_type TEXT DEFAULT 'pf' CHECK (account_type IN ('pf', 'pj')),
  phone TEXT,
  city TEXT,
  state TEXT DEFAULT 'SE',
  cpf TEXT,
  cnpj TEXT,
  company_name TEXT,
  trade_name TEXT,
  legal_representative TEXT,
  representative_cpf TEXT,
  terms_accepted BOOLEAN DEFAULT true,
  terms_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  terms_version TEXT DEFAULT 'v2.1',
  moderation_reason TEXT,
  moderation_at TIMESTAMP WITH TIME ZONE,
  moderated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Funções de verificação de papel com SECURITY DEFINER (evitam recursão infinita no RLS)
-- search_path vazio, só usuários ativos, EXECUTE apenas para authenticated
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'editor') AND status = 'active'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_editor_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_editor_or_admin() TO authenticated, service_role;

-- Habilitar RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Perfis: leitura só do próprio dono e de admins (contêm e-mail, telefone, CPF/CNPJ)
DROP POLICY IF EXISTS "Perfis visíveis publicamente" ON public.profiles;
DROP POLICY IF EXISTS "Usuários veem o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários veem o próprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Usuários podem criar seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários podem criar seus próprios perfis"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados de perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seus próprios dados de perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Administradores gerenciam todos os perfis" ON public.profiles;
CREATE POLICY "Administradores gerenciam todos os perfis"
  ON public.profiles FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Campos privilegiados só podem ser definidos por admin, service_role ou pelo
-- próprio banco (trigger de cadastro / SQL Editor). Para os demais, os valores
-- são preservados silenciosamente (não quebra o upsert do cadastro no app).
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'reader';
    NEW.status := 'active';
    NEW.moderation_reason := NULL;
    NEW.moderation_at := NULL;
    NEW.moderated_by := NULL;
  ELSE
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.moderation_reason := OLD.moderation_reason;
    NEW.moderation_at := OLD.moderation_at;
    NEW.moderated_by := OLD.moderated_by;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 3. Tabela de Categorias de Notícias
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir categorias padrão
INSERT INTO public.categories (id, name, slug) VALUES
  ('cat-1', 'Artigo', 'artigo'),
  ('cat-2', 'Brasil', 'brasil'),
  ('cat-3', 'Cidades', 'cidades'),
  ('cat-4', 'Esporte', 'esporte'),
  ('cat-5', 'Eventos', 'eventos'),
  ('cat-6', 'Polícia', 'policia'),
  ('cat-7', 'Política', 'politica'),
  ('cat-8', 'Vídeos', 'videos'),
  ('cat-9', 'Classificados', 'classificados')
ON CONFLICT (slug) DO NOTHING;

-- 4. Tabela de Notícias (Articles)
CREATE TABLE IF NOT EXISTS public.articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  video_url TEXT,
  is_video BOOLEAN DEFAULT false,
  is_hero BOOLEAN DEFAULT false,
  is_secondary BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  author TEXT DEFAULT 'Redação Folha da Região',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles(created_at DESC);

-- Habilitar RLS para Notícias
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notícias são públicas para leitura" ON public.articles;
CREATE POLICY "Notícias são públicas para leitura"
  ON public.articles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas editores e admins podem inserir/modificar notícias" ON public.articles;
CREATE POLICY "Apenas editores e admins podem inserir/modificar notícias"
  ON public.articles FOR ALL
  TO authenticated
  USING ((SELECT public.is_editor_or_admin()))
  WITH CHECK ((SELECT public.is_editor_or_admin()));

-- 5. Tabela de Publicidade (Ads)
CREATE TABLE IF NOT EXISTS public.ads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  link_url TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'gif')),
  placement TEXT CHECK (placement IN ('header', 'sidebar', 'feed')),
  aspect_ratio TEXT DEFAULT '1 / 1',
  max_width INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anúncios visíveis publicamente" ON public.ads;
CREATE POLICY "Anúncios visíveis publicamente"
  ON public.ads FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Apenas administradores gerenciam anúncios" ON public.ads;
CREATE POLICY "Apenas administradores gerenciam anúncios"
  ON public.ads FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 6. Tabela de Notificações para Usuários Logados
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  article_id TEXT REFERENCES public.articles(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  article_title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuários podem ver suas próprias notificações"
  ON public.notifications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar status de leitura das suas notificações" ON public.notifications;
CREATE POLICY "Usuários podem atualizar status de leitura das suas notificações"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Editores e admins criam notificações" ON public.notifications;
CREATE POLICY "Editores e admins criam notificações"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_editor_or_admin()));

-- 7. ===========================================================================
-- MÓDULO CLASSIFICADOS (TABELAS, RLS E TRIGGERS)
-- ==============================================================================

-- Tabela de Configurações dos Classificados
CREATE TABLE IF NOT EXISTS public.classified_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  require_approval BOOLEAN DEFAULT true,
  default_validity_days INTEGER DEFAULT 30,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.classified_settings (id, require_approval, default_validity_days)
VALUES ('default', true, 30)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.classified_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Configurações de classificados públicas para leitura" ON public.classified_settings;
CREATE POLICY "Configurações de classificados públicas para leitura"
  ON public.classified_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas admins alteram configurações de classificados" ON public.classified_settings;
CREATE POLICY "Apenas admins alteram configurações de classificados"
  ON public.classified_settings FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));


-- Tabela de Categorias de Classificados
CREATE TABLE IF NOT EXISTS public.classified_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('produtos_servicos', 'vagas_emprego', 'procuro_emprego')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classified_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categorias de classificados públicas" ON public.classified_categories;
CREATE POLICY "Categorias de classificados públicas"
  ON public.classified_categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas admins gerenciam categorias de classificados" ON public.classified_categories;
CREATE POLICY "Apenas admins gerenciam categorias de classificados"
  ON public.classified_categories FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Tabela de Classificados (Anúncios)
CREATE TABLE IF NOT EXISTS public.classifieds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL, -- Ex: CL-4019
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('produtos_servicos', 'vagas_emprego', 'procuro_emprego')),
  type TEXT NOT NULL CHECK (type IN ('vendo', 'compro', 'alugo', 'ofereco_servico', 'ofereco_vaga', 'procuro_emprego')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'free', 'negotiable')),
  price NUMERIC(12, 2),
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SE',
  advertiser_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[], -- Máximo 3 imagens
  -- Campos de Emprego
  job_role TEXT,
  job_area TEXT,
  contract_type TEXT,
  workload TEXT,
  experience TEXT,
  requirements TEXT,
  -- Moderação e Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'paused', 'expired')),
  rejection_reason TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classifieds_slug ON public.classifieds(slug);
CREATE INDEX IF NOT EXISTS idx_classifieds_section ON public.classifieds(section);
CREATE INDEX IF NOT EXISTS idx_classifieds_status ON public.classifieds(status);
CREATE INDEX IF NOT EXISTS idx_classifieds_expires_at ON public.classifieds(expires_at);

ALTER TABLE public.classifieds ENABLE ROW LEVEL SECURITY;

-- Regras de Segurança RLS
CREATE INDEX IF NOT EXISTS idx_classifieds_user_id ON public.classifieds(user_id);

DROP POLICY IF EXISTS "Anúncios publicados e não expirados são visíveis publicamente" ON public.classifieds;
CREATE POLICY "Anúncios publicados e não expirados são visíveis publicamente"
  ON public.classifieds FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND expires_at > now());

DROP POLICY IF EXISTS "Donos e equipe veem todos os anúncios" ON public.classifieds;
CREATE POLICY "Donos e equipe veem todos os anúncios"
  ON public.classifieds FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_editor_or_admin()));

DROP POLICY IF EXISTS "Usuários autenticados podem publicar anúncios" ON public.classifieds;
CREATE POLICY "Usuários autenticados podem publicar anúncios"
  ON public.classifieds FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Usuários podem editar seus próprios anúncios" ON public.classifieds;
CREATE POLICY "Usuários podem editar seus próprios anúncios"
  ON public.classifieds FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Usuários podem excluir seus próprios anúncios" ON public.classifieds;
CREATE POLICY "Usuários podem excluir seus próprios anúncios"
  ON public.classifieds FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

-- Moderação: dono comum não pode se autoaprovar, mexer em views/rejeição
-- nem transferir o anúncio. Admin e service_role passam direto.
CREATE OR REPLACE FUNCTION public.protect_classified_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  approval_required BOOLEAN;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(s.require_approval, true) INTO approval_required
  FROM public.classified_settings s WHERE s.id = 'default';
  approval_required := COALESCE(approval_required, true);

  IF TG_OP = 'INSERT' THEN
    NEW.views_count := 0;
    NEW.rejection_reason := NULL;
    IF NEW.status IS DISTINCT FROM 'pending' AND (approval_required OR NEW.status <> 'published') THEN
      NEW.status := 'pending';
    END IF;
  ELSE
    NEW.id := OLD.id;
    NEW.code := OLD.code;
    NEW.user_id := OLD.user_id;
    NEW.views_count := OLD.views_count;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.created_at := OLD.created_at;
    -- Dono pode: pausar o que está no ar, reativar o que pausou, reenviar para
    -- análise. Publicar direto só quando a aprovação está desligada.
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
         NEW.status = 'pending'
         OR (NEW.status = 'paused' AND OLD.status = 'published')
         OR (NEW.status = 'published' AND OLD.status = 'paused')
         OR (NEW.status = 'published' AND NOT approval_required AND OLD.status IN ('pending', 'expired'))
       ) THEN
      NEW.status := CASE WHEN NEW.status = 'published' THEN 'pending' ELSE OLD.status END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_classified_moderation_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_classified_moderation_fields ON public.classifieds;
CREATE TRIGGER protect_classified_moderation_fields
  BEFORE INSERT OR UPDATE ON public.classifieds
  FOR EACH ROW EXECUTE FUNCTION public.protect_classified_moderation_fields();

-- Tabela de Denúncias de Classificados
CREATE TABLE IF NOT EXISTS public.classified_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  classified_id TEXT REFERENCES public.classifieds(id) ON DELETE CASCADE NOT NULL,
  classified_title TEXT NOT NULL,
  reporter_name TEXT,
  reporter_email TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('fraude', 'produto_proibido', 'dados_falsos', 'conteudo_ofensivo', 'outro')),
  details TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classified_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer visitante pode enviar denúncia" ON public.classified_reports;
CREATE POLICY "Qualquer visitante pode enviar denúncia"
  ON public.classified_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Apenas administradores visualizam e moderam denúncias" ON public.classified_reports;
CREATE POLICY "Apenas administradores visualizam e moderam denúncias"
  ON public.classified_reports FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 8. Tabela de Comentários
CREATE TABLE IF NOT EXISTS public.comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  article_id TEXT REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comentários visíveis publicamente" ON public.comments;
CREATE POLICY "Comentários visíveis publicamente"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem comentar" ON public.comments;
CREATE POLICY "Usuários autenticados podem comentar"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Autores e equipe removem comentários" ON public.comments;
CREATE POLICY "Autores e equipe removem comentários"
  ON public.comments FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_editor_or_admin()));

-- 9. Tabela de Assinantes da Newsletter
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer pessoa pode se inscrever na newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Qualquer pessoa pode se inscrever na newsletter"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Administradores veem assinantes" ON public.newsletter_subscribers;
CREATE POLICY "Administradores veem assinantes"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 10. Funções RPC
CREATE OR REPLACE FUNCTION public.increment_article_views(article_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.articles
  SET views_count = views_count + 1
  WHERE id = article_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_classified_views(classified_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.classifieds
  SET views_count = views_count + 1
  WHERE id = classified_id AND status = 'published';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_article_views(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_classified_views(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_article_views(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_classified_views(TEXT) TO anon, authenticated, service_role;


-- 11. Trigger automático para criar Perfil quando novo usuário se cadastrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parsed_interests TEXT[];
BEGIN
  -- Trata array de interesses de forma segura sem erro de cast
  BEGIN
    IF new.raw_user_meta_data->'interests' IS NOT NULL AND jsonb_typeof(new.raw_user_meta_data->'interests') = 'array' THEN
      SELECT COALESCE(ARRAY_AGG(x), ARRAY['Política', 'Cidades'])
      INTO parsed_interests
      FROM jsonb_array_elements_text(new.raw_user_meta_data->'interests') AS x;
    ELSE
      parsed_interests := ARRAY['Política', 'Cidades'];
    END IF;
  EXCEPTION WHEN OTHERS THEN
    parsed_interests := ARRAY['Política', 'Cidades'];
  END;

  INSERT INTO public.profiles (
    id, email, full_name, role, avatar_url, interests, account_type, phone, city, state,
    cpf, cnpj, company_name, trade_name, legal_representative, representative_cpf,
    terms_accepted, terms_accepted_at, terms_version, status
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'reader',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/initials/svg?seed=' || new.email),
    COALESCE(parsed_interests, ARRAY['Política', 'Cidades']),
    CASE WHEN new.raw_user_meta_data->>'account_type' = 'pj' THEN 'pj' ELSE 'pf' END,
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'city', 'Estância'),
    COALESCE(new.raw_user_meta_data->>'state', 'SE'),
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'cnpj',
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'trade_name',
    new.raw_user_meta_data->>'legal_representative',
    new.raw_user_meta_data->>'representative_cpf',
    COALESCE(new.raw_user_meta_data->>'terms_accepted' = 'true', true),
    timezone('utc'::text, now()),
    COALESCE(new.raw_user_meta_data->>'terms_version', 'v2.1'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

