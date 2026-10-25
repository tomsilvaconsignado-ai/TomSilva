import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, Plus, Trash2, Edit2, Play, Pause, ExternalLink, 
  Upload, Eye, CheckCircle2, AlertCircle, Info, Layout, 
  Layers, Sparkles, Image as ImageIcon, Calendar, X,
  ArrowUp, ArrowDown, Clock, ShieldCheck, Monitor, Smartphone, RefreshCw, 
  Square, RectangleVertical, Columns, ArrowRight
} from 'lucide-react';
import { AdItem, AdPlacement, AdFormat, AdStatus, PlacementSetting, FormatCarouselSetting, PlacementMode, isExtraSidebarSquare } from '../../types/database';
import { adsService } from '../../lib/supabase';
import { AdSlot } from '../news/AdSlot';

interface AdminManageAdsProps {
  ads: AdItem[];
  onRefreshData: () => void;
}

export type AdminAdsSpace = 'header' | 'feed' | 'footer' | 'sidebar_300x300' | 'sidebar_300x300_2' | 'sidebar_300x300_3' | 'sidebar_300x900' | 'article';

interface SpaceDefinition {
  id: AdminAdsSpace;
  title: string;
  subtitle: string;
  badge: string;
  placement: AdPlacement;
  compatibleFormats: AdFormat[];
  defaultFormat: AdFormat;
  isFormatSelectorAllowed: boolean;
  aspectDesc: string;
}

const SPACES_DEFINITIONS: SpaceDefinition[] = [
  {
    id: 'header',
    title: 'Publicidade do Topo',
    subtitle: 'Espaço horizontal acima do conteúdo principal e ao lado da logomarca.',
    badge: 'Topo do Portal',
    placement: 'header',
    compatibleFormats: ['728x90', '970x90'],
    defaultFormat: '728x90',
    isFormatSelectorAllowed: true,
    aspectDesc: '728×90 px ou 970×90 px (Horizontal)'
  },
  {
    id: 'feed',
    title: 'Entre as Notícias',
    subtitle: 'Espaço horizontal inserido entre as notícias da página inicial.',
    badge: 'Feed de Notícias',
    placement: 'feed',
    compatibleFormats: ['728x90', '970x90'],
    defaultFormat: '728x90',
    isFormatSelectorAllowed: true,
    aspectDesc: '728×90 px ou 970×90 px (Horizontal)'
  },
  {
    id: 'footer',
    title: 'Publicidade do Rodapé',
    subtitle: 'Espaço horizontal localizado na área inferior do portal antes dos créditos.',
    badge: 'Rodapé',
    placement: 'footer',
    compatibleFormats: ['728x90', '970x90'],
    defaultFormat: '728x90',
    isFormatSelectorAllowed: true,
    aspectDesc: '728×90 px ou 970×90 px (Horizontal)'
  },
  {
    id: 'sidebar_300x300',
    title: 'Lateral — 300×300 (Quadrado)',
    subtitle: 'Espaço quadrado na coluna lateral acima de Mais Lidas.',
    badge: 'Coluna Lateral',
    placement: 'sidebar',
    compatibleFormats: ['300x300'],
    defaultFormat: '300x300',
    isFormatSelectorAllowed: false,
    aspectDesc: '300×300 px (Quadrado 1:1)'
  },
  {
    id: 'sidebar_300x300_2',
    title: 'Lateral — 300×300 (Quadrado 2)',
    subtitle: 'Segundo espaço quadrado na coluna lateral, logo abaixo do primeiro.',
    badge: 'Coluna Lateral',
    placement: 'sidebar_300x300_2',
    compatibleFormats: ['300x300'],
    defaultFormat: '300x300',
    isFormatSelectorAllowed: false,
    aspectDesc: '300×300 px (Quadrado 1:1)'
  },
  {
    id: 'sidebar_300x300_3',
    title: 'Lateral — 300×300 (Quadrado 3)',
    subtitle: 'Terceiro espaço quadrado na coluna lateral, abaixo do segundo.',
    badge: 'Coluna Lateral',
    placement: 'sidebar_300x300_3',
    compatibleFormats: ['300x300'],
    defaultFormat: '300x300',
    isFormatSelectorAllowed: false,
    aspectDesc: '300×300 px (Quadrado 1:1)'
  },
  {
    id: 'sidebar_300x900',
    title: 'Lateral — 300×900 (Vertical)',
    subtitle: 'Espaço vertical skyscraper de alto impacto na coluna lateral.',
    badge: 'Coluna Lateral',
    placement: 'sidebar_300x900',
    compatibleFormats: ['300x900'],
    defaultFormat: '300x900',
    isFormatSelectorAllowed: false,
    aspectDesc: '300×900 px (Vertical 1:3)'
  },
  {
    id: 'article',
    title: 'Dentro da Matéria',
    subtitle: 'Espaço publicitário quadrado exibido dentro das reportagens.',
    badge: 'Artigo / Matéria',
    placement: 'article',
    compatibleFormats: ['300x300'],
    defaultFormat: '300x300',
    isFormatSelectorAllowed: false,
    aspectDesc: '300×300 px (Quadrado 1:1)'
  }
];

