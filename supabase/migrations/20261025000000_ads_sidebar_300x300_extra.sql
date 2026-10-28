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
  )) NOT VALID;
