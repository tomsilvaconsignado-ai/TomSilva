-- ==============================================================================
-- Moderação dos classificados pela equipe e validade protegida
--
-- 1. Editores já veem todos os anúncios e têm a aba Classificados no painel, mas o
--    RLS só deixava o dono ou o admin alterar: aprovar, recusar ou pausar não fazia
--    nada e o painel não mostrava erro. Agora a equipe (admin e editor) pode moderar.
-- 2. O trigger de moderação deixa a equipe passar direto (antes só o admin).
-- 3. O anunciante não consegue mais gravar uma validade além do prazo configurado.
--
-- Pré-requisito: 20261020000000_classifieds_active_user_rls.sql aplicada.
-- Pode ser executado mais de uma vez.
-- ==============================================================================

DROP POLICY IF EXISTS "Usuários ativos ou admins podem editar seus próprios anúncios" ON public.classifieds;
DROP POLICY IF EXISTS "Usuários ativos ou equipe podem editar anúncios" ON public.classifieds;
CREATE POLICY "Usuários ativos ou equipe podem editar anúncios"
  ON public.classifieds FOR UPDATE
  TO authenticated
  USING (
    ((SELECT auth.uid()) = user_id AND (SELECT public.is_active_user()))
    OR (SELECT public.is_editor_or_admin())
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id AND (SELECT public.is_active_user()))
    OR (SELECT public.is_editor_or_admin())
  );

-- Moderação: dono comum não pode se autoaprovar, mexer em views/rejeição,
-- transferir o anúncio nem esticar a validade. Equipe e service_role passam direto.
CREATE OR REPLACE FUNCTION public.protect_classified_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  approval_required BOOLEAN;
  validity_days INTEGER;
  max_expiry TIMESTAMPTZ;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_editor_or_admin() THEN
    RETURN NEW;
  END IF;

  SELECT s.require_approval, s.default_validity_days INTO approval_required, validity_days
  FROM public.classified_settings s WHERE s.id = 'default';
  approval_required := COALESCE(approval_required, true);
  validity_days := COALESCE(validity_days, 30);
  -- Um dia de folga para diferenças de relógio entre o navegador e o banco
  max_expiry := now() + make_interval(days => validity_days + 1);

  IF TG_OP = 'INSERT' THEN
    NEW.views_count := 0;
    NEW.rejection_reason := NULL;
    IF NEW.status IS DISTINCT FROM 'pending' AND (approval_required OR NEW.status <> 'published') THEN
      NEW.status := 'pending';
    END IF;
    IF NEW.expires_at IS NULL OR NEW.expires_at > max_expiry THEN
      NEW.expires_at := now() + make_interval(days => validity_days);
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
    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at AND NEW.expires_at > max_expiry THEN
      NEW.expires_at := now() + make_interval(days => validity_days);
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