export const AdminManageAds: React.FC<AdminManageAdsProps> = ({ ads, onRefreshData }) => {
  // Espaço ativo no painel administrativo
  const [activeSpace, setActiveSpace] = useState<AdminAdsSpace>('header');
  const [activeView, setActiveView] = useState<'list' | 'create'>('list');
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);

  // Configurações dos formatos (300x300 e 300x900)
  const [formatSettings, setFormatSettings] = useState<Record<'300x300' | '300x900' | '300x600', FormatCarouselSetting>>(() => 
    adsService.getFormatSettings()
  );

  // Configurações dos espaços (header, feed, footer, sidebar, sidebar_300x900, article)
  const [placementSettings, setPlacementSettings] = useState<Record<AdPlacement, PlacementSetting>>(() => 
    adsService.getPlacementSettings()
  );

  // Temporizadores editáveis no input para cada espaço
  const [customTimerValue, setCustomTimerValue] = useState<number>(5);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Campos do formulário de anúncio
  const [formFormat, setFormFormat] = useState<AdFormat>('728x90');
  const [title, setTitle] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif'>('image');
  const [linkUrl, setLinkUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [placement, setPlacement] = useState<AdPlacement>('header');
  const [status, setStatus] = useState<AdStatus>('active');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [durationSeconds, setDurationSeconds] = useState<number>(5);
  const [openInNewTab, setOpenInNewTab] = useState<boolean>(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [adToDelete, setAdToDelete] = useState<AdItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Definição do espaço ativo atual
  const currentSpaceDef = SPACES_DEFINITIONS.find(s => s.id === activeSpace) || SPACES_DEFINITIONS[0];

  // Recarrega configurações
  const reloadSettings = () => {
    const fSettings = adsService.getFormatSettings();
    setFormatSettings(fSettings);
    const pSettings = adsService.getPlacementSettings();
    setPlacementSettings(pSettings);

    // Ajusta o timer de visualização conforme o espaço
    if (activeSpace === 'sidebar_300x300') {
      setCustomTimerValue(fSettings['300x300']?.durationSeconds || 5);
    } else if (activeSpace === 'sidebar_300x900') {
      setCustomTimerValue(fSettings['300x900']?.durationSeconds || 8);
    } else {
      const p = currentSpaceDef.placement;
      setCustomTimerValue(pSettings[p]?.defaultDurationSeconds || 5);
    }
  };

  useEffect(() => {
    reloadSettings();
  }, [activeSpace]);

  // Filtra anúncios do espaço ativo
  const getAdsForCurrentSpace = (): AdItem[] => {
    if (activeSpace === 'sidebar_300x300') {
      return ads.filter(a => 
        (a.adFormat === '300x300' || a.aspectRatio === '1 / 1') && 
        a.placement !== 'sidebar_300x900' && 
        a.placement !== 'sidebar_300x600' &&
        !isExtraSidebarSquare(a.placement) &&
        a.placement !== 'header' && 
        a.placement !== 'feed' && 
        a.placement !== 'footer'
      ).sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
    }
    if (activeSpace === 'sidebar_300x900') {
      return ads.filter(a => 
        a.adFormat === '300x900' || 
        a.placement === 'sidebar_300x900' || 
        a.aspectRatio === '1 / 3' ||
        a.adFormat === '300x600' ||
        a.placement === 'sidebar_300x600'
      ).sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
    }
    if (activeSpace === 'header') {
      return ads.filter(a => a.placement === 'header').sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
    }
    if (activeSpace === 'feed') {
      return ads.filter(a => a.placement === 'feed').sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
    }
    if (activeSpace === 'footer') {
      return ads.filter(a => a.placement === 'footer').sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
    }
    if (activeSpace === 'article' || activeSpace === 'sidebar_300x300_2' || activeSpace === 'sidebar_300x300_3') {
      return ads.filter(a => a.placement === currentSpaceDef.placement).sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
    }
    return [];
  };

  const targetAds = getAdsForCurrentSpace();
  const activeCount = targetAds.filter(a => a.active && a.status !== 'paused').length;

  // Formato ativo atual do espaço
  const currentActiveFormat: AdFormat = (() => {
    if (activeSpace === 'sidebar_300x300' || activeSpace === 'article' || isExtraSidebarSquare(activeSpace)) return '300x300';
    if (activeSpace === 'sidebar_300x900') return '300x900';
    const curPref = placementSettings[currentSpaceDef.placement]?.preferredFormat;
    if (curPref === '970x90' || curPref === '728x90') return curPref;
    return currentSpaceDef.defaultFormat;
  })();

  // Temporizador atual do espaço ativo
  const currentDurationSeconds: number = (() => {
    if (activeSpace === 'sidebar_300x300') return formatSettings['300x300']?.durationSeconds || 5;
    if (activeSpace === 'sidebar_300x900') return formatSettings['300x900']?.durationSeconds || 8;
    return placementSettings[currentSpaceDef.placement]?.defaultDurationSeconds || 5;
  })();

  // Status de pausa do espaço ativo
  const isCurrentlyPaused: boolean = (() => {
    if (activeSpace === 'sidebar_300x300') return formatSettings['300x300']?.isPaused || false;
    if (activeSpace === 'sidebar_300x900') return formatSettings['300x900']?.isPaused || false;
    return placementSettings[currentSpaceDef.placement]?.isPaused || false;
  })();

  // As gravações vão para o Supabase e podem falhar (sessão expirada, sem permissão, rede)
  const runSafely = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível concluir a operação.');
    }
  };

  // Selecionar formato ativo do espaço (728x90 vs 970x90 para Topo, Feed e Rodapé)
  const handleSelectSpaceFormat = (newFormat: '728x90' | '970x90') => runSafely(async () => {
    const targetPlacement = currentSpaceDef.placement;
    await adsService.savePlacementSetting(targetPlacement, { preferredFormat: newFormat });
    reloadSettings();
    onRefreshData();
    setSuccessNotice(`Formato ativo do espaço "${currentSpaceDef.title}" alterado para ${newFormat.replace('x', ' × ')} pixels com sucesso!`);
    setTimeout(() => setSuccessNotice(null), 3500);
  });

  // Salvar temporizador independente do espaço ativo
  const handleSaveCurrentTimer = (seconds: number) => runSafely(async () => {
    const sec = Math.max(2, Math.min(60, Number(seconds) || 5));
    if (activeSpace === 'sidebar_300x300') {
      await adsService.saveFormatSetting('300x300', { durationSeconds: sec });
    } else if (activeSpace === 'sidebar_300x900') {
      await adsService.saveFormatSetting('300x900', { durationSeconds: sec });
      await adsService.saveFormatSetting('300x600', { durationSeconds: sec });
    } else {
      await adsService.savePlacementSetting(currentSpaceDef.placement, { defaultDurationSeconds: sec });
    }
    reloadSettings();
    onRefreshData();
    setSuccessNotice(`Temporizador do carrossel do espaço "${currentSpaceDef.title}" atualizado para ${sec} segundos!`);
    setTimeout(() => setSuccessNotice(null), 3500);
  });

  // Pausar / Retomar rotação do espaço ativo
  const handleToggleCurrentPause = () => runSafely(async () => {
    const nextPaused = !isCurrentlyPaused;
    if (activeSpace === 'sidebar_300x300') {
      await adsService.saveFormatSetting('300x300', { isPaused: nextPaused });
    } else if (activeSpace === 'sidebar_300x900') {
      await adsService.saveFormatSetting('300x900', { isPaused: nextPaused });
    } else {
      await adsService.savePlacementSetting(currentSpaceDef.placement, { isPaused: nextPaused });
    }
    reloadSettings();
    onRefreshData();
  });

  // Abertura do formulário de criação respeitando estritamente os formatos compatíveis do espaço
  const openCreateForm = (preferredFormat?: AdFormat) => {
    const compatible = currentSpaceDef.compatibleFormats;
    const targetFormat = (preferredFormat && compatible.includes(preferredFormat)) 
      ? preferredFormat 
      : (compatible.includes(currentActiveFormat) ? currentActiveFormat : compatible[0]);

    setEditingAd(null);
    setFormFormat(targetFormat);
    setTitle('');
    setSponsorName('');
    setCampaignName('');
    setMediaUrl('');
    setMediaType('image');
    setLinkUrl('');
    setAltText('');
    setPlacement(currentSpaceDef.placement);
    setStatus('active');
    
    setDisplayOrder(targetAds.length + 1);
    setDurationSeconds(currentDurationSeconds);
    setOpenInNewTab(true);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setError(null);
    setSuccessNotice(null);
    setActiveView('create');
  };

  const openEditForm = (ad: AdItem) => {
    setEditingAd(ad);
    const compatible = currentSpaceDef.compatibleFormats;
    let computedFormat: AdFormat = ad.adFormat || compatible[0];
    if (!compatible.includes(computedFormat)) {
      computedFormat = compatible[0];
    }

    setFormFormat(computedFormat);
    setTitle(ad.title);
    setSponsorName(ad.sponsorName);
    setCampaignName(ad.campaignName || '');
    setMediaUrl(ad.mediaUrl);
    setMediaType(ad.mediaType);
    setLinkUrl(ad.linkUrl);
    setAltText(ad.altText || '');
    setPlacement(ad.placement || currentSpaceDef.placement);
    setStatus(ad.status || (ad.active ? 'active' : 'paused'));
    setDisplayOrder(ad.displayOrder || 1);
    setDurationSeconds(ad.durationSeconds || currentDurationSeconds);
    setOpenInNewTab(ad.openInNewTab ?? true);
    setStartDate(ad.startDate || '');
    setEndDate(ad.endDate || '');
    setError(null);
    setSuccessNotice(null);
    setActiveView('create');
  };

  // Upload de arquivo local para Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!valid.includes(file.type)) {
      setError('Formato não aceito. Selecione uma imagem JPG, JPEG, PNG, GIF animado ou WebP.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('O arquivo excede o limite de 8MB. Por favor, otimize a peça publicitária.');
      return;
    }

    if (file.type === 'image/gif') {
      setMediaType('gif');
    } else {
      setMediaType('image');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Salvar anúncio com dimensões compatíveis
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!title.trim()) {
      setError('Informe o título interno ou identificação da campanha.');
      return;
    }
    if (!sponsorName.trim()) {
      setError('Informe o nome do anunciante ou patrocinador.');
      return;
    }
    if (!mediaUrl.trim()) {
      setError('Faça o envio da arte publicitária ou informe o link da imagem/vídeo.');
      return;
    }

    // Validação estrita do formato com o espaço
    if (!currentSpaceDef.compatibleFormats.includes(formFormat)) {
      setError(`O formato selecionado não é compatível com o espaço "${currentSpaceDef.title}". Formatos aceitos: ${currentSpaceDef.compatibleFormats.join(' ou ')}.`);
      return;
    }

    setLoading(true);
    try {
      const is970 = formFormat === '970x90';
      const is728 = formFormat === '728x90';
      const is900 = formFormat === '300x900';
      const is300 = formFormat === '300x300';

      const finalPlacement: AdPlacement = is900 ? 'sidebar_300x900' : (is300 ? (placement === 'article' || isExtraSidebarSquare(placement) ? placement : 'sidebar') : placement);

      await adsService.saveAd({
        id: editingAd?.id,
        title: title.trim(),
        sponsorName: sponsorName.trim(),
        campaignName: campaignName.trim() || undefined,
        mediaUrl: mediaUrl.trim(),
        mediaType,
        linkUrl: linkUrl.trim() || 'https://folhadaregiaonline.com.br/institucional/anuncie-conosco',
        altText: altText.trim() || `${sponsorName.trim()} - ${title.trim()}`,
        placement: finalPlacement,
        adFormat: formFormat,
        aspectRatio: is970 ? '970 / 90' : (is728 ? '728 / 90' : (is900 ? '1 / 3' : '1 / 1')),
        maxWidth: is970 ? 970 : (is728 ? 728 : 300),
        width: is970 ? 970 : (is728 ? 728 : 300),
        height: is970 ? 90 : (is728 ? 90 : (is900 ? 900 : 300)),
        active: status === 'active',
        status,
        displayOrder: Number(displayOrder) || 1,
        durationSeconds: Math.max(2, Math.min(60, Number(durationSeconds) || currentDurationSeconds)),
        openInNewTab,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      setSuccessNotice(`Publicidade salva com sucesso no formato ${formFormat.replace('x', '×')} px para "${currentSpaceDef.title}"!`);
      setTimeout(() => {
        onRefreshData();
        setActiveView('list');
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar publicidade.');
    } finally {
      setLoading(false);
    }
  };

  // Ativar / Desativar anúncio individual
  const handleToggleStatus = (ad: AdItem) => runSafely(async () => {
    const nextStatus: AdStatus = ad.status === 'active' ? 'paused' : 'active';
    await adsService.saveAd({
      ...ad,
      status: nextStatus,
      active: nextStatus === 'active'
    });
    onRefreshData();
  });

  // Excluir anúncio
  const handleDeleteAd = () => runSafely(async () => {
    if (!adToDelete) return;
    await adsService.deleteAd(adToDelete.id);
    setAdToDelete(null);
    onRefreshData();
  });

  // Reordenar anúncios no carrossel do espaço
  const handleMoveOrder = (ad: AdItem, direction: 'up' | 'down') => runSafely(async () => {
    const currentIndex = targetAds.findIndex(a => a.id === ad.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= targetAds.length) return;

    const reordered = [...targetAds];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    if (activeSpace === 'sidebar_300x300') {
      await adsService.reorderAdsByFormat('300x300', reordered.map(a => a.id));
    } else if (activeSpace === 'sidebar_300x900') {
      await adsService.reorderAdsByFormat('300x900', reordered.map(a => a.id));
    } else {
      await adsService.reorderAds(currentSpaceDef.placement, reordered.map(a => a.id));
    }
    onRefreshData();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Topo do Módulo Administrativo */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              Gerenciamento de Publicidade & Carrosséis
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056a4] text-[10px] font-black uppercase tracking-wider border border-blue-100">
              Formatos Independentes
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Configure os formatos permitidos por espaço (Topo, Entre Notícias e Rodapé: 728×90 / 970×90; Laterais: 300×300 e 300×900), com temporizadores independentes e prévia responsiva.
          </p>
        </div>

        {activeView === 'list' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateForm()}
              className="px-5 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Anúncio em {currentSpaceDef.title}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Voltar à Lista
          </button>
        )}
      </div>

      {/* Notificação de Sucesso */}
      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-bold">{successNotice}</span>
        </div>
      )}

      {/* SELETOR DE ESPAÇOS PUBLICITÁRIOS (NAVEGAÇÃO POR ESPAÇO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SPACES_DEFINITIONS.filter(s => s.id !== 'article').map((spaceDef) => {
          const isSelected = activeSpace === spaceDef.id;
          const spaceAds = (() => {
            if (spaceDef.id === 'sidebar_300x300') {
              return ads.filter(a => (a.adFormat === '300x300' || a.aspectRatio === '1 / 1') && a.placement !== 'sidebar_300x900' && a.placement !== 'sidebar_300x600' && !isExtraSidebarSquare(a.placement));
            }
            if (spaceDef.id === 'sidebar_300x900') {
              return ads.filter(a => a.adFormat === '300x900' || a.placement === 'sidebar_300x900' || a.aspectRatio === '1 / 3' || a.adFormat === '300x600');
            }
            return ads.filter(a => a.placement === spaceDef.placement);
          })();

          const spaceActiveCount = spaceAds.filter(a => a.active && a.status !== 'paused').length;
          const activeFmt = (() => {
            if (spaceDef.id === 'sidebar_300x300' || isExtraSidebarSquare(spaceDef.id)) return '300×300';
            if (spaceDef.id === 'sidebar_300x900') return '300×900';
            const pref = placementSettings[spaceDef.placement]?.preferredFormat;
            return pref === '970x90' ? '970×90' : '728×90';
          })();

          return (
            <button
              key={spaceDef.id}
              type="button"
              onClick={() => { setActiveSpace(spaceDef.id); setActiveView('list'); }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#0056a4] bg-blue-50/70 shadow-sm ring-1 ring-[#0056a4]/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? 'text-[#0056a4]' : 'text-gray-400'}`}>
                    {spaceDef.badge}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white border border-gray-200 text-gray-700">
                    {activeFmt}
                  </span>
                </div>
                <h4 className="font-black text-xs text-gray-900 leading-tight">
                  {spaceDef.title}
                </h4>
                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  Formatos: {spaceDef.compatibleFormats.map(f => f.replace('x', '×')).join(' ou ')} px
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-2 mt-2 border-t border-gray-200/60 font-bold">
                <span className="text-gray-700">
                  {spaceActiveCount} de {spaceAds.length} ativos
                </span>
                <span className="text-[#0056a4] font-mono">
                  ⏱ {spaceDef.id === 'sidebar_300x300' ? (formatSettings['300x300']?.durationSeconds || 5) : spaceDef.id === 'sidebar_300x900' ? (formatSettings['300x900']?.durationSeconds || 8) : (placementSettings[spaceDef.placement]?.defaultDurationSeconds || 5)}s
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          VISÃO 1: FORMULÁRIO DE INSERÇÃO / EDIÇÃO
      ======================================================== */}
      {activeView === 'create' && (
        <form onSubmit={handleSaveAd} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-base text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Layout className="w-5 h-5 text-[#0056a4]" />
                  {editingAd ? `Editar Anúncio — ${currentSpaceDef.title}` : `Novo Anúncio — ${currentSpaceDef.title}`}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Este espaço aceita estritamente: <strong>{currentSpaceDef.compatibleFormats.map(f => f.replace('x', '×') + ' px').join(' ou ')}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-[#0056a4] border border-blue-200 font-mono">
                  Espaço: {currentSpaceDef.title}
                </span>
              </div>
            </div>

            {/* SELEÇÃO DO FORMATO NO FORMULÁRIO (APRESENTA SOMENTE OS FORMATOS COMPATÍVEIS COM ESTE ESPAÇO) */}
            <div>
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
                Formato do Anúncio (Compatíveis com {currentSpaceDef.title}):
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentSpaceDef.compatibleFormats.map((fmt) => {
                  const isSelected = formFormat === fmt;
                  const label = fmt === '970x90' 
                    ? 'Banner Super Leaderboard — 970 × 90 px' 
                    : fmt === '728x90'
                    ? 'Banner Leaderboard Tradicional — 728 × 90 px'
                    : fmt === '300x900'
                    ? 'Banner Skyscraper Vertical — 300 × 900 px'
                    : 'Banner Quadrado Médio — 300 × 300 px';

                  const desc = fmt === '970x90'
                    ? 'Formato horizontal estendido para telas maiores e máxima visibilidade'
                    : fmt === '728x90'
                    ? 'Formato horizontal clássico para cabeçalho, feed e rodapé'
                    : fmt === '300x900'
                    ? 'Formato vertical skyscraper de alto impacto na coluna lateral'
                    : 'Formato quadrado ideal para a coluna lateral ou corpo da matéria';

                  return (
                    <div
                      key={fmt}
                      onClick={() => setFormFormat(fmt)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'border-[#0056a4] bg-blue-50/60 shadow-xs font-bold text-gray-900 ring-1 ring-[#0056a4]/30'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <div className="p-1 rounded bg-white border border-gray-200 text-[#0056a4] shrink-0">
                        {fmt === '300x900' ? <RectangleVertical className="w-5 h-5" /> : fmt === '300x300' ? <Square className="w-5 h-5" /> : <Layout className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black uppercase text-gray-900">{label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CAMPOS DE DADOS DO ANÚNCIO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Nome do Anunciante / Patrocinador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Ex: Hospital Primavera, Vidraçaria Manancial, Unit"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Título Interno da Campanha <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Campanha Especial 2026 - Slide 1"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Link de Destino ao Clicar (URL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://instagram.com/anunciante ou https://site.com.br"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Nome da Campanha (Opcional)
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Institucional Sergipe, Vestibular 2026"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* UPLOAD / URL DA ARTE PUBLICITÁRIA */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
                Arte Publicitária (Imagem, GIF Animado ou Vídeo) <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-4 h-4 text-[#0056a4]" />
                      Enviar Arquivo do Computador
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value as any)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                    >
                      <option value="image">Tipo: Imagem Estática (JPG/PNG)</option>
                      <option value="gif">Tipo: GIF Animado</option>
                      <option value="video">Tipo: Vídeo MP4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      Ou informe a URL direta da imagem/vídeo:
                    </label>
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://exemplo.com/arte-publicitaria.jpg"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      Texto Alternativo (Acessibilidade e SEO):
                    </label>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Ex: Anúncio publicitário de patrocinador em Sergipe"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* PRÉVIA DA ARTE DENTRO DO FORMULÁRIO */}
                <div className="lg:col-span-4 bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black uppercase text-gray-400 mb-2">
                    Prévia da Arte ({formFormat.replace('x', '×')} px)
                  </span>
                  {mediaUrl ? (
                    <div 
                      className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-xs w-full max-w-[240px] flex items-center justify-center"
                      style={{
                        aspectRatio: formFormat === '970x90' ? '970 / 90' : formFormat === '728x90' ? '728 / 90' : formFormat === '300x900' ? '1 / 3' : '1 / 1'
                      }}
                    >
                      {mediaType === 'video' ? (
                        <video src={mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ) : (
                    <div 
                      className="w-full max-w-[240px] rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 text-xs p-4"
                      style={{
                        aspectRatio: formFormat === '970x90' ? '970 / 90' : formFormat === '728x90' ? '728 / 90' : formFormat === '300x900' ? '1 / 3' : '1 / 1'
                      }}
                    >
                      <ImageIcon className="w-8 h-8 mb-1 text-gray-300" />
                      <span>Sem imagem</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CONFIGURAÇÃO DO SLIDE NO CARROSSEL */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1">
                  Status do Anúncio
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AdStatus)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="active">🟢 Ativo (Gira no carrossel)</option>
                  <option value="paused">⏸ Pausado (Oculto)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1">
                  Ordem no Carrossel
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1">
                  Tempo Individual (s)
                </label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value) || currentDurationSeconds)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold font-mono outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="openInNewTab"
                  checked={openInNewTab}
                  onChange={(e) => setOpenInNewTab(e.target.checked)}
                  className="w-4 h-4 text-[#0056a4] rounded cursor-pointer"
                />
                <label htmlFor="openInNewTab" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Abrir link em nova aba
                </label>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO DO FORMULÁRIO */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Salvando...' : editingAd ? 'Salvar Alterações' : 'Cadastrar Anúncio no Carrossel'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================
          VISÃO 2: GERENCIAMENTO DO ESPAÇO ATIVO (LISTA + PRÉVIA AO VIVO)
      ======================================================== */}
      {activeView === 'list' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            {/* CABEÇALHO DO ESPAÇO */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0056a4] flex items-center justify-center font-black">
                  {activeSpace === 'sidebar_300x900' ? (
                    <RectangleVertical className="w-5 h-5" />
                  ) : activeSpace === 'sidebar_300x300' || isExtraSidebarSquare(activeSpace) ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Layout className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black uppercase text-gray-900 tracking-tight">
                      {currentSpaceDef.title}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200">
                      Formato Ativo: {currentActiveFormat.replace('x', ' × ')} px
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {targetAds.length} anúncio(s) cadastrado(s) • {activeCount} ativo(s) em rotação independente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleCurrentPause}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isCurrentlyPaused
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {isCurrentlyPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 text-amber-600" />
                      Carrossel Pausado (Clique para retomar)
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 text-gray-600" />
                      Carrossel Rodando (Clique para pausar)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openCreateForm()}
                  className="px-4 py-2 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Anúncio
                </button>
              </div>
            </div>

            {/* SELETOR DE FORMATO PARA O TOPO, FEED E RODAPÉ (EXIGÊNCIA SEÇÕES 1, 2, 3) */}
            {currentSpaceDef.isFormatSelectorAllowed && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="block text-xs font-black uppercase text-gray-800 tracking-wider">
                    Formato de Exibição deste Espaço:
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Selecione qual dimensão horizontal deve ser veiculada neste espaço no portal público:
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectSpaceFormat('728x90')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      currentActiveFormat === '728x90'
                        ? 'bg-[#0056a4] text-white border-[#0056a4] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span>728 × 90 pixels</span>
                    {currentActiveFormat === '728x90' && <CheckCircle2 className="w-3.5 h-3.5 inline" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSpaceFormat('970x90')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      currentActiveFormat === '970x90'
                        ? 'bg-[#0056a4] text-white border-[#0056a4] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span>970 × 90 pixels</span>
                    {currentActiveFormat === '970x90' && <CheckCircle2 className="w-3.5 h-3.5 inline" />}
                  </button>
                </div>
              </div>
            )}

            {/* TEMPORIZADOR INDEPENDENTE DESTE ESPAÇO */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#0056a4] shrink-0" />
                <div>
                  <span className="block text-xs font-black uppercase text-gray-800 tracking-wider">
                    Temporizador Independente deste Carrossel:
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Tempo de permanência de cada anúncio antes da transição automática no portal.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[3, 5, 8, 10, 12, 15].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setCustomTimerValue(sec);
                        handleSaveCurrentTimer(sec);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                        currentDurationSeconds === sec
                          ? 'bg-[#0056a4] text-white border-[#0056a4] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300">
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={customTimerValue}
                    onChange={(e) => setCustomTimerValue(Number(e.target.value) || 5)}
                    className="w-16 px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold font-mono text-center outline-none focus:border-[#0056a4]"
                  />
                  <span className="text-xs font-bold text-gray-500">segundos</span>
                  <button
                    type="button"
                    onClick={() => handleSaveCurrentTimer(customTimerValue)}
                    className="px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>

            {/* GRID DE DUAS COLUNAS: LISTA DE ANÚNCIOS + PRÉVIA AO VIVO */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
              {/* COLUNA ESQUERDA: LISTA DE ANÚNCIOS E REORDENAÇÃO (7 Colunas) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                    Slides Cadastrados no Carrossel ({targetAds.length})
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Use as setas para reordenar a sequência
                  </span>
                </div>

                {targetAds.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 space-y-3">
                    <ImageIcon className="w-10 h-10 text-gray-300 mx-auto" />
                    <h4 className="font-bold text-gray-700 text-sm">
                      Nenhum anúncio cadastrado para "{currentSpaceDef.title}"
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Formatos aceitos: {currentSpaceDef.compatibleFormats.map(f => f.replace('x', '×') + ' px').join(' ou ')}.
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreateForm()}
                      className="px-4 py-2 bg-[#0056a4] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Adicionar Primeiro Anúncio
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {targetAds.map((ad, idx) => {
                      const isActive = ad.active && ad.status !== 'paused';
                      return (
                        <div
                          key={ad.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isActive 
                              ? 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs' 
                              : 'bg-gray-50/70 border-gray-200 opacity-60'
                          }`}
                        >
                          {/* Reordenação e Thumbnail */}
                          <div className="flex items-center gap-3">
                            {/* Botões Subir / Descer */}
                            <div className="flex flex-col gap-1 items-center">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveOrder(ad, 'up')}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed text-gray-600"
                                title="Subir posição no carrossel"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] font-mono font-black text-gray-500">
                                #{ad.displayOrder || idx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={idx === targetAds.length - 1}
                                onClick={() => handleMoveOrder(ad, 'down')}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed text-gray-600"
                                title="Descer posição no carrossel"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Miniatura da Mídia */}
                            <div 
                              className={`w-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center ${
                                ad.adFormat === '300x900' ? 'h-24' : 'h-14'
                              }`}
                            >
                              {ad.mediaType === 'video' ? (
                                <video src={ad.mediaUrl} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
                              )}
                            </div>

                            {/* Dados do Patrocinador */}
                            <div className="space-y-0.5 max-w-[240px]">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-black text-xs text-gray-900 truncate">
                                  {ad.sponsorName}
                                </h4>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {isActive ? 'Ativo' : 'Pausado'}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-50 text-[#0056a4]">
                                  {(ad.adFormat || currentActiveFormat).replace('x', '×')}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 truncate">{ad.title}</p>
                              <a
                                href={ad.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-[#0056a4] hover:underline flex items-center gap-1 truncate"
                              >
                                <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
                                {ad.linkUrl}
                              </a>
                              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono pt-0.5">
                                <span>👁 {ad.impressionsCount || 0} views</span>
                                <span>👆 {ad.clicksCount || 0} cliques</span>
                              </div>
                            </div>
                          </div>

                          {/* Ações: Ativar/Desativar, Editar, Excluir */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ad)}
                              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                                isActive
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={isActive ? 'Pausar anúncio' : 'Ativar anúncio'}
                            >
                              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditForm(ad)}
                              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer border border-gray-200"
                              title="Editar anúncio"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setAdToDelete(ad)}
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer border border-red-200"
                              title="Excluir anúncio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: PRÉVIA AO VIVO COM DIMENSÕES REAIS (5 Colunas) */}
              <div className="lg:col-span-5 bg-gray-50/70 p-5 rounded-2xl border border-gray-200 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#0056a4]" />
                    <span className="text-xs font-black uppercase text-gray-800 tracking-wider">
                      Prévia do Carrossel ({currentActiveFormat.replace('x', ' × ')} px)
                    </span>
                  </div>

                  {/* Alternador Desktop / Mobile */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded transition-all cursor-pointer ${
                        previewDevice === 'desktop' ? 'bg-[#0056a4] text-white' : 'text-gray-500 hover:text-gray-800'
                      }`}
                      title="Visualização em Computador (Desktop)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded transition-all cursor-pointer ${
                        previewDevice === 'mobile' ? 'bg-[#0056a4] text-white' : 'text-gray-500 hover:text-gray-800'
                      }`}
                      title="Visualização em Celular (Mobile)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 mb-3 text-center">
                  Alternando automaticamente a cada <strong className="text-gray-700 font-bold">{currentDurationSeconds}s</strong>
                </div>

                {/* Container com Dimensões Exatas */}
                <div 
                  className={`transition-all bg-white p-3 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center overflow-hidden ${
                    previewDevice === 'mobile' ? 'max-w-[340px] w-full' : 'w-full'
                  }`}
                >
                  <AdSlot
                    format={currentActiveFormat}
                    placement={currentSpaceDef.placement}
                    ads={targetAds}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {adToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-base uppercase tracking-tight text-gray-900">
                Confirmar Exclusão do Anúncio
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Deseja realmente remover o anúncio <strong>"{adToDelete.sponsorName} — {adToDelete.title}"</strong> do portal? Os demais slides do carrossel serão automaticamente reordenados.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAd}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
