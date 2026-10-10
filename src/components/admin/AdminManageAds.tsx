import React, { useState, useRef } from 'react';
import { 
  Radio, Plus, Trash2, Edit2, Play, Pause, ExternalLink, 
  Upload, Eye, CheckCircle2, AlertCircle, Info, Layout, 
  Layers, Sparkles, Image as ImageIcon, Calendar, X
} from 'lucide-react';
import { AdItem, AdPlacement, AdStatus } from '../../types/database';
import { adsService } from '../../lib/supabase';

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
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);

  // Campos do formulário
  const [title, setTitle] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif'>('image');
  const [linkUrl, setLinkUrl] = useState('');
  const [placement, setPlacement] = useState<AdPlacement>('header');
  const [status, setStatus] = useState<AdStatus>('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [adToDelete, setAdToDelete] = useState<AdItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreateForm = () => {
    setEditingAd(null);
    setTitle('');
    setSponsorName('');
    setMediaUrl('');
    setMediaType('image');
    setLinkUrl('');
    setPlacement('header');
    setStatus('active');
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
    setMediaUrl(ad.mediaUrl);
    setMediaType(ad.mediaType);
    setLinkUrl(ad.linkUrl);
    setPlacement(ad.placement);
    setStatus(ad.status || (ad.active ? 'active' : 'paused'));
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

    // Formatos aceitos: JPG, JPEG, PNG, GIF
    const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!valid.includes(file.type)) {
      setError('Formato não aceito. Selecione uma imagem JPG, JPEG, PNG ou GIF animado.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo excede o limite de 5MB. Por favor, otimize a peça publicitária.');
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
      setError('Informe o nome da campanha ou identificação interna.');
      return;
    }
    if (!sponsorName.trim()) {
      setError('Informe o nome do anunciante ou empresa parceira.');
      return;
    }
    if (!mediaUrl.trim()) {
      setError('Faça o envio da arte publicitária ou informe o link da imagem.');
      return;
    }

    const currentMeta = PLACEMENT_CONFIGS.find(p => p.key === placement)!;

    setLoading(true);
    try {
      await adsService.saveAd({
        id: editingAd?.id,
        title: title.trim(),
        sponsorName: sponsorName.trim(),
        mediaUrl: mediaUrl.trim(),
        mediaType,
        linkUrl: linkUrl.trim() || 'https://folhadaregiao.com.br',
        placement,
        aspectRatio: currentMeta.aspectRatio,
        maxWidth: placement === 'sidebar' || placement === 'article' ? 300 : undefined,
        active: status === 'active',
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      setSuccessNotice('Publicidade salva com sucesso no portal!');
      setTimeout(() => {
        onRefreshData();
        setActiveView('list');
      }, 1000);
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

  const selectedMeta = PLACEMENT_CONFIGS.find(p => p.key === placement)!;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barra de Topo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
            Gerenciamento de Publicidade
          </h2>
          <p className="text-xs text-gray-500">
            Controle campanhas comerciais e banners patrocinados com posicionamento visual.
          </p>
        </div>

        {activeView === 'list' ? (
          <button
            onClick={openCreateForm}
            className="px-5 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Publicidade
          </button>
        ) : (
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Voltar à Lista de Publicidades
          </button>
        )}
      </div>

      {/* ========================================================
          VISÃO 1: FORMULÁRIO DE INSERÇÃO COM POSICIONAMENTO VISUAL
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
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#0056a4]" />
                1. Seleção Visual do Local de Exibição
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Clique na maquete do portal ou selecione uma das opções abaixo para definir exatamente onde a publicidade aparecerá.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Opções com Botões e Descrições (7 Colunas) */}
              <div className="lg:col-span-7 space-y-3">
                <span className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
                  Espaços Publicitários Disponíveis no Portal:
                </span>

                <div className="space-y-2.5">
                  {PLACEMENT_CONFIGS.map((cfg) => {
                    const isSelected = placement === cfg.key;
                    return (
                      <div
                        key={cfg.key}
                        onClick={() => setPlacement(cfg.key)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'border-[#0056a4] bg-blue-50/50 shadow-sm'
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
                            <span>Dimensão recomendada:</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-blue-200">{cfg.recommendedDims}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded shrink-0 ${
                          isSelected ? 'bg-[#0056a4] text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {cfg.visualTag}
                        </span>
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
                  {/* Top Bar ilustrativa */}
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
                    Posição Selecionada: <span className="text-emerald-400 font-black">{selectedMeta.title}</span>
                  </p>
                  <p className="text-gray-400 text-[11px]">
                    Proporção: {selectedMeta.recommendedDims}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PARTE B: DADOS DA CAMPANHA E IMAGEM */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#0056a4]" />
                2. Informações da Campanha e Imagem da Peça
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Nome da Campanha ou Identificação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Campanha de Ofertas - Supermercado Central"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Nome do Anunciante / Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Ex: Auto Peças Estância"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Link de Destino (Site / WhatsApp)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://anunciante.com.br ou https://wa.me/..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                  Data Inicial da Campanha
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
                  Data Final (Opcional)
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
                    <img
                      src={mediaUrl}
                      alt={title || 'Prévia'}
                      className="w-full h-auto object-cover rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Situação da Publicidade */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
                Situação da Publicidade:
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
                  Ativa (Exibindo no Portal)
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
                  Pausada (Oculta Temporariamente)
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
                  Encerrada
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
          VISÃO 2: LISTA DE PUBLICIDADES CADASTRADAS
      ======================================================== */}
      {activeView === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {ads.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-3">
              <Radio className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-bold text-gray-600">Nenhum anúncio cadastrado ainda.</p>
              <button
                onClick={openCreateForm}
                className="mt-2 px-4 py-2 bg-[#0056a4] text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Cadastrar Primeira Publicidade
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                    <th className="py-3.5 px-4">Peça Publicitária</th>
                    <th className="py-3.5 px-4">Anunciante</th>
                    <th className="py-3.5 px-4">Posição no Portal</th>
                    <th className="py-3.5 px-4">Situação</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {ads.map((ad) => {
                    const meta = PLACEMENT_CONFIGS.find(p => p.key === ad.placement) || PLACEMENT_CONFIGS[0];
                    const isAdActive = ad.status === 'active' || (ad.status === undefined && ad.active);
                    return (
                      <tr key={ad.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={ad.mediaUrl}
                              alt={ad.title}
                              className="w-16 h-12 object-cover rounded-lg bg-gray-100 border border-gray-200"
                            />
                            <div>
                              <p className="font-bold text-gray-900 leading-snug">{ad.title}</p>
                              {ad.linkUrl && (
                                <a
                                  href={ad.linkUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-[#0056a4] hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  Ver Link <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-gray-800">
                          {ad.sponsorName}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 bg-blue-50 text-[#0056a4] font-black text-[10px] uppercase tracking-wide rounded-md border border-blue-100">
                            {meta.title}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isAdActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Pausada
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
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
