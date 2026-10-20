-- ==============================================================================
-- VERIFICAÇÃO da migração supabase/migrations/20261019210000_harden_auth_rls.sql
-- Rode no SQL Editor DEPOIS da migração. Tudo roda dentro de uma transação que
-- é desfeita no final (ROLLBACK): nenhum dado é alterado.
-- ==============================================================================

-- 0. Quem tem papel privilegiado hoje? Confira se todos são legítimos
--    (antes da correção, qualquer cadastro podia se tornar admin).
SELECT p.id, p.email, p.role, p.status, p.created_at,
       u.raw_user_meta_data->>'role' AS role_pedido_no_cadastro
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.role IN ('admin', 'editor') OR u.raw_user_meta_data->>'role' IN ('admin', 'editor')
ORDER BY p.created_at;

-- 1. Policies atuais (nenhuma deve usar auth.role() nem ser {public} com USING true em profiles)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 2. Tabelas do schema public sem RLS (deve voltar vazio)
SELECT c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- 3. Funções SECURITY DEFINER no public e seu search_path / quem pode executar
SELECT p.proname, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.proname;

-- 4. Testes simulando papéis (desfeitos no ROLLBACK)
BEGIN;

-- Pega um usuário comum qualquer para simular
CREATE TEMP TABLE _alvo ON COMMIT DROP AS
  SELECT id FROM public.profiles WHERE role = 'reader' LIMIT 1;
GRANT SELECT ON _alvo TO anon, authenticated;

-- 4a. Visitante anônimo: não pode ler perfis (esperado: 0)
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT 'anon lê profiles' AS teste, count(*) AS linhas FROM public.profiles;
SELECT 'anon lê articles (ok)' AS teste, count(*) AS linhas FROM public.articles;
RESET ROLE;

-- 4b. Leitor logado: só vê o próprio perfil (esperado: 1) e não vira admin
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT id FROM _alvo), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
SELECT 'reader lê profiles' AS teste, count(*) AS linhas FROM public.profiles;
UPDATE public.profiles SET role = 'admin', status = 'active', full_name = full_name || ' (teste)'
  WHERE id = (SELECT id FROM _alvo);
SELECT 'reader tentou virar admin' AS teste, role AS role_final, full_name
  FROM public.profiles WHERE id = (SELECT id FROM _alvo);
SELECT 'reader is_admin()' AS teste, public.is_admin() AS resultado;
RESET ROLE;

ROLLBACK;

-- Resultado esperado do bloco 4:
--   anon lê profiles            -> 0
--   reader lê profiles          -> 1
--   reader tentou virar admin   -> role_final = 'reader' (full_name muda só dentro do teste)
--   reader is_admin()           -> false
