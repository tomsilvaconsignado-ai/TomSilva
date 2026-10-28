-- ==============================================================================
-- Publicação do site logo após publicar notícia ou anúncio
--
-- A prévia do link (foto, título e link do portal) só existe depois que o GitHub
-- Pages publica de novo o site. Até aqui isso dependia do agendamento do GitHub,
-- que atrasa horas. Agora, quando uma notícia ou um anúncio publicado muda, o
-- próprio banco avisa o GitHub (repository_dispatch "publicacao") e o deploy roda
-- em seguida. Contadores de visualização não disparam deploy.
--
-- Um aviso por transação: importar ou moderar vários itens de uma vez gera um só
-- deploy. Se o aviso falhar ou o token não existir, a gravação segue normalmente.
--
-- Antes de usar, guarde no Vault um token do GitHub (fine-grained, só o repositório
-- tomsilvaconsignado-ai/TomSilva, permissão "Contents: Read and write"):
--   SELECT vault.create_secret('github_pat_...', 'github_deploy_token');
-- Para trocar o token depois:
--   SELECT vault.update_secret(id, 'github_pat_...') FROM vault.secrets WHERE name = 'github_deploy_token';
-- Para testar: SELECT public.request_site_deploy();  (veja net._http_response)
--
-- Pode ser executado mais de uma vez.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.request_site_deploy()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Já avisado nesta transação
  IF current_setting('folha.deploy_requested', true) = 'on' THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO token
  FROM vault.decrypted_secrets
  WHERE name = 'github_deploy_token'
  LIMIT 1;

  IF coalesce(token, '') = '' THEN
    RAISE WARNING 'Deploy não solicitado: segredo github_deploy_token ausente no Vault';
    RETURN;
  END IF;

  -- pg_net só envia depois do COMMIT: o deploy lê os dados já gravados
  PERFORM net.http_post(
    url := 'https://api.github.com/repos/tomsilvaconsignado-ai/TomSilva/dispatches',
    body := jsonb_build_object('event_type', 'publicacao'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'folhadaregiao-supabase',
      'Content-Type', 'application/json'
    )
  );

  PERFORM set_config('folha.deploy_requested', 'on', true);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Deploy não solicitado: %', SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_site_deploy() FROM PUBLIC, anon, authenticated;

-- Notícias: só o que entra na página de prévia (scripts/prerender.ts); views_count e updated_at não contam
CREATE OR REPLACE FUNCTION public.deploy_on_article_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      PERFORM public.request_site_deploy();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'published' THEN
      PERFORM public.request_site_deploy();
    END IF;
  ELSIF (OLD.status = 'published' OR NEW.status = 'published')
    AND (NEW.title, NEW.subtitle, NEW.slug, NEW.content, NEW.category, NEW.image_url,
         NEW.video_url, NEW.is_video, NEW.author, NEW.status)
      IS DISTINCT FROM
        (OLD.title, OLD.subtitle, OLD.slug, OLD.content, OLD.category, OLD.image_url,
         OLD.video_url, OLD.is_video, OLD.author, OLD.status) THEN
    PERFORM public.request_site_deploy();
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deploy_on_article_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS deploy_on_article_change ON public.articles;
CREATE TRIGGER deploy_on_article_change
  AFTER INSERT OR UPDATE OR DELETE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.deploy_on_article_change();

-- Classificados: aprovação, edição, pausa, renovação ou remoção de anúncio publicado
CREATE OR REPLACE FUNCTION public.deploy_on_classified_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      PERFORM public.request_site_deploy();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'published' THEN
      PERFORM public.request_site_deploy();
    END IF;
  ELSIF (OLD.status = 'published' OR NEW.status = 'published')
    AND (NEW.code, NEW.slug, NEW.title, NEW.description, NEW.section, NEW.type, NEW.category,
         NEW.price_type, NEW.price, NEW.city, NEW.state, NEW.images, NEW.status, NEW.expires_at)
      IS DISTINCT FROM
        (OLD.code, OLD.slug, OLD.title, OLD.description, OLD.section, OLD.type, OLD.category,
         OLD.price_type, OLD.price, OLD.city, OLD.state, OLD.images, OLD.status, OLD.expires_at) THEN
    PERFORM public.request_site_deploy();
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deploy_on_classified_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS deploy_on_classified_change ON public.classifieds;
CREATE TRIGGER deploy_on_classified_change
  AFTER INSERT OR UPDATE OR DELETE ON public.classifieds
  FOR EACH ROW EXECUTE FUNCTION public.deploy_on_classified_change();
