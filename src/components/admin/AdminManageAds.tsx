import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, Plus, Trash2, Edit2, Play, Pause, ExternalLink, 
  Upload, Eye, CheckCircle2, AlertCircle, Info, Layout, 
  Layers, Sparkles, Image as ImageIcon, Calendar, X,
  ArrowUp, ArrowDown, Clock, ShieldCheck, Monitor, Smartphone, RefreshCw
} from 'lucide-react';
import { AdItem, AdPlacement, AdStatus, PlacementSetting, PlacementMode } from '../../types/database';
import { adsService } from '../../lib/supabase';
import { AdSlot } from '../news/AdSlot';

interface AdminManageAdsProps {
  ads: AdItem[];
  onRefreshData: () => void;
}

// Configuração rica das 5 posições visuais do portal
interface PlacementMeta {
  key: AdPlacement;
  title: string;
  recommendedDims: string;
  aspectRatio: string;
  description: string;
  visualTag: string;
}

const PLACEMENT_CONFIGS: PlacementMeta[] = [
  {
    key: 'header',
    title: 'Banner Superior (Topo do Portal)',
    recommendedDims: '728 x 90 px ou 970 x 90 px',
    aspectRatio: '728 / 90',
    description: 'Exibido no cabeçalho em todas as páginas, ao lado do logotipo e das manchetes de última hora.',
    visualTag: 'ÁREA DO TOPO'
  },
  {
    key: 'feed',
    title: 'Barra entre as Notícias (Meio da Capa)',
    recommendedDims: '728 x 90 px ou 970 x 120 px',
    aspectRatio: '728 / 90',
    description: 'Exibido no centro da página inicial, entre a manchete principal e o feed de últimas notícias.',
    visualTag: 'ENTRE NOTÍCIAS'
  },
  {
    key: 'sidebar',
    title: 'Coluna Lateral Direita (Sidebar)',
    recommendedDims: '300 x 250 px ou 300 x 600 px',
    aspectRatio: '1 / 1',
    description: 'Exibido na barra lateral direita ao lado das notícias mais lidas e previsão do tempo.',
    visualTag: 'COLUNA LATERAL'
  },
  {
    key: 'article',
    title: 'Área Dentro da Notícia (Artigo)',
    recommendedDims: '300 x 250 px',
    aspectRatio: '1 / 1',
    description: 'Exibido dentro da matéria jornalística para alcançar o leitor durante a leitura do texto.',
    visualTag: 'DENTRO DA NOTÍCIA'
  },
  {
    key: 'footer',
    title: 'Área Inferior da Página (Rodapé)',
    recommendedDims: '728 x 90 px ou 970 x 90 px',
    aspectRatio: '728 / 90',
    description: 'Exibido na base do portal antes das informações institucionais e direitos autorais.',
    visualTag: 'RODAPÉ'
  }
];

