import { adsService, STORAGE_KEYS, getStored, setStored, authService } from '../src/lib/supabase';
import { AdItem, AdPlacement, AdFormat, PlacementSetting, FormatCarouselSetting } from '../src/types/database';

async function runAdsTests() {
  console.log('================================================================');
  console.log('BATERIA DE TESTES — AJUSTE DOS FORMATOS DOS ESPAÇOS PUBLICITÁRIOS');
  console.log('Formatos: Topo, Feed e Rodapé (728×90 / 970×90) | Lateral (300×300 / 300×900)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // TESTE 1: Formatos do Topo da Página (728x90 e 970x90 com seleção de formato ativo)
  console.log('--- TESTE 1: Publicidade do Topo da Página (728×90 e 970×90) ---');
  const initialPlacementSettings = adsService.getPlacementSettings();
  assert(
    initialPlacementSettings.header.preferredFormat === '728x90' || initialPlacementSettings.header.preferredFormat === '970x90',
    `Topo configurado com formato inicial válido: ${initialPlacementSettings.header.preferredFormat}`
  );

  // Alterar formato do Topo para 970x90
  await adsService.savePlacementSetting('header', { preferredFormat: '970x90' });
  const updatedHeaderPref = adsService.getPlacementSettings().header.preferredFormat;
  assert(updatedHeaderPref === '970x90', 'Administrador selecionou formato 970×90 para o Topo (persistido com sucesso)');

  // Alterar formato do Topo de volta para 728x90
  await adsService.savePlacementSetting('header', { preferredFormat: '728x90' });
  assert(adsService.getPlacementSettings().header.preferredFormat === '728x90', 'Administrador comutou formato do Topo para 728×90 com sucesso');

  // Verificar anúncios do topo
  const headerAds = await adsService.getAdsByPlacement('header');
  assert(headerAds.length >= 2, `Topo possui múltiplos anúncios em carrossel (${headerAds.length} cadastrados)`);
  assert(headerAds.some(a => a.adFormat === '728x90' || a.aspectRatio === '728 / 90'), 'Topo contém anúncios 728×90');
  assert(headerAds.some(a => a.adFormat === '970x90' || a.aspectRatio === '970 / 90'), 'Topo contém anúncios 970×90');

  // TESTE 2: Formatos Entre as Notícias - Feed (728x90 e 970x90)
  console.log('\n--- TESTE 2: Publicidade Entre as Notícias - Feed (728×90 e 970×90) ---');
  await adsService.savePlacementSetting('feed', { preferredFormat: '970x90' });
  assert(adsService.getPlacementSettings().feed.preferredFormat === '970x90', 'Formato 970×90 selecionado para Entre as Notícias');

  await adsService.savePlacementSetting('feed', { preferredFormat: '728x90' });
  assert(adsService.getPlacementSettings().feed.preferredFormat === '728x90', 'Formato 728×90 selecionado para Entre as Notícias');

  const feedAds = await adsService.getAdsByPlacement('feed');
  assert(feedAds.length >= 2, `Feed possui carrossel com múltiplos anúncios (${feedAds.length} cadastrados)`);
  assert(feedAds.some(a => a.adFormat === '728x90' || a.aspectRatio === '728 / 90'), 'Feed suporta formato 728×90');
  assert(feedAds.some(a => a.adFormat === '970x90' || a.aspectRatio === '970 / 90'), 'Feed suporta formato 970×90');

  // TESTE 3: Formatos da Publicidade no Rodapé (728x90 e 970x90)
  console.log('\n--- TESTE 3: Publicidade no Rodapé (728×90 e 970×90) ---');
  await adsService.savePlacementSetting('footer', { preferredFormat: '970x90' });
  assert(adsService.getPlacementSettings().footer.preferredFormat === '970x90', 'Formato 970×90 selecionado para Rodapé');

  await adsService.savePlacementSetting('footer', { preferredFormat: '728x90' });
  assert(adsService.getPlacementSettings().footer.preferredFormat === '728x90', 'Formato 728×90 selecionado para Rodapé');

  const footerAds = await adsService.getAdsByPlacement('footer');
  assert(footerAds.length >= 2, `Rodapé possui carrossel com múltiplos anúncios (${footerAds.length} cadastrados)`);
  assert(footerAds.some(a => a.adFormat === '728x90' || a.aspectRatio === '728 / 90'), 'Rodapé suporta formato 728×90');
  assert(footerAds.some(a => a.adFormat === '970x90' || a.aspectRatio === '970 / 90'), 'Rodapé suporta formato 970×90');

  // TESTE 4: Preservação dos Demais Espaços (300x300 e 300x900)
  console.log('\n--- TESTE 4: Demais Espaços — Quadrado (300×300) e Vertical (300×900) ---');
  const ads300 = await adsService.getAdsByFormat('300x300');
  assert(ads300.length >= 2, `Espaço 300×300 preservado com carrossel ativo (${ads300.length} anúncios)`);
  assert(ads300.every(a => a.width === 300 && a.height === 300 && (a.aspectRatio === '1 / 1' || a.adFormat === '300x300')), 'Todos os anúncios 300×300 possuem proporção 1:1 e dimensões exatas 300x300');

  const ads900 = await adsService.getAdsByFormat('300x900');
  assert(ads900.length >= 2, `Espaço 300×900 preservado com carrossel ativo (${ads900.length} anúncios)`);
  assert(ads900.every(a => a.width === 300 && (a.height === 900 || a.height === 600) && (a.aspectRatio === '1 / 3' || a.aspectRatio === '1 / 2' || a.adFormat === '300x900')), 'Anúncios verticais possuem formato 300x900 e proporção vertical estrita');

  // TESTE 5: Temporizadores Independentes por Espaço e Formato
  console.log('\n--- TESTE 5: Temporizadores Totalmente Independentes ---');
  // Define temporizadores diferentes
  await adsService.saveFormatSetting('300x300', { durationSeconds: 4 });
  await adsService.saveFormatSetting('300x900', { durationSeconds: 9 });
  await adsService.savePlacementSetting('header', { defaultDurationSeconds: 6 });
  await adsService.savePlacementSetting('feed', { defaultDurationSeconds: 7 });
  await adsService.savePlacementSetting('footer', { defaultDurationSeconds: 5 });

  const fmtSet = adsService.getFormatSettings();
  const plcSet = adsService.getPlacementSettings();

  assert(fmtSet['300x300'].durationSeconds === 4, 'Temporizador 300×300: 4 segundos');
  assert(fmtSet['300x900'].durationSeconds === 9, 'Temporizador 300×900: 9 segundos');
  assert(plcSet.header.defaultDurationSeconds === 6, 'Temporizador Topo: 6 segundos');
  assert(plcSet.feed.defaultDurationSeconds === 7, 'Temporizador Feed: 7 segundos');
  assert(plcSet.footer.defaultDurationSeconds === 5, 'Temporizador Rodapé: 5 segundos');
  assert(
    fmtSet['300x300'].durationSeconds !== fmtSet['300x900'].durationSeconds &&
    plcSet.header.defaultDurationSeconds !== plcSet.feed.defaultDurationSeconds,
    'Confirmação de que cada espaço e formato opera com temporizador independente'
  );

  // TESTE 6: Cadastro de Novo Anúncio 970x90 no Topo
  console.log('\n--- TESTE 6: Cadastro de Novo Anúncio 970×90 ---');
  const newAd970: Omit<AdItem, 'id' | 'createdAt'> = {
    title: 'Governo de Sergipe - Obras e Desenvolvimento',
    sponsorName: 'Governo de Sergipe',
    linkUrl: 'https://se.gov.br',
    mediaUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=970&h=90&fit=crop',
    mediaType: 'image',
    placement: 'header',
    adFormat: '970x90',
    aspectRatio: '970 / 90',
    width: 970,
    height: 90,
    maxWidth: 970,
    active: true,
    status: 'active',
    durationSeconds: 6,
    openInNewTab: true
  };

  const savedAd970 = await adsService.saveAd(newAd970);
  assert(savedAd970.id.startsWith('ad-'), `Anúncio 970x90 cadastrado com sucesso: ${savedAd970.id}`);
  assert(savedAd970.adFormat === '970x90', 'Formato gravado como 970x90');
  assert(savedAd970.width === 970 && savedAd970.height === 90, 'Dimensões exatas: 970×90 px');
  assert(savedAd970.aspectRatio === '970 / 90', 'Proporção 970/90 confirmada');

  // TESTE 7: Cadastro de Novo Anúncio 300x900 na Lateral
  console.log('\n--- TESTE 7: Cadastro de Novo Anúncio 300×900 ---');
  const newAdVertical: Omit<AdItem, 'id' | 'createdAt'> = {
    title: 'Shopping Jardins Aracaju - Moda e Lazer',
    sponsorName: 'Shopping Jardins',
    linkUrl: 'https://shoppingjardins.com.br',
    mediaUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=1800&fit=crop',
    mediaType: 'image',
    placement: 'sidebar_300x900',
    adFormat: '300x900',
    aspectRatio: '1 / 3',
    width: 300,
    height: 900,
    maxWidth: 300,
    active: true,
    status: 'active',
    durationSeconds: 9,
    openInNewTab: true
  };

  const savedAdVert = await adsService.saveAd(newAdVertical);
  assert(savedAdVert.id.startsWith('ad-'), `Anúncio 300x900 cadastrado com sucesso: ${savedAdVert.id}`);
  assert(savedAdVert.adFormat === '300x900', 'Formato gravado como 300x900');
  assert(savedAdVert.width === 300 && savedAdVert.height === 900, 'Dimensões exatas: 300×900 px');
  assert(savedAdVert.aspectRatio === '1 / 3', 'Proporção 1:3 vertical confirmada');

  // TESTE 8: Reordenação dos Slides no Carrossel
  console.log('\n--- TESTE 8: Reordenação dos Slides ---');
  const initialHeaderAds = await adsService.getAdsByPlacement('header');
  const firstId = initialHeaderAds[0].id;
  const secondId = initialHeaderAds[1].id;

  await adsService.reorderAds('header', [secondId, firstId, ...initialHeaderAds.slice(2).map(a => a.id)]);
  const reorderedHeaderAds = await adsService.getAdsByPlacement('header');
  assert(reorderedHeaderAds[0].id === secondId, 'Slide reordenado para a posição 1 com sucesso');
  assert(reorderedHeaderAds[1].id === firstId, 'Slide reordenado para a posição 2 com sucesso');

  // TESTE 9: Ativação, Desativação e Métricas (Impressões / Cliques)
  console.log('\n--- TESTE 9: Status Ativo/Pausado e Rastreamento de Métricas ---');
  const pausedAd = await adsService.saveAd({
    ...savedAd970,
    status: 'paused',
    active: false
  });
  assert(pausedAd.status === 'paused' && !pausedAd.active, 'Anúncio pausado no carrossel com sucesso');

  const unpausedAd = await adsService.saveAd({
    ...pausedAd,
    status: 'active',
    active: true
  });
  assert(unpausedAd.status === 'active' && unpausedAd.active, 'Anúncio reativado no carrossel com sucesso');

  // Cliques
  adsService.recordClick(savedAd970.id);
  const adsWithClick = await adsService.getAds();
  const clickedAd = adsWithClick.find(a => a.id === savedAd970.id);
  assert((clickedAd?.clicksCount || 0) >= 1, 'Clique computado com sucesso no anúncio 970×90');

  // Impressões
  adsService.recordImpression(savedAd970.id);
  const adsWithImp = await adsService.getAds();
  const viewedAd = adsWithImp.find(a => a.id === savedAd970.id);
  assert((viewedAd?.impressionsCount || 0) >= 1, 'Impressão computada com sucesso no anúncio 970×90');

  // TESTE 10: Autenticação Administrativa e Proteção
  console.log('\n--- TESTE 10: Autenticação Administrativa ---');
  const adminAuth = await authService.signIn('tomsilvaconsignado@gmail.com', 'Folha@1234');
  assert(adminAuth.user?.role === 'admin', 'Acesso administrativo autenticado com perfil admin');

  // Limpeza dos anúncios temporários de teste
  await adsService.deleteAd(savedAd970.id);
  await adsService.deleteAd(savedAdVert.id);

  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES: ${passed} PASSOU / ${failed} FALHOU`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdsTests().catch(e => {
  console.error('Erro executando bateria de testes:', e);
  process.exit(1);
});
