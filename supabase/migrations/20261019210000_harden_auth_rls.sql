-- ==============================================================================
-- MIGRAÇÃO: Endurecimento de segurança (Auth + RLS) - Folha da Região Online
-- Para executar: Supabase -> SQL Editor -> cole este arquivo inteiro -> Run
-- Idempotente: pode ser executada mais de uma vez sem efeitos colaterais.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Funções auxiliares de papel (SECURITY DEFINER para evitar recursão no RLS)
--    - search_path vazio + nomes qualificados
--    - só contam usuários com status 'active'
--    - EXECUTE apenas para authenticated (anon nunca precisa delas)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. PROFILES
--    - Leitura: apenas o próprio dono e administradores (antes: pública, expunha
--      e-mail, telefone, CPF/CNPJ, papel e status de todos os usuários)
--    - Atualização: USING + WITH CHECK
--    - Trigger impede que não-admins alterem role/status/e-mail/moderação
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. Cadastro: role/status NUNCA vêm de raw_user_meta_data (editável pelo
--    usuário no signUp). Antes, signUp com data.role = 'admin' criava um admin.
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. ARTICLES / ADS: troca auth.role() (deprecated) por TO authenticated
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. NOTIFICATIONS
--    - UPDATE com WITH CHECK
--    - INSERT para editores/admins (o app cria notificações ao publicar notícia;
--      antes não havia policy e os inserts falhavam silenciosamente)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. CLASSIFICADOS
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. COMENTÁRIOS: comentário precisa ser do próprio usuário logado
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 8. NEWSLETTER: inscrição pública; leitura só admin
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 9. RPCs de visualização: search_path fixo e grants explícitos
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 10. Limpeza: policies duplicadas encontradas no banco de produção que não
--     existem no schema.sql (policies permissivas somam com OR, então qualquer
--     sobra antiga reabriria o acesso que as regras acima fecham)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Apenas editores e admins podem gerenciar notícias" ON public.articles;
DROP POLICY IF EXISTS "Apenas admins moderam denúncias" ON public.classified_reports;
DROP POLICY IF EXISTS "Apenas administradores alteram configurações de classificados" ON public.classified_settings;
DROP POLICY IF EXISTS "Configurações de classificados públicas" ON public.classified_settings;
DROP POLICY IF EXISTS "Anúncios publicados visíveis publicamente" ON public.classifieds;
DROP POLICY IF EXISTS "Usuários gerenciam seus comentários ou administradores" ON public.comments;
DROP POLICY IF EXISTS "Apenas administradores visualizam assinantes" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Usuários podem atualizar leitura das suas notificações" ON public.notifications;

-- Usuário pode criar notificação para si mesmo (comportamento já existente em produção)
DROP POLICY IF EXISTS "Criadores e admins podem inserir notificações" ON public.notifications;
CREATE POLICY "Criadores e admins podem inserir notificações"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_editor_or_admin()));

DROP POLICY IF EXISTS "Categorias públicas para leitura" ON public.categories;
CREATE POLICY "Categorias públicas para leitura"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas administradores gerenciam categorias" ON public.categories;
CREATE POLICY "Apenas administradores gerenciam categorias"
  ON public.categories FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

COMMIT;