export const AdminManageAds: React.FC<AdminManageAdsProps> = ({ ads, onRefreshData }) => {
  const [activeView, setActiveView] = useState<'list' | 'create'>('list');
  const [selectedPlacementFilter, setSelectedPlacementFilter] = useState<AdPlacement | 'all'>('all');
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);

  // Configurações dos 5 espaços (modo fixo vs carrossel)
  const [placementSettings, setPlacementSettings] = useState<Record<AdPlacement, PlacementSetting>>(() => 
    adsService.getPlacementSettings()
  );

  // Modal de prévia interativa ao vivo
  const [previewPlacement, setPreviewPlacement] = useState<AdPlacement | null>(null);

  // Campos do formulário de anúncio
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

  // Sincroniza configurações dos espaços
  const reloadPlacementSettings = () => {
    setPlacementSettings(adsService.getPlacementSettings());
  };

  useEffect(() => {
    reloadPlacementSettings();
  }, []);

  // Anúncios filtrados pelo espaço selecionado
  const filteredAds = selectedPlacementFilter === 'all' 
    ? ads 
    : ads.filter(a => a.placement === selectedPlacementFilter);

  // Contagem de anúncios por espaço para validação da regra de até 3
  const getAdsCountByPlacement = (p: AdPlacement): number => {
    return ads.filter(a => a.placement === p).length;
  };

  const openCreateForm = (preferredPlacement?: AdPlacement) => {
    const targetPlacement = preferredPlacement || (selectedPlacementFilter !== 'all' ? selectedPlacementFilter : 'header');
    const currentCount = getAdsCountByPlacement(targetPlacement);

    if (currentCount >= 3) {
      setError(`O espaço ${PLACEMENT_CONFIGS.find(cfg => cfg.key === targetPlacement)?.title} já atingiu o limite máximo de 3 anúncios. Para adicionar um novo patrocinador, edite ou exclua um anúncio existente.`);
      return;
    }

    setEditingAd(null);
    setTitle('');
    setSponsorName('');
    setCampaignName('');
    setMediaUrl('');
    setMediaType('image');
    setLinkUrl('');
    setAltText('');
    setPlacement(targetPlacement);
    setStatus('active');
    setDisplayOrder(Math.min(3, currentCount + 1));
    setDurationSeconds(5);
    setOpenInNewTab(true);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setError(null);
    setSuccessNotice(null);
    setActiveView('create');
  };

  const openEditForm = (ad: AdItem) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setSponsorName(ad.sponsorName);
    setCampaignName(ad.campaignName || '');
    setMediaUrl(ad.mediaUrl);
    setMediaType(ad.mediaType);
    setLinkUrl(ad.linkUrl);
    setAltText(ad.altText || '');
    setPlacement(ad.placement);
    setStatus(ad.status || (ad.active ? 'active' : 'paused'));
    setDisplayOrder(ad.displayOrder || 1);
    setDurationSeconds(ad.durationSeconds || 5);
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
      setError('Faça o envio da arte publicitária ou informe o link da imagem.');
      return;
    }

    // Validação estrita da regra de no máximo 3 anúncios por espaço
    const adsInTargetPlacement = ads.filter(a => a.placement === placement && a.id !== editingAd?.id);
    if (adsInTargetPlacement.length >= 3) {
      setError(`Limite de 3 anúncios atingido para este espaço (${PLACEMENT_CONFIGS.find(c => c.key === placement)?.title}). Para cadastrar outro, edite ou remova um anúncio existente.`);
      return;
    }

    const currentMeta = PLACEMENT_CONFIGS.find(p => p.key === placement)!;

    setLoading(true);
    try {
      await adsService.saveAd({
        id: editingAd?.id,
        title: title.trim(),
        sponsorName: sponsorName.trim(),
        campaignName: campaignName.trim() || undefined,
        mediaUrl: mediaUrl.trim(),
        mediaType,
        linkUrl: linkUrl.trim() || 'https://folhadaregiaonline.com.br/institucional/anuncie-conosco',
        altText: altText.trim() || `${sponsorName.trim()} - ${title.trim()}`,
        placement,
        aspectRatio: currentMeta.aspectRatio,
        maxWidth: placement === 'sidebar' || placement === 'article' ? 320 : undefined,
        active: status === 'active',
        status,
        displayOrder: Number(displayOrder) || 1,
        durationSeconds: Math.max(2, Math.min(60, Number(durationSeconds) || 5)),
        openInNewTab,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      setSuccessNotice('Publicidade salva com sucesso no portal!');
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

  const handleToggleStatus = async (ad: AdItem) => {
    const nextStatus: AdStatus = ad.status === 'active' ? 'paused' : 'active';
    await adsService.saveAd({
      ...ad,
      status: nextStatus,
      active: nextStatus === 'active'
    });
    onRefreshData();
  };

  const handleDeleteAd = async () => {
    if (!adToDelete) return;
    await adsService.deleteAd(adToDelete.id);
    setAdToDelete(null);
    onRefreshData();
  };

  // Reordenar anúncio no carrossel (subir / descer)
  const handleMoveOrder = async (ad: AdItem, direction: 'up' | 'down') => {
    const placementAds = ads
      .filter(a => a.placement === ad.placement)
      .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));

    const currentIndex = placementAds.findIndex(a => a.id === ad.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= placementAds.length) return;

    // Inverte posições no array
    const reordered = [...placementAds];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    await adsService.reorderAds(ad.placement, reordered.map(a => a.id));
    onRefreshData();
  };

  // Atualizar modalidade do espaço (Fixo vs Carrossel)
  const handleTogglePlacementMode = async (p: AdPlacement, nextMode: PlacementMode) => {
    await adsService.savePlacementSetting(p, { mode: nextMode });
    reloadPlacementSettings();
    onRefreshData();
  };

  // Pausar ou retomar rotação do carrossel do espaço
  const handleTogglePlacementPause = async (p: AdPlacement) => {
    const current = placementSettings[p];
    await adsService.savePlacementSetting(p, { isPaused: !current.isPaused });
    reloadPlacementSettings();
    onRefreshData();
  };

  // Atualizar duração padrão do espaço
  const handleUpdatePlacementDuration = async (p: AdPlacement, seconds: number) => {
    await adsService.savePlacementSetting(p, { defaultDurationSeconds: seconds });
    reloadPlacementSettings();
    onRefreshData();
  };

  const selectedMeta = PLACEMENT_CONFIGS.find(p => p.key === placement)!;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barra de Topo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              Gerenciamento de Publicidade
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056a4] text-[10px] font-black uppercase tracking-wider border border-blue-100">
              Carrossel até 3 anúncios por espaço
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure rotação em slides, tempos individuais, patrocinadores e ordem de veiculação em cada espaço do portal.
          </p>
        </div>

        {activeView === 'list' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateForm()}
              className="px-5 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar Publicidade
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Voltar ao Gerenciamento
          </button>
        )}
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

          {successNotice && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span className="font-bold">{successNotice}</span>
            </div>
          )}

          {/* PARTE A: POSICIONAMENTO VISUAL NO PORTAL */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-base text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Layout className="w-5 h-5 text-[#0056a4]" />
                  1. Espaço Publicitário de Veiculação
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cada espaço suporta até 3 patrocinadores com rotação automática em carrossel.
                </p>
              </div>

              {/* Status do limite no espaço selecionado */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  getAdsCountByPlacement(placement) >= 3 && (!editingAd || editingAd.placement !== placement)
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {getAdsCountByPlacement(placement)} de 3 anúncios no espaço
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Opções com Botões e Descrições (7 Colunas) */}
              <div className="lg:col-span-7 space-y-3">
                <span className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
                  Selecione o local de exibição:
                </span>

                <div className="space-y-2.5">
                  {PLACEMENT_CONFIGS.map((cfg) => {
                    const isSelected = placement === cfg.key;
                    const countInThis = getAdsCountByPlacement(cfg.key);
                    const isFull = countInThis >= 3 && (!editingAd || editingAd.placement !== cfg.key);

                    return (
                      <div
                        key={cfg.key}
                        onClick={() => {
                          if (!isFull) {
                            setPlacement(cfg.key);
                            setError(null);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'border-[#0056a4] bg-blue-50/50 shadow-sm'
                            : isFull 
                            ? 'border-gray-200 bg-gray-50/70 opacity-70 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#0056a4] bg-[#0056a4]' : 'border-gray-400'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                            </span>
                            <span className="font-black text-xs uppercase text-gray-900">
                              {cfg.title}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 pl-5 leading-relaxed">
                            {cfg.description}
                          </p>
                          <div className="pl-5 pt-1 flex items-center gap-2 text-[11px] text-[#0056a4] font-bold">
                            <span>Dimensões:</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-blue-200">{cfg.recommendedDims}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded block ${
                            isSelected ? 'bg-[#0056a4] text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {cfg.visualTag}
                          </span>
                          <span className={`text-[10px] font-bold block ${
                            countInThis >= 3 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {countInThis}/3 anúncios
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MAQUETE ILUSTRADA DO PORTAL (5 Colunas) */}
              <div className="lg:col-span-5 bg-gray-900 p-5 rounded-2xl border border-gray-800 text-white space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Maquete Interativa do Portal
                  </span>
                  <span className="text-[10px] text-gray-400">Área selecionada em destaque</span>
                </div>

                {/* Diagrama Esquemático da Página */}
                <div className="bg-gray-800/90 p-3 rounded-xl border border-gray-700 space-y-2.5 text-[10px]">
                  <div className="h-3 bg-gray-700/80 rounded flex items-center px-2 text-[8px] text-gray-400">
                    Cabeçalho / Logotipo Folha da Região
                  </div>

                  {/* 1. SLOT TOPO */}
                  <div
                    onClick={() => setPlacement('header')}
                    className={`p-2.5 rounded-lg border-2 text-center font-black transition-all cursor-pointer ${
                      placement === 'header'
                        ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 ring-2 ring-emerald-400/50 animate-pulse'
                        : 'border-dashed border-gray-600 bg-gray-750 hover:border-gray-500 text-gray-400'
                    }`}
                  >
                    ★ BANNER SUPERIOR (TOPO) {placement === 'header' && '• [SELECIONADO]'}
                  </div>

                  {/* Corpo da página com 2 colunas */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Coluna Principal da Notícia (2/3) */}
                    <div className="col-span-2 space-y-2">
                      <div className="h-14 bg-gray-700/70 rounded p-2 text-gray-400">
                        Manchete Principal
                      </div>

                      {/* 2. SLOT ENTRE NOTÍCIAS */}
                      <div
                        onClick={() => setPlacement('feed')}
                        className={`p-2 rounded border-2 text-center font-black transition-all cursor-pointer ${
                          placement === 'feed'
                            ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 ring-2 ring-emerald-400/50 animate-pulse'
                            : 'border-dashed border-gray-600 bg-gray-750 hover:border-gray-500 text-gray-400'
                        }`}
                      >
                        BARRA ENTRE NOTÍCIAS (FEED)
                      </div>

                      {/* 4. SLOT DENTRO DA NOTÍCIA */}
                      <div
                        onClick={() => setPlacement('article')}
                        className={`p-2 rounded border-2 text-center font-black transition-all cursor-pointer ${
                          placement === 'article'
                            ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 ring-2 ring-emerald-400/50 animate-pulse'
                            : 'border-dashed border-gray-600 bg-gray-750 hover:border-gray-500 text-gray-400'
                        }`}
                      >
                        DENTRO DA NOTÍCIA (ARTIGO)
                      </div>
                    </div>

                    {/* Coluna Lateral Direita (1/3) */}
                    <div className="space-y-2">
                      {/* 3. SLOT LATERAL */}
                      <div
                        onClick={() => setPlacement('sidebar')}
                        className={`h-28 p-2 rounded border-2 flex flex-col items-center justify-center text-center font-black transition-all cursor-pointer ${
                          placement === 'sidebar'
                            ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 ring-2 ring-emerald-400/50 animate-pulse'
                            : 'border-dashed border-gray-600 bg-gray-750 hover:border-gray-500 text-gray-400'
                        }`}
                      >
                        COLUNA LATERAL (SIDEBAR)
                      </div>
                    </div>
                  </div>

                  {/* 5. SLOT RODAPÉ */}
                  <div
                    onClick={() => setPlacement('footer')}
                    className={`p-2.5 rounded-lg border-2 text-center font-black transition-all cursor-pointer ${
                      placement === 'footer'
                        ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 ring-2 ring-emerald-400/50 animate-pulse'
                        : 'border-dashed border-gray-600 bg-gray-750 hover:border-gray-500 text-gray-400'
                    }`}
                  >
                    ★ ÁREA INFERIOR (RODAPÉ) {placement === 'footer' && '• [SELECIONADO]'}
                  </div>
                </div>

                <div className="p-3 bg-gray-800 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-gray-200">
                    Posição: <span className="text-emerald-400 font-black">{selectedMeta.title}</span>
                  </p>
                  <p className="text-gray-400 text-[11px]">
                    Proporção: {selectedMeta.recommendedDims}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PARTE B: DADOS DA CAMPANHA E CONFIGURAÇÃO DO SLIDE */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#0056a4]" />
                2. Informações do Patrocinador e Configuração do Slide
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Nome do Patrocinador / Anunciante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Ex: Lizart Comunicação Visual, Banese Card, Vidraçaria Manancial"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Título Interno / Identificação Administrativa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Campanha de Matrículas 2026 - Slide 1"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Identificação da Campanha (Opcional)
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Varejo Regional, Institucional Topo"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Posição na Sequência do Carrossel
                </label>
                <select
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none cursor-pointer font-bold"
                >
                  <option value={1}>1º Anúncio da sequência</option>
                  <option value={2}>2º Anúncio da sequência</option>
                  <option value={3}>3º Anúncio da sequência</option>
                </select>
              </div>

              {/* Duração individual do slide em segundos */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Duração do Slide (Segundos)
                </label>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    {[3, 5, 8, 10, 15].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setDurationSeconds(sec)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer border ${
                          durationSeconds === sec
                            ? 'bg-[#0056a4] text-white border-[#0056a4]'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Math.max(2, Math.min(60, Number(e.target.value) || 5)))}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] outline-none text-center font-bold"
                    placeholder="Personalizado (2 a 60s)"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Link de Destino ao Clicar (URL / WhatsApp)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://anunciante.com.br ou https://wa.me/..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openInNewTab}
                    onChange={(e) => setOpenInNewTab(e.target.checked)}
                    className="rounded text-[#0056a4] focus:ring-[#0056a4]"
                  />
                  <span className="text-xs text-gray-600 font-medium">Abrir link em nova aba do navegador</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Texto Alternativo da Imagem (Acessibilidade)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Ex: Peça publicitária Lizart Comunicação Visual com telefones e ofertas"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Descrição lida por leitores de tela para pessoas com deficiência visual.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Data de Início da Campanha (Vigência)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Data de Término da Campanha (Opcional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Upload e Prévia da Peça Publicitária */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider">
                Upload da Imagem ou Peça Publicitária <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  id="ad-file-upload"
                />
                <label
                  htmlFor="ad-file-upload"
                  className="px-5 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Enviar Imagem do Computador
                </label>

                {mediaUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Remover Imagem
                  </button>
                )}
              </div>

              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Ou informe a URL direta da imagem (https://...)"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
              />

              {/* Prévia da Peça */}
              {mediaUrl && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-700 block">
                    Prévia da Peça Publicitária na Proporção ({selectedMeta.recommendedDims}):
                  </span>
                  <div className="max-w-md overflow-hidden rounded-xl bg-white border border-gray-300 shadow-sm p-2">
                    {mediaType === 'video' ? (
                      <video
                        src={mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-auto object-cover rounded"
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={title || 'Prévia'}
                        className="w-full h-auto object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Situação da Publicidade */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
                Situação do Anúncio:
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    status === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Ativo (Participa da Rotação)
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('paused')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    status === 'paused'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pausado (Oculto Temporariamente)
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('ended')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    status === 'ended'
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  Encerrado (Campanha Finalizada)
                </button>
              </div>
            </div>
          </div>

          {/* Botões de Ação do Formulário */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveView('list')}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Salvar Publicidade
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          VISÃO 2: GERENCIAMENTO DE CARROSSÉIS E LISTA
      ======================================================== */}
      {activeView === 'list' && (
        <div className="space-y-6">
          {/* Navegação por Abas dos 5 Espaços Publicitários */}
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedPlacementFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                selectedPlacementFilter === 'all'
                  ? 'bg-[#0056a4] text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Todos os Espaços ({ads.length})
            </button>

            {PLACEMENT_CONFIGS.map((p) => {
              const count = getAdsCountByPlacement(p.key);
              const isSelected = selectedPlacementFilter === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlacementFilter(p.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#0056a4] text-white shadow-sm font-black'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>{p.title.split('(')[0].trim()}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white/20 text-white' : count >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}/3
                  </span>
                </button>
              );
            })}
          </div>

          {/* PAINEL DE CONTROLE DE CADA ESPAÇO PUBLICITÁRIO */}
          {PLACEMENT_CONFIGS.filter(cfg => selectedPlacementFilter === 'all' || selectedPlacementFilter === cfg.key).map((cfg) => {
            const placementAds = ads
              .filter(a => a.placement === cfg.key)
              .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
            
            const settings = placementSettings[cfg.key] || { placement: cfg.key, mode: 'carousel', isPaused: false, defaultDurationSeconds: 5 };
            const isFull = placementAds.length >= 3;

            return (
              <div key={cfg.key} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden space-y-4 p-5 md:p-6">
                {/* Cabeçalho do Espaço */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0056a4]"></span>
                      <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                        {cfg.title}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
                        {cfg.recommendedDims}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {cfg.description}
                    </p>
                  </div>

                  {/* Configurações de Rotação do Espaço */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Modo Fixo vs Carrossel */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleTogglePlacementMode(cfg.key, 'fixed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          settings.mode === 'fixed'
                            ? 'bg-white text-gray-900 shadow-xs font-black'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Exibe apenas um anúncio fixo no espaço"
                      >
                        Exibição Fixa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePlacementMode(cfg.key, 'carousel')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          settings.mode === 'carousel'
                            ? 'bg-[#0056a4] text-white shadow-xs font-black'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Rotaciona até 3 anúncios automaticamente em slides"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Carrossel Automático
                      </button>
                    </div>

                    {/* Pausar / Retomar Carrossel */}
                    {settings.mode === 'carousel' && (
                      <button
                        type="button"
                        onClick={() => handleTogglePlacementPause(cfg.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          settings.isPaused
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                        title={settings.isPaused ? 'Retomar rotação automática dos slides' : 'Pausar rotação automática dos slides'}
                      >
                        {settings.isPaused ? (
                          <>
                            <Play className="w-3.5 h-3.5 text-amber-600" />
                            Retomar Carrossel
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5 text-gray-600" />
                            Pausar Carrossel
                          </>
                        )}
                      </button>
                    )}

                    {/* Botão de Prévia ao Vivo */}
                    <button
                      type="button"
                      onClick={() => setPreviewPlacement(cfg.key)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0056a4] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200"
                      title="Testar prévia interativa do carrossel"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar Prévia
                    </button>

                    {/* Botão Adicionar Anúncio ao Espaço */}
                    <button
                      type="button"
                      disabled={isFull}
                      onClick={() => openCreateForm(cfg.key)}
                      className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                        isFull
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          : 'bg-[#0056a4] hover:bg-[#004482] text-white'
                      }`}
                      title={isFull ? 'Limite máximo de 3 anúncios atingido para este espaço' : 'Adicionar anúncio neste espaço'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Anúncio
                    </button>
                  </div>
                </div>

                {/* Banner de aviso quando o espaço atingir 3 anúncios */}
                {isFull && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold">
                        Limite de 3 anúncios atingido para este espaço.
                      </span>
                      <span className="hidden md:inline text-amber-700">
                        Para adicionar um novo patrocinador, edite ou remova um dos anúncios existentes abaixo.
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black text-[10px] uppercase">
                      Capacidade Máxima (3/3)
                    </span>
                  </div>
                )}

                {/* Lista de Anúncios Cadastrados no Espaço */}
                {placementAds.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 space-y-2 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="text-xs font-bold text-gray-600">Nenhum anúncio veiculado neste espaço no momento.</p>
                    <p className="text-[11px] text-gray-400">Clique em "Adicionar Anúncio" acima para incluir até 3 patrocinadores com rotação em carrossel.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                          <th className="py-2.5 px-3">Ordem / Slide</th>
                          <th className="py-2.5 px-3">Peça Publicitária</th>
                          <th className="py-2.5 px-3">Patrocinador</th>
                          <th className="py-2.5 px-3">Tempo / Duração</th>
                          <th className="py-2.5 px-3">Vigência</th>
                          <th className="py-2.5 px-3">Métricas</th>
                          <th className="py-2.5 px-3">Situação</th>
                          <th className="py-2.5 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                        {placementAds.map((ad, index) => {
                          const isAdActive = ad.status === 'active' || (ad.status === undefined && ad.active);
                          const isFirst = index === 0;
                          const isLast = index === placementAds.length - 1;

                          return (
                            <tr key={ad.id} className="hover:bg-gray-50/60 transition-colors">
                              {/* Ordem de Exibição com Controles de Subir/Descer */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-6 h-6 rounded-lg bg-[#0056a4] text-white flex items-center justify-center font-black text-xs">
                                    {ad.displayOrder || index + 1}º
                                  </span>
                                  {placementAds.length > 1 && (
                                    <div className="flex flex-col">
                                      <button
                                        type="button"
                                        disabled={isFirst}
                                        onClick={() => handleMoveOrder(ad, 'up')}
                                        className={`p-0.5 rounded transition-colors ${
                                          isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200 cursor-pointer'
                                        }`}
                                        title="Mover slide para cima"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLast}
                                        onClick={() => handleMoveOrder(ad, 'down')}
                                        className={`p-0.5 rounded transition-colors ${
                                          isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200 cursor-pointer'
                                        }`}
                                        title="Mover slide para baixo"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Peça Publicitária */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-16 h-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    {ad.mediaType === 'video' ? (
                                      <video
                                        src={ad.mediaUrl}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <img
                                        src={ad.mediaUrl}
                                        alt={ad.altText || ad.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 leading-snug">{ad.title}</p>
                                    {ad.campaignName && (
                                      <span className="text-[10px] text-gray-400 block font-medium">
                                        Campanha: {ad.campaignName}
                                      </span>
                                    )}
                                    {ad.linkUrl && (
                                      <a
                                        href={ad.linkUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-[#0056a4] hover:underline flex items-center gap-1 mt-0.5"
                                      >
                                        Link de destino <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Patrocinador */}
                              <td className="py-3 px-3 font-bold text-gray-800 whitespace-nowrap">
                                {ad.sponsorName}
                              </td>

                              {/* Duração individual do slide */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200">
                                  <Clock className="w-3 h-3 text-[#0056a4]" />
                                  {ad.durationSeconds || 5}s
                                </span>
                              </td>

                              {/* Vigência / Datas */}
                              <td className="py-3 px-3 whitespace-nowrap text-[11px] text-gray-500">
                                {ad.startDate ? (
                                  <div>
                                    <span>Início: {new Date(ad.startDate).toLocaleDateString('pt-BR')}</span>
                                    {ad.endDate && (
                                      <span className="block text-gray-400">Fim: {new Date(ad.endDate).toLocaleDateString('pt-BR')}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Permanente</span>
                                )}
                              </td>

                              {/* Métricas (Impressões e Cliques) */}
                              <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                                <span className="block font-bold text-gray-700">
                                  {ad.impressionsCount || 0} visualizações
                                </span>
                                <span className="block text-gray-400 text-[10px]">
                                  {ad.clicksCount || 0} cliques
                                </span>
                              </td>

                              {/* Situação */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {isAdActive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Pausado
                                  </span>
                                )}
                              </td>

                              {/* Ações */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleToggleStatus(ad)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      isAdActive 
                                        ? 'text-amber-600 hover:bg-amber-50' 
                                        : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                    title={isAdActive ? 'Pausar Anúncio' : 'Ativar Anúncio'}
                                  >
                                    {isAdActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                  </button>

                                  <button
                                    onClick={() => openEditForm(ad)}
                                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Editar Anúncio"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => setAdToDelete(ad)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Excluir Anúncio"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE PRÉVIA INTERATIVA DO CARROSSEL */}
      {previewPlacement && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-gray-900 tracking-tight flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#0056a4]" />
                  Prévia Interativa do Carrossel em Tempo Real
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {PLACEMENT_CONFIGS.find(cfg => cfg.key === previewPlacement)?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPlacement(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <span className="text-[11px] font-bold text-gray-500 block uppercase tracking-wider">
                Comportamento real dos slides com transições e tempos configurados:
              </span>
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs flex items-center justify-center">
                <div className="w-full">
                  <AdSlot placement={previewPlacement} />
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 space-y-1 bg-blue-50/70 p-3 rounded-xl border border-blue-100">
              <p className="font-bold text-[#0056a4]">Recursos automáticos ativos:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-600">
                <li>Rotação automática respeitando os segundos de cada slide</li>
                <li>Pausa automática ao passar o mouse por cima (hover) ou focar com teclado</li>
                <li>Navegação por setas e indicadores de pontos inferiores</li>
                <li>Transição discreta e sem salto de layout na tela</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewPlacement(null)}
                className="px-5 py-2.5 bg-[#0056a4] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {adToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="text-center">
              <h3 className="text-base font-black uppercase text-gray-900 tracking-tight">
                Remover Peça Publicitária
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Tem certeza que deseja remover o anúncio:
              </p>
              <p className="text-xs font-bold text-gray-800 mt-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                "{adToDelete.title}" ({adToDelete.sponsorName})
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAd}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
