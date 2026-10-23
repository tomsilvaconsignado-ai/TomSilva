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
