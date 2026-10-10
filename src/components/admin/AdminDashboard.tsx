import React, { useState } from 'react';
import { 
  ArrowLeft, LayoutDashboard, PlusCircle, FileText, 
  Radio, Tag, Users, Settings, Eye, CheckCircle2, 
  Clock, TrendingUp, Sparkles, AlertCircle, Newspaper, 
  Megaphone, ShoppingBag, Shield, ExternalLink, ChevronRight
} from 'lucide-react';
import { Article, AdItem, UserProfile } from '../../types/database';
import { AdminAddArticle } from './AdminAddArticle';
import { AdminManageArticles } from './AdminManageArticles';
import { AdminManageAds } from './AdminManageAds';
import { AdminClassifiedsTab } from './AdminClassifiedsTab';
import { AdminManageUsers } from './AdminManageUsers';
import { AdminSettings } from './AdminSettings';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AdminDashboardProps {
  currentUser: UserProfile;
  articles: Article[];
  ads: AdItem[];
  onRefreshData: () => void;
  onBackToPortal: () => void;
}

export type AdminTab = 
  | 'overview'             // Painel Inicial
  | 'add_article'          // Adicionar Notícia
  | 'manage_articles'      // Gerenciar Notícias
  | 'manage_ads'           // Publicidade
  | 'manage_classifieds'   // Classificados
  | 'manage_users'         // Gerenciar Usuários
  | 'settings';            // Configurações do Portal

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  articles,
  ads,
  onRefreshData,
  onBackToPortal
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Cálculos de Métricas
  const totalViews = articles.reduce((acc, a) => acc + (a.viewsCount || 0), 0);
  const publishedArticles = articles.filter(a => (a.status || 'published') === 'published').length;
  const draftArticles = articles.filter(a => a.status === 'draft').length;
  const activeAds = ads.filter(a => a.status === 'active' || (a.status === undefined && a.active)).length;

  const handleStartEditArticle = (art: Article) => {
    setEditingArticle(art);
    setActiveTab('add_article');
  };

  const handleStartNewArticle = () => {
    setEditingArticle(null);
    setActiveTab('add_article');
  };

  const handleArticleSaved = () => {
    setEditingArticle(null);
    onRefreshData();
    setActiveTab('manage_articles');
  };

  const handleCancelArticle = () => {
    setEditingArticle(null);
    setActiveTab('manage_articles');
  };

  const isConnected = isSupabaseConfigured();

  // Informações de cada aba para a barra de navegação e cabeçalho contextual
  const navTabs = [
    {
      id: 'overview' as AdminTab,
      label: 'Painel Inicial',
      icon: LayoutDashboard,
      color: 'text-blue-400',
      activeColor: 'bg-blue-600',
      badge: null,
      desc: 'Visão geral, resumo de audiência e atalhos operacionais rápidos.'
    },
    {
      id: 'add_article' as AdminTab,
      label: 'Adicionar Notícia',
      icon: PlusCircle,
      color: 'text-emerald-400',
      activeColor: 'bg-emerald-600',
      badge: 'NOVA',
      badgeColor: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50',
      desc: 'Formulário passo a passo em 3 etapas para criar e publicar novas matérias.'
    },
    {
      id: 'manage_articles' as AdminTab,
      label: 'Gerenciar Notícias',
      icon: Newspaper,
      color: 'text-sky-400',
      activeColor: 'bg-sky-600',
      badge: `${articles.length}`,
      badgeColor: 'bg-sky-500/20 text-sky-300',
      desc: 'Lista de matérias publicadas e rascunhos com busca, filtros, prévia e edição.'
    },
    {
      id: 'manage_ads' as AdminTab,
      label: 'Publicidade',
      icon: Megaphone,
      color: 'text-purple-400',
      activeColor: 'bg-purple-600',
      badge: `${activeAds} ativas`,
      badgeColor: 'bg-purple-500/20 text-purple-300',
      desc: 'Posicionamento visual de banners comerciais com maquete interativa do portal.'
    },
    {
      id: 'manage_classifieds' as AdminTab,
      label: 'Classificados',
      icon: ShoppingBag,
      color: 'text-amber-400',
      activeColor: 'bg-amber-600',
      badge: 'MÓDULO',
      badgeColor: 'bg-amber-500/20 text-amber-300',
      desc: 'Moderação de anúncios públicos, aprovações, recusas e tratamento de denúncias.'
    },
    {
      id: 'manage_users' as AdminTab,
      label: 'Gerenciar Usuários',
      icon: Users,
      color: 'text-cyan-400',
      activeColor: 'bg-cyan-600',
      badge: null,
      desc: 'Controle de anunciantes (Pessoa Física e Jurídica), papéis e suspensão de contas.'
    },
    {
      id: 'settings' as AdminTab,
      label: 'Configurações',
      icon: Settings,
      color: 'text-gray-300',
      activeColor: 'bg-gray-600',
      badge: null,
      desc: 'Regras de aprovação dos classificados, banco Supabase e dados institucionais.'
    }
  ];

  const currentTabMeta = navTabs.find(t => t.id === activeTab) || navTabs[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* =========================================================
          CABEÇALHO SUPERIOR DO PAINEL COM MARCA E NAVEGAÇÃO
      ========================================================= */}
      <header className="bg-gray-950 text-white border-b border-gray-800/80 sticky top-0 z-40 shadow-xl backdrop-blur-md">
        {/* Linha 1: Identidade, Usuário e Botão Ver Portal */}
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPortal}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm group"
              title="Voltar à Página Principal do Portal"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white uppercase font-sans">
                  FOLHA DA REGIÃO
                </span>
                <span className="px-2 py-0.5 bg-[#0056a4] text-white text-[9px] font-black uppercase tracking-widest rounded-md shadow-xs">
                  PAINEL ADMIN
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Logado: <strong className="text-gray-200">{currentUser.fullName}</strong> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isConnected 
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/70' 
                : 'bg-blue-950/80 text-blue-300 border border-blue-800/70'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
              {isConnected ? 'Supabase Conectado' : 'Modo Operacional Ativo'}
            </span>

            <button
              onClick={onBackToPortal}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border border-gray-700 hover:border-gray-600"
            >
              <Eye className="w-3.5 h-3.5 text-[#0056a4]" />
              Ver Portal ao Vivo
            </button>
          </div>
        </div>

        {/* Linha 2: Barra de Navegação com Ícones Separados e Intuitivos */}
        <nav className="container mx-auto px-4 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-gray-800/70 py-1.5">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'add_article') {
                    handleStartNewArticle();
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                  isActive
                    ? 'bg-gray-800 text-white border-gray-700 shadow-sm'
                    : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-850 border-transparent'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? tab.activeColor : 'bg-gray-800/60'
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
                </div>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                    tab.badgeColor || 'bg-gray-700 text-gray-300 border-gray-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* =========================================================
          SUB-HEADER INFORMATIVO DE CONTEXTO DA SEÇÃO ATIVA
      ========================================================= */}
      <div className="bg-white border-b border-gray-200/80 shadow-xs mb-6">
        <div className="container mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${currentTabMeta.activeColor} text-white`}>
              <currentTabMeta.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Painel Administrativo</span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">
                  {currentTabMeta.label}
                </h2>
              </div>
              <p className="text-[11px] text-gray-500">
                {currentTabMeta.desc}
              </p>
            </div>
          </div>

          {/* Atalho contextual à direita */}
          {activeTab !== 'add_article' && (
            <button
              onClick={handleStartNewArticle}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Escrever Notícia
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          CONTEÚDO DINÂMICO DAS SEÇÕES
      ========================================================= */}
      <main className="container mx-auto px-4">
        {/* ====================================================
            1. PAINEL INICIAL (VISÃO GERAL SIMPLIFICADA)
        ==================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Banner de Apresentação e Boas-Vindas */}
            <div className="bg-gradient-to-r from-gray-900 via-[#0056a4] to-gray-900 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full inline-block mb-2">
                  Gestão Central do Portal
                </span>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                  Bem-vindo, {currentUser.fullName}
                </h1>
                <p className="text-xs md:text-sm text-gray-200 mt-1 max-w-xl leading-relaxed">
                  Painel intuitivo para publicar notícias, gerenciar publicidade com posicionamento visual e moderar os classificados com agilidade.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={handleStartNewArticle}
                  className="px-5 py-3 bg-white text-gray-900 hover:bg-gray-100 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  Nova Notícia
                </button>

                <button
                  onClick={() => setActiveTab('manage_ads')}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-black uppercase tracking-wider rounded-xl transition-all backdrop-blur-xs flex items-center gap-2 cursor-pointer"
                >
                  <Megaphone className="w-4 h-4 text-purple-300" />
                  Publicidade
                </button>
              </div>
            </div>

            {/* OS 4 PILARES PRINCIPAIS EM DESTAQUE (Conforme solicitado) */}
            <div>
              <div className="mb-4">
                <h3 className="font-black text-sm uppercase text-gray-900 tracking-wider">
                  Principais Módulos de Gestão
                </h3>
                <p className="text-xs text-gray-400">
                  Acesse com um clique as quatro áreas fundamentais do portal:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. ADICIONAR NOTÍCIA */}
                <div
                  onClick={handleStartNewArticle}
                  className="bg-white p-6 rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <PlusCircle className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Criação
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-base text-gray-900 uppercase tracking-tight">
                      Adicionar Notícia
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Cadastro em 3 etapas com upload 16:9, editor simples e opção de rascunho.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Criar nova matéria</span> &rarr;
                  </div>
                </div>

                {/* 2. GERENCIAR NOTÍCIAS */}
                <div
                  onClick={() => setActiveTab('manage_articles')}
                  className="bg-white p-6 rounded-2xl border-2 border-sky-100 hover:border-sky-500 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Newspaper className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {articles.length} Matérias
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-base text-gray-900 uppercase tracking-tight">
                      Gerenciar Notícias
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Pesquisa rápida, filtros por categoria, edição sem perda de dados e prévia.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-bold text-sky-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Ver lista completa</span> &rarr;
                  </div>
                </div>

                {/* 3. PUBLICIDADE */}
                <div
                  onClick={() => setActiveTab('manage_ads')}
                  className="bg-white p-6 rounded-2xl border-2 border-purple-100 hover:border-purple-500 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Megaphone className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {activeAds} Ativas
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-base text-gray-900 uppercase tracking-tight">
                      Publicidade
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Inserção de anúncios com maquete visual interativa e dimensões sugeridas.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-bold text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Gerenciar campanhas</span> &rarr;
                  </div>
                </div>

                {/* 4. CLASSIFICADOS */}
                <div
                  onClick={() => setActiveTab('manage_classifieds')}
                  className="bg-white p-6 rounded-2xl border-2 border-amber-100 hover:border-amber-500 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Moderação
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-base text-gray-900 uppercase tracking-tight">
                      Classificados
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Aprovação de anúncios públicos, verificação de denúncias e regras do balcão.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-bold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Moderar anúncios</span> &rarr;
                  </div>
                </div>
              </div>
            </div>

            {/* Painel de Indicadores Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Notícias Publicadas</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{publishedArticles}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Visíveis na capa e editorias</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Rascunhos Salvos</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{draftArticles}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Em redação ou revisão</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Total de Leituras</p>
                <p className="text-2xl font-black text-[#0056a4] mt-1">{totalViews}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Visualizações registradas</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">Banners no Ar</p>
                <p className="text-2xl font-black text-purple-600 mt-1">{activeAds}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Campanhas publicitárias ativas</p>
              </div>
            </div>

            {/* Últimas Matérias para Edição Rápida */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-black text-sm uppercase text-gray-900 tracking-wider">
                  Matérias Mais Recentes Cadastradas
                </h3>
                <button
                  onClick={() => setActiveTab('manage_articles')}
                  className="text-xs font-bold text-[#0056a4] hover:underline cursor-pointer"
                >
                  Ver Todas as Notícias &rarr;
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {articles.slice(0, 5).map(art => (
                  <div key={art.id} className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/70 p-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={art.imageUrl} alt="" className="w-12 h-10 rounded-lg object-cover shrink-0 bg-gray-100 border border-gray-200" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{art.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {art.category} • {new Date(art.createdAt).toLocaleDateString('pt-BR')} • {art.viewsCount || 0} visualizações
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartEditArticle(art)}
                      className="px-3.5 py-1.5 bg-gray-100 hover:bg-[#0056a4] hover:text-white text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            2. ADICIONAR NOTÍCIA (TELA EXCLUSIVA)
        ==================================================== */}
        {activeTab === 'add_article' && (
          <AdminAddArticle
            currentUser={currentUser}
            editingArticle={editingArticle}
            onSuccess={handleArticleSaved}
            onCancel={handleCancelArticle}
          />
        )}

        {/* ====================================================
            3. GERENCIAR NOTÍCIAS (TABELA ORGANIZADA & FILTROS)
        ==================================================== */}
        {activeTab === 'manage_articles' && (
          <AdminManageArticles
            articles={articles}
            onRefreshData={onRefreshData}
            onEditArticle={handleStartEditArticle}
            onAddNewArticle={handleStartNewArticle}
          />
        )}

        {/* ====================================================
            4. PUBLICIDADE (COM MAQUETE VISUAL DO PORTAL)
        ==================================================== */}
        {activeTab === 'manage_ads' && (
          <AdminManageAds
            ads={ads}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ====================================================
            5. CLASSIFICADOS (MODERAÇÃO & APROVAÇÃO PÚBLICA)
        ==================================================== */}
        {activeTab === 'manage_classifieds' && (
          <AdminClassifiedsTab
            currentUser={currentUser}
          />
        )}

        {/* ====================================================
            6. GERENCIAR USUÁRIOS (PF, PJ, ROLES & SUSPENSÃO)
        ==================================================== */}
        {activeTab === 'manage_users' && (
          <AdminManageUsers
            currentUser={currentUser}
          />
        )}

        {/* ====================================================
            7. CONFIGURAÇÕES DO PORTAL (REGRAS & SUPABASE)
        ==================================================== */}
        {activeTab === 'settings' && (
          <AdminSettings />
        )}
      </main>
    </div>
  );
};
