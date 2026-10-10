import React, { useState } from 'react';
import { 
  ArrowLeft, Plus, Edit2, Trash2, Eye, Shield, Database, Github, 
  Check, Copy, Sparkles, AlertCircle, RefreshCw, Layers, Radio, Users, 
  FileText, ExternalLink, Play, Bell, Tag
} from 'lucide-react';
import { Article, AdItem, UserProfile } from '../../types/database';
import { newsService, adsService, getSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured, notificationsService } from '../../lib/supabase';
import { INITIAL_CATEGORIES } from '../../data/initialData';
import { AdminClassifiedsTab } from './AdminClassifiedsTab';

interface AdminDashboardProps {
  currentUser: UserProfile;
  articles: Article[];
  ads: AdItem[];
  onRefreshData: () => void;
  onBackToPortal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  articles,
  ads,
  onRefreshData,
  onBackToPortal
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'ads' | 'classifieds' | 'supabase_github'>('overview');
  
  // Estado para modal de notícia
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    subtitle: '',
    category: 'Política',
    imageUrl: '',
    videoUrl: '',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    author: currentUser.fullName,
    content: ''
  });

  // Estado para modal de anúncio
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    sponsorName: '',
    linkUrl: '',
    mediaUrl: '',
    mediaType: 'gif' as 'image' | 'video' | 'gif',
    placement: 'sidebar' as 'header' | 'sidebar' | 'feed',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true
  });

  // Configurações do Supabase
  const currentConfig = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(currentConfig.url);
  const [sbKey, setSbKey] = useState(currentConfig.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);

  // Cálculos de Métricas
  const totalViews = articles.reduce((acc, a) => acc + (a.viewsCount || 0), 0);

  const openNewArticleModal = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      subtitle: '',
      category: 'Política',
      imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&h=600&fit=crop',
      videoUrl: '',
      isVideo: false,
      isHero: false,
      isSecondary: false,
      author: currentUser.fullName,
      content: '<p>Digite aqui os parágrafos completos da matéria jornalística...</p>'
    });
    setIsArticleModalOpen(true);
  };

  const openEditArticleModal = (art: Article) => {
    setEditingArticle(art);
    setArticleForm({
      title: art.title,
      subtitle: art.subtitle || '',
      category: art.category,
      imageUrl: art.imageUrl,
      videoUrl: art.videoUrl || '',
      isVideo: Boolean(art.isVideo),
      isHero: Boolean(art.isHero),
      isSecondary: Boolean(art.isSecondary),
      author: art.author,
      content: art.content
    });
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.title.trim()) return;

    await newsService.saveArticle({
      id: editingArticle?.id,
      title: articleForm.title,
      subtitle: articleForm.subtitle,
      slug: editingArticle?.slug || articleForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: articleForm.content,
      category: articleForm.category,
      imageUrl: articleForm.imageUrl,
      videoUrl: articleForm.videoUrl,
      isVideo: articleForm.isVideo || Boolean(articleForm.videoUrl),
      isHero: articleForm.isHero,
      isSecondary: articleForm.isSecondary,
      author: articleForm.author
    });

    setIsArticleModalOpen(false);
    onRefreshData();
  };

  const handleDeleteArticle = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta notícia?')) {
      await newsService.deleteArticle(id);
      onRefreshData();
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adForm.title.trim()) return;

    await adsService.saveAd(adForm);
    setIsAdModalOpen(false);
    onRefreshData();
  };

  const handleDeleteAd = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este anúncio?')) {
      await adsService.deleteAd(id);
      onRefreshData();
    }
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(sbUrl, sbKey);
  };

  const sqlCode = `-- SQL DO PORTAL FOLHA DA REGIÃO ONLINE
CREATE TABLE IF NOT EXISTS public.articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  video_url TEXT,
  is_video BOOLEAN DEFAULT false,
  is_hero BOOLEAN DEFAULT false,
  is_secondary BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  author TEXT DEFAULT 'Redação Folha da Região',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  article_id TEXT REFERENCES public.articles(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  article_title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  link_url TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT,
  placement TEXT,
  aspect_ratio TEXT DEFAULT '1 / 1',
  max_width INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de artigos" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Leitura pública de anúncios" ON public.ads FOR SELECT USING (active = true);
CREATE POLICY "Leitura de notificações por usuário" ON public.notifications FOR SELECT USING (auth.uid() = user_id);`;

  const gitCommands = `# 1. Inicialize o repositório git no seu projeto:
git init
git add .
git commit -m "feat: Portal de Notícias Folha da Região com Supabase e Auth"

# 2. Crie um repositório no seu GitHub e vincule:
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/folha-da-regiao-online.git
git push -u origin main`;

  const copyToClipboard = (text: string, type: 'sql' | 'git') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } else {
      setCopiedGit(true);
      setTimeout(() => setCopiedGit(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Topo do Painel */}
      <div className="bg-gray-900 text-white border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPortal}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Voltar ao Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white uppercase font-sans">
                  FOLHA DA REGIÃO
                </span>
                <span className="px-2 py-0.5 bg-[#0056a4] text-white text-[9px] font-black uppercase tracking-widest rounded">
                  PAINEL ADMIN
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                Logado como: <strong className="text-white">{currentUser.fullName}</strong> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              currentConfig.isConfigured 
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${currentConfig.isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              {currentConfig.isConfigured ? 'Supabase Conectado' : 'Modo Banco Local (Pronto para Supabase)'}
            </span>

            <button
              onClick={onBackToPortal}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#0056a4]" />
              Ver Portal ao Vivo
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="container mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#0056a4] text-white bg-gray-800/60'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'news'
                ? 'border-[#0056a4] text-white bg-gray-800/60'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notícias ({articles.length})
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ads'
                ? 'border-[#0056a4] text-white bg-gray-800/60'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Publicidades ({ads.length})
          </button>
          <button
            onClick={() => setActiveTab('classifieds')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'classifieds'
                ? 'border-[#0056a4] text-white bg-gray-800/60'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            Gerenciar Classificados
          </button>
          <button
            onClick={() => setActiveTab('supabase_github')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'supabase_github'
                ? 'border-[#0056a4] text-white bg-gray-800/60'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Supabase & GitHub
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Total de Notícias</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{articles.length}</p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ Cobertura ativa em Sergipe</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Visualizações Totais</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{totalViews}</p>
                <p className="text-[11px] text-gray-400 font-bold mt-1">Leitores em tempo real</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Anúncios / Parceiros</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{ads.length}</p>
                <p className="text-[11px] text-[#0056a4] font-bold mt-1">Banners topo, feed e sidebar</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Status do Banco</p>
                <p className="text-lg font-black text-gray-900 mt-2">
                  {currentConfig.isConfigured ? 'Supabase Cloud' : 'Storage Local'}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Pronto para migrar para Supabase</p>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">
                    Ações Rápidas do Editorial
                  </h3>
                  <p className="text-xs text-gray-500">Crie conteúdo ou gerencie publicidade do portal</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={openNewArticleModal}
                    className="px-4 py-2 bg-[#0056a4] hover:bg-[#004482] text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Notícia
                  </button>
                  <button
                    onClick={() => { setIsAdModalOpen(true); }}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Anúncio
                  </button>
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#0056a4] shrink-0 mt-0.5" />
                <div className="text-xs text-gray-700 leading-relaxed">
                  <strong className="text-gray-900 font-bold">Banco de dados preparado para Supabase:</strong> Você pode continuar editando notícias aqui. Todas as alterações persistem no seu navegador e podem ser enviadas diretamente para a sua instância do Supabase através da aba <strong>Supabase & GitHub</strong>.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GERENCIAR NOTÍCIAS */}
        {activeTab === 'news' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                  Matérias Jornalísticas ({articles.length})
                </h3>
                <p className="text-xs text-gray-500">Gerencie todas as publicações em tempo real</p>
              </div>

              <button
                onClick={openNewArticleModal}
                className="px-4 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Publicar Nova Notícia
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Imagem</th>
                      <th className="py-3 px-4">Título & Slug</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Destaque</th>
                      <th className="py-3 px-4">Visualizações</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {articles.map((art) => (
                      <tr key={art.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4 w-16">
                          <img
                            src={art.imageUrl}
                            alt={art.title}
                            className="w-14 h-10 object-cover rounded-md bg-gray-100"
                          />
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="font-bold text-gray-900 line-clamp-1">{art.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">/{art.slug}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#0056a4] font-bold rounded">
                            {art.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {art.isHero ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                              HERO PRINCIPAL
                            </span>
                          ) : art.isVideo ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[10px]">
                              VÍDEO
                            </span>
                          ) : (
                            <span className="text-gray-400">Padrão</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-700">
                          {art.viewsCount || 0}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={async () => {
                              await notificationsService.notifyUsersForArticle(art);
                              alert(`Notificação de "${art.title}" disparada para os leitores interessados na categoria ${art.category}!`);
                            }}
                            className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer"
                            title="Disparar Alerta para Leitores Interessados"
                          >
                            <Bell className="w-4 h-4 text-amber-500" />
                          </button>
                          <button
                            onClick={() => openEditArticleModal(art)}
                            className="p-1.5 text-gray-600 hover:text-[#0056a4] hover:bg-gray-100 rounded cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(art.id)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GERENCIAR PUBLICIDADES */}
        {activeTab === 'ads' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                  Espaços Publicitários ({ads.length})
                </h3>
                <p className="text-xs text-gray-500">Controle de banners, vídeos e anunciantes locais</p>
              </div>

              <button
                onClick={() => setIsAdModalOpen(true)}
                className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Novo Anunciante
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ads.map((ad) => (
                <div key={ad.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{ad.title}</h4>
                      <p className="text-xs text-gray-500">{ad.sponsorName}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">
                      {ad.placement}
                    </span>
                  </div>

                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    {ad.mediaType === 'video' ? (
                      <video src={ad.mediaUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100">
                    <span className="text-gray-400 text-[10px] font-bold uppercase">{ad.mediaType} • {ad.aspectRatio}</span>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: GERENCIAR CLASSIFICADOS */}
        {activeTab === 'classifieds' && (
          <AdminClassifiedsTab currentUser={currentUser} />
        )}

        {/* TAB 5: SUPABASE & GITHUB */}
        {activeTab === 'supabase_github' && (
          <div className="space-y-8 max-w-4xl animate-in fade-in">
            {/* Bloco 1: Conexão com o Supabase */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-emerald-500" />
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">
                    Conectar ao seu Supabase Oficial
                  </h3>
                  <p className="text-xs text-gray-500">
                    Insira as credenciais do seu projeto Supabase para habilitar banco PostgreSQL em nuvem e autenticação real.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSupabase} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Supabase Anon Public Key
                  </label>
                  <input
                    type="password"
                    value={sbKey}
                    onChange={(e) => setSbKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-500">
                    {currentConfig.isConfigured ? '🟢 Conectado e ativo' : '🟡 Usando armazenamento local seguro'}
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    Salvar e Conectar
                  </button>
                </div>
              </form>
            </div>

            {/* Bloco 2: Script SQL para rodar no Supabase */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Script SQL para criar as Tabelas no Supabase
                  </h3>
                  <p className="text-xs text-gray-500">
                    Copie e cole este código no <strong>SQL Editor</strong> do seu painel do Supabase.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(sqlCode, 'sql')}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedSql ? 'Copiado!' : 'Copiar SQL'}
                </button>
              </div>

              <pre className="bg-gray-900 text-gray-200 p-4 rounded-xl text-xs overflow-x-auto max-h-60 font-mono">
                {sqlCode}
              </pre>
            </div>

            {/* Bloco 3: Como enviar para o GitHub */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-gray-900" />
                  <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                    Comandos para enviar ao GitHub
                  </h3>
                </div>
                <button
                  onClick={() => copyToClipboard(gitCommands, 'git')}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedGit ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedGit ? 'Copiado!' : 'Copiar Comandos'}
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Execute estes comandos no terminal da sua máquina para sincronizar o projeto com seu repositório:
              </p>

              <pre className="bg-gray-900 text-gray-200 p-4 rounded-xl text-xs overflow-x-auto font-mono">
                {gitCommands}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAR/EDITAR NOTÍCIA */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-4">
              {editingArticle ? 'Editar Notícia' : 'Nova Notícia'}
            </h3>

            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Título da Notícia
                </label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  placeholder="Título atraente e informativo"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Subtítulo / Resumo
                </label>
                <input
                  type="text"
                  value={articleForm.subtitle}
                  onChange={(e) => setArticleForm({ ...articleForm, subtitle: e.target.value })}
                  placeholder="Breve resumo da matéria"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                  >
                    {INITIAL_CATEGORIES.filter(c => c.slug !== 'todos').map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Autor
                  </label>
                  <input
                    type="text"
                    value={articleForm.author}
                    onChange={(e) => setArticleForm({ ...articleForm, author: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  URL da Imagem de Capa
                </label>
                <input
                  type="url"
                  required
                  value={articleForm.imageUrl}
                  onChange={(e) => setArticleForm({ ...articleForm, imageUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>

              <div className="flex items-center gap-6 py-2 border-y border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={articleForm.isHero}
                    onChange={(e) => setArticleForm({ ...articleForm, isHero: e.target.checked })}
                    className="w-4 h-4 text-[#0056a4] rounded"
                  />
                  Destaque Hero Principal (Topo do Portal)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={articleForm.isVideo}
                    onChange={(e) => setArticleForm({ ...articleForm, isVideo: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  Matéria com Vídeo
                </label>
              </div>

              {articleForm.isVideo && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Link do Vídeo (YouTube)
                  </label>
                  <input
                    type="url"
                    value={articleForm.videoUrl}
                    onChange={(e) => setArticleForm({ ...articleForm, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Conteúdo da Notícia (HTML ou Texto com Parágrafos)
                </label>
                <textarea
                  rows={6}
                  required
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="<p>Texto do primeiro parágrafo...</p>"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-sans text-gray-900 outline-none focus:border-[#0056a4]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Salvar Notícia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO ANÚNCIO */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-4">
              Cadastrar Espaço Publicitário
            </h3>

            <form onSubmit={handleSaveAd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Título da Campanha
                </label>
                <input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                  placeholder="Ex: Super Promoção Outono"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome do Anunciante
                </label>
                <input
                  type="text"
                  required
                  value={adForm.sponsorName}
                  onChange={(e) => setAdForm({ ...adForm, sponsorName: e.target.value })}
                  placeholder="Ex: Vidraçaria Manancial"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Link de Redirecionamento (Instagram ou Site)
                </label>
                <input
                  type="url"
                  required
                  value={adForm.linkUrl}
                  onChange={(e) => setAdForm({ ...adForm, linkUrl: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  URL da Mídia (Vídeo mp4, GIF ou Imagem)
                </label>
                <input
                  type="url"
                  required
                  value={adForm.mediaUrl}
                  onChange={(e) => setAdForm({ ...adForm, mediaUrl: e.target.value })}
                  placeholder="https://.../video.mp4"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Tipo de Mídia
                  </label>
                  <select
                    value={adForm.mediaType}
                    onChange={(e) => setAdForm({ ...adForm, mediaType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                  >
                    <option value="gif">GIF Animado</option>
                    <option value="video">Vídeo MP4</option>
                    <option value="image">Imagem Estática</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Posição no Portal
                  </label>
                  <select
                    value={adForm.placement}
                    onChange={(e) => setAdForm({ ...adForm, placement: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none"
                  >
                    <option value="header">Topo (728x90)</option>
                    <option value="sidebar">Barra Lateral (300px)</option>
                    <option value="feed">Feed de Notícias</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gray-900 text-white rounded-lg text-xs font-black uppercase tracking-wider"
                >
                  Salvar Anúncio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
