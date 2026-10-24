/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ArticleCard } from './components/news/ArticleCard';
import { AdSlot } from './components/news/AdSlot';
import { AuthModal } from './components/auth/AuthModal';
import { EmailConfirmationModal } from './components/auth/EmailConfirmationModal';
import { ResetPasswordModal } from './components/auth/ResetPasswordModal';

import { ArticleDetail } from './components/pages/ArticleDetail';
import { InstitutionalPage } from './components/pages/InstitutionalPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { ClassifiedList } from './components/classifieds/ClassifiedList';
import { ClassifiedDetail } from './components/classifieds/ClassifiedDetail';
import { ClassifiedFormModal } from './components/classifieds/ClassifiedFormModal';
import { MyClassifiedsModal } from './components/classifieds/MyClassifiedsModal';
import { Article, AdItem, CategorySlug, UserProfile, ClassifiedItem } from './types/database';
import { 
  newsService, adsService, authService, newsletterService,
  siteSettingsService, supabase, isSupabaseConfigured
} from './lib/supabase';
import { INITIAL_ARTICLES, INITIAL_ADS } from './data/initialData';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { updateClientHeadForArticle, getAppBasePath } from './lib/seo';

export default function App() {
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [ads, setAds] = useState<AdItem[]>(INITIAL_ADS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Roteamento interno
  const [viewMode, setViewMode] = useState<'home' | 'article' | 'institutional' | 'admin' | 'classifieds' | 'classified-detail'>('home');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedClassified, setSelectedClassified] = useState<ClassifiedItem | null>(null);
  const [currentCategory, setCurrentCategory] = useState<CategorySlug>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [institutionalPage, setInstitutionalPage] = useState<'sobre-nos' | 'expediente' | 'privacidade' | 'anuncie-conosco'>('sobre-nos');
  
  // Modais de Classificados
  const [isClassifiedFormOpen, setIsClassifiedFormOpen] = useState(false);
  const [isMyClassifiedsOpen, setIsMyClassifiedsOpen] = useState(false);
  const [editingClassified, setEditingClassified] = useState<ClassifiedItem | null>(null);
  
  // Modal de Autenticação Pública
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authReasonMessage, setAuthReasonMessage] = useState<string | undefined>(undefined);
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<'create_classified' | null>(null);

  // Modal de Autenticação Administrativa Exclusiva (Acesso Restrito)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  
  // Modais de Segurança (Confirmação de E-mail e Redefinição de Senha)
  const [emailConfirmToken, setEmailConfirmToken] = useState<string | null>(null);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null);

  // Paginação de notícias
  const [visibleCount, setVisibleCount] = useState(7);
  
  // Newsletter Sidebar
  const [sidebarEmail, setSidebarEmail] = useState('');
  const [sidebarSubscribed, setSidebarSubscribed] = useState(false);

  // Carregar dados iniciais e sessão
  const loadData = async () => {
    const [arts, currentAds, user] = await Promise.all([
      newsService.getArticles(),
      adsService.getAds(),
      authService.getCurrentUser(),
      siteSettingsService.hydrate()
    ]);
    setArticles(arts);
    setAds(currentAds);
    setCurrentUser(user);

    // Extrai slug de notícia considerando SSR, rotas diretas, subdiretórios no GitHub Pages e fallback 404
    const extractSlug = (): string | null => {
      if (typeof window === 'undefined') return null;
      const windowSlug = (window as any).__INITIAL_ARTICLE_SLUG__;
      if (windowSlug) return windowSlug;

      // 1. Procura no pathname em qualquer profundidade (ex: /noticia/slug ou /repo/noticia/slug)
      const pathMatch = window.location.pathname.match(/(?:^|\/)(?:noticia|noticias|artigo|artigos)\/([^/?#]+)/i);
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }

      // 2. Procura em query parameters diretos (?noticia=, ?slug=)
      const params = new URLSearchParams(window.location.search);
      const qNoticia = params.get('noticia') || params.get('slug');
      if (qNoticia) return decodeURIComponent(qNoticia);

      // 3. Suporte ao parâmetro p vindo do redirecionamento do 404.html do GitHub Pages (?p=/noticia/slug)
      const pParam = params.get('p');
      if (pParam) {
        const pMatch = pParam.match(/(?:^|\/)(?:noticia|noticias|artigo|artigos)\/([^/?#]+)/i);
        if (pMatch && pMatch[1]) {
          return decodeURIComponent(pMatch[1]);
        }
      }

      return null;
    };

    const initialSlug = extractSlug();
    if (initialSlug) {
      const found = arts.find(a => a.slug.toLowerCase() === initialSlug.toLowerCase() || a.id === initialSlug);
      if (found && found.status !== 'draft') {
        setSelectedArticle(found);
        setViewMode('article');
        updateClientHeadForArticle(found);
      }
    }
  };

  useEffect(() => {
    loadData();

    // 1. Processa rotas e links de confirmação de e-mail e recuperação de senha
    const handleUrlAuthTokens = () => {
      if (typeof window === 'undefined') return;

      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';

      // Verifica se a URL retornou erro de autenticação (ex: link expirado pelo Supabase)
      const errorParam = searchParams.get('error') || (hash.includes('error=') ? new URLSearchParams(hash.substring(1)).get('error') : null);
      const errorDesc = searchParams.get('error_description') || (hash.includes('error_description=') ? new URLSearchParams(hash.substring(1)).get('error_description') : null);
      if (errorDesc || errorParam) {
        console.warn('Erro retornado na URL de autenticação:', errorParam, errorDesc);
        const decoded = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'O link de recuperação ou confirmação é inválido ou expirou.';
        alert(decoded);
        return;
      }

      // Suporte a fluxo PKCE (?code=xxxx)
      const code = searchParams.get('code');
      if (code && isSupabaseConfigured() && supabase) {
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!error && (data?.session || searchParams.get('action') === 'reset-password')) {
            setResetPasswordToken('supabase_recovery');
          }
        }).catch(err => {
          console.warn('Falha ao trocar código PKCE por sessão:', err);
        });
      }

      // A) Confirmação de E-mail e Recuperação via parâmetros de busca
      const action = searchParams.get('action');
      const queryToken = searchParams.get('token');
      const queryEmail = searchParams.get('email');
      const queryType = searchParams.get('type');
      const tokenHash = searchParams.get('token_hash');

      // token_hash precisa ser verificado antes de abrir o modal, senão updateUser roda sem sessão
      if (tokenHash && queryType === 'recovery') {
        if (isSupabaseConfigured() && supabase) {
          supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
            if (!error) {
              setResetPasswordToken('supabase_recovery');
            }
          });
        }
      } else if (action === 'reset-password' || queryType === 'recovery') {
        setResetPasswordToken(queryToken || 'supabase_recovery');
      } else if (action === 'confirm-email') {
        // O Supabase valida o link e devolve a sessão no fragmento da URL
        setEmailConfirmToken(queryToken || 'supabase_verified');
      } else if (queryToken && queryEmail) {
        setEmailConfirmToken(queryToken);
      }

      // B) Confirmação de E-mail e Recuperação via hash (#confirm-email, #reset-password, #access_token)
      if (hash.startsWith('#confirm-email')) {
        const hashParams = new URLSearchParams(hash.replace('#confirm-email', '').replace(/^[?&]/, ''));
        const hashToken = hashParams.get('token');
        if (hashToken) {
          setEmailConfirmToken(hashToken);
        } else {
          setEmailConfirmToken('supabase_verified');
        }
      } else if (hash.startsWith('#reset-password')) {
        const hashParams = new URLSearchParams(hash.replace('#reset-password', '').replace(/^[?&]/, ''));
        const hashToken = hashParams.get('token');
        setResetPasswordToken(hashToken || 'supabase_recovery');
      } else if (hash.includes('type=recovery')) {
        setResetPasswordToken('supabase_recovery');
      } else if (hash.includes('type=signup') || hash.includes('type=email_change')) {
        setEmailConfirmToken('supabase_verified');
      }
    };

    handleUrlAuthTokens();

    // 2. Escuta eventos oficiais de autenticação do Supabase caso conectado
    let supabaseSub: any = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setResetPasswordToken('supabase_recovery');
          } else if (event === 'SIGNED_IN' && session?.user) {
            authService.getCurrentUser().then(u => {
              if (u) setCurrentUser(u);
            });
          }
        });
        supabaseSub = authListener?.subscription;
      } catch (e) {
        console.warn('Aviso: Falha ao registrar onAuthStateChange do Supabase', e);
      }
    }

    const handleAuthChange = () => {
      authService.getCurrentUser().then(setCurrentUser);
    };

    const handleDirectReset = () => {
      setResetPasswordToken('supabase_recovery');
    };

    window.addEventListener('folha_auth_changed', handleAuthChange);
    window.addEventListener('folha_direct_reset_password', handleDirectReset);

    return () => {
      window.removeEventListener('folha_auth_changed', handleAuthChange);
      window.removeEventListener('folha_direct_reset_password', handleDirectReset);
      if (supabaseSub) supabaseSub.unsubscribe();
    };
  }, []);

  // Monitora navegação pelo histórico do navegador (botões Voltar e Avançar)
  useEffect(() => {
    const handlePopState = () => {
      const pathMatch = window.location.pathname.match(/(?:^|\/)(?:noticia|noticias|artigo|artigos)\/([^/?#]+)/i);
      const params = new URLSearchParams(window.location.search);
      const searchSlug = params.get('noticia') || params.get('slug');
      const pParam = params.get('p');
      const pMatch = pParam ? pParam.match(/(?:^|\/)(?:noticia|noticias|artigo|artigos)\/([^/?#]+)/i) : null;
      const slug = (pathMatch ? decodeURIComponent(pathMatch[1]) : (pMatch ? decodeURIComponent(pMatch[1]) : searchSlug));

      if (slug && articles.length > 0) {
        const found = articles.find(a => a.slug.toLowerCase() === slug.toLowerCase() || a.id === slug);
        if (found && found.status !== 'draft') {
          setSelectedArticle(found);
          setViewMode('article');
          updateClientHeadForArticle(found);
          return;
        }
      }

      const basePath = getAppBasePath();
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === basePath || currentPath === basePath.replace(/\/$/, '') || !slug) {
        setSelectedArticle(null);
        setViewMode('home');
        document.title = 'Folha da Região - A notícia onde você estiver';
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [articles]);

  const handleSelectArticle = (art: Article) => {
    setSelectedArticle(art);
    setViewMode('article');
    // Atualiza a URL canônica na barra de endereços do navegador preservando a base da aplicação
    const basePath = getAppBasePath();
    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const targetUrl = `${cleanBase}noticia/${encodeURIComponent(art.slug)}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ articleSlug: art.slug }, '', targetUrl);
    }
    updateClientHeadForArticle(art);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setViewMode('home');
    setSelectedArticle(null);
    setSelectedClassified(null);
    setCurrentCategory('todos');
    setSearchQuery('');
    const basePath = getAppBasePath();
    if (window.location.pathname !== basePath) {
      window.history.pushState({}, '', basePath);
    }
    document.title = 'Folha da Região - A notícia onde você estiver';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (cat: CategorySlug) => {
    setCurrentCategory(cat);
    setSearchQuery('');
    setSelectedArticle(null);
    setSelectedClassified(null);
    if (cat === 'classificados') {
      setViewMode('classifieds');
    } else {
      setViewMode('home');
      setVisibleCount(7);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectClassified = (item: ClassifiedItem) => {
    setSelectedClassified(item);
    setViewMode('classified-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCreateClassified = () => {
    if (!currentUser) {
      setAuthReasonMessage('Para publicar anúncios nos Classificados com segurança jurídica e credibilidade, você precisa estar cadastrado e conectado.');
      setPendingActionAfterAuth('create_classified');
      handleOpenAuth('login');
      return;
    }
    setEditingClassified(null);
    setIsClassifiedFormOpen(true);
  };

  const handleOpenMyClassifieds = () => {
    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    setIsMyClassifiedsOpen(true);
  };

  const handleEditClassified = (item: ClassifiedItem) => {
    setIsMyClassifiedsOpen(false);
    setEditingClassified(item);
    setIsClassifiedFormOpen(true);
  };

  const handleViewClassified = (item: ClassifiedItem) => {
    setIsMyClassifiedsOpen(false);
    setSelectedClassified(item);
    setViewMode('classified-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setViewMode('home');
    setSelectedArticle(null);
  };

  const handleOpenInstitutional = (page: 'sobre-nos' | 'expediente' | 'privacidade' | 'anuncie-conosco') => {
    setInstitutionalPage(page);
    setViewMode('institutional');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenAdminLogin = () => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'editor') {
      setViewMode('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setIsMyClassifiedsOpen(false);
    setIsClassifiedFormOpen(false);
    if (viewMode === 'admin') {
      setViewMode('home');
    }
  };

  const handleSidebarNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebarEmail.trim() || !sidebarEmail.includes('@')) return;
    await newsletterService.subscribe(sidebarEmail);
    setSidebarSubscribed(true);
    setSidebarEmail('');
    setTimeout(() => setSidebarSubscribed(false), 5000);
  };

  // Filtragem de notícias
  let filteredArticles = [...articles];

  if (currentCategory !== 'todos') {
    filteredArticles = filteredArticles.filter(
      a => a.category.toLowerCase() === currentCategory.toLowerCase() ||
      (currentCategory === 'videos' && a.isVideo)
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredArticles = filteredArticles.filter(
      a => a.title.toLowerCase().includes(q) ||
      (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
      a.content.toLowerCase().includes(q)
    );
  }

  // Destaques
  const heroArticle = filteredArticles.find(a => a.isHero) || filteredArticles[0];
  const secondaryArticles = filteredArticles.filter(a => a.id !== heroArticle?.id).slice(0, 4);
  const feedArticles = filteredArticles.filter(a => a.id !== heroArticle?.id && !secondaryArticles.some(s => s.id === a.id));
  const visibleFeed = feedArticles.slice(0, visibleCount);

  // Mais Lidas (Ordenadas por viewsCount)
  const mostReadArticles = [...articles].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 5);

  // Anúncios específicos
  const isAdActive = (a: AdItem) => a.status === 'active' || (a.status === undefined && a.active);
  const headerAds = ads.filter(a => a.placement === 'header');
  const feedAds = ads.filter(a => a.placement === 'feed');
  const sidebarAds = ads.filter(a => a.placement === 'sidebar');
  const articleAds = ads.filter(a => a.placement === 'article');
  const footerAds = ads.filter(a => a.placement === 'footer');
  const ads300x300 = ads.filter(a => (a.adFormat === '300x300' || a.aspectRatio === '1 / 1') && a.placement !== 'sidebar_300x900' && a.placement !== 'sidebar_300x600');
  const ads300x900 = ads.filter(a => a.adFormat === '300x900' || a.placement === 'sidebar_300x900' || a.aspectRatio === '1 / 3' || a.adFormat === '300x600' || a.placement === 'sidebar_300x600');

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-[#0056a4] selection:text-white flex flex-col">
      {/* Header Fixo */}
      <Header
        currentCategory={currentCategory}
        onSelectCategory={handleSelectCategory}
        onSearch={handleSearch}
        onOpenAuth={handleOpenAuth}
        onOpenAdmin={handleOpenAdminLogin}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        headerAds={headerAds}
        onGoHome={handleGoHome}
        onSelectArticleSlug={(slug) => {
          const found = articles.find(a => a.slug === slug);
          if (found) {
            handleSelectArticle(found);
          }
        }}
        onOpenMyClassifieds={handleOpenMyClassifieds}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1">
        {/* VISUALIZAÇÃO: PAINEL ADMINISTRATIVO */}
        {viewMode === 'admin' && currentUser && (
          <AdminDashboard
            currentUser={currentUser}
            articles={articles}
            ads={ads}
            onRefreshData={loadData}
            onBackToPortal={() => setViewMode('home')}
          />
        )}

        {/* VISUALIZAÇÃO: ARTIGO COMPLETO */}
        {viewMode === 'article' && selectedArticle && (
          <ArticleDetail
            article={selectedArticle}
            allArticles={articles}
            currentUser={currentUser}
            onOpenAuth={() => handleOpenAuth('login')}
            onBack={handleGoHome}
            onSelectArticle={handleSelectArticle}
            articleAds={articleAds}
          />
        )}

        {/* VISUALIZAÇÃO: CLASSIFICADOS (PÁGINA EXCLUSIVA) */}
        {viewMode === 'classifieds' && (
          <ClassifiedList
            currentUser={currentUser}
            onOpenAuth={() => {
              setAuthReasonMessage('Para publicar anúncios nos Classificados com credibilidade e segurança jurídica, faça login ou cadastre-se abaixo.');
              setPendingActionAfterAuth('create_classified');
              handleOpenAuth('login');
            }}
            onOpenCreateModal={handleOpenCreateClassified}
            onOpenMyClassifieds={handleOpenMyClassifieds}
            onSelectClassified={handleSelectClassified}
          />
        )}

        {/* VISUALIZAÇÃO: PÁGINA INDIVIDUAL DO ANÚNCIO */}
        {viewMode === 'classified-detail' && selectedClassified && (
          <ClassifiedDetail
            classified={selectedClassified}
            onBack={() => setViewMode('classifieds')}
          />
        )}

        {/* VISUALIZAÇÃO: PÁGINAS INSTITUCIONAIS */}
        {viewMode === 'institutional' && (
          <InstitutionalPage
            page={institutionalPage}
            onBack={() => setViewMode('home')}
          />
        )}

        {/* VISUALIZAÇÃO: PÁGINA INICIAL / FEED */}
        {viewMode === 'home' && (
          <div className="container mx-auto px-4 py-6">
            {/* Aviso de busca ou categoria filtrada */}
            {(searchQuery || currentCategory !== 'todos') && (
              <div className="mb-6 pb-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">
                    {searchQuery ? `Resultados para: "${searchQuery}"` : `Editoria: ${currentCategory}`}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {filteredArticles.length} notícia(s) encontrada(s)
                  </p>
                </div>
                <button
                  onClick={() => { setCurrentCategory('todos'); setSearchQuery(''); }}
                  className="text-xs font-black uppercase text-[#0056a4] hover:underline cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* COLUNA PRINCIPAL (8 Colunas) */}
              <div className="lg:col-span-8 space-y-12">
                {/* 1. Destaque Hero Principal */}
                {heroArticle && !searchQuery && (
                  <section>
                    <ArticleCard
                      article={heroArticle}
                      variant="hero"
                      onSelectArticle={handleSelectArticle}
                    />
                  </section>
                )}

                {/* 2. Destaques Secundários (Grid 2 colunas) */}
                {secondaryArticles.length > 0 && !searchQuery && (
                  <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {secondaryArticles.map((art) => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          variant="secondary"
                          onSelectArticle={handleSelectArticle}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. Feed de Últimas Notícias */}
                <section>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-gray-900 mb-6 border-l-4 border-[#0056a4] pl-4">
                    {searchQuery ? 'Resultados' : 'Últimas Notícias'}
                  </h2>

                  <div className="grid grid-cols-1 gap-4">
                    {visibleFeed.map((art, idx) => (
                      <React.Fragment key={art.id}>
                        <ArticleCard
                          article={art}
                          variant="feed"
                          onSelectArticle={handleSelectArticle}
                        />
                        {/* Inserção de publicidade intercalada no feed como no original */}
                        {idx === 2 && (
                          <div className="py-4 border-b border-gray-100 flex justify-center w-full">
                            <AdSlot placement="feed" ads={feedAds} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Botão Carregar Mais */}
                  {visibleFeed.length < feedArticles.length && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + 5)}
                      className="w-full mt-8 py-4 bg-gray-100 hover:bg-[#0056a4] hover:text-white text-gray-900 font-black uppercase tracking-widest text-[11px] md:text-xs transition-all rounded-lg cursor-pointer shadow-xs"
                    >
                      Carregar mais notícias
                    </button>
                  )}
                </section>
              </div>

              {/* COLUNA LATERAL (4 Colunas) */}
              <aside className="lg:col-span-4 space-y-8">
                {/* Espaço Publicitário Formato 300x300 (Quadrado - Carrossel Independente) */}
                <div className="flex justify-center w-full">
                  <AdSlot format="300x300" placement="sidebar" ads={ads300x300} />
                </div>

                {/* Widget Mais Lidas */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-black uppercase tracking-tighter text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#0056a4] rounded-full"></span>
                    Mais Lidas
                  </h3>
                  <div className="space-y-1">
                    {mostReadArticles.map((art) => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        variant="compact"
                        onSelectArticle={handleSelectArticle}
                      />
                    ))}
                  </div>
                </section>

                {/* Espaço Publicitário Formato 300x900 (Vertical - Carrossel Independente) */}
                <div className="flex justify-center w-full">
                  <AdSlot format="300x900" placement="sidebar_300x900" ads={ads300x900} />
                </div>

                {/* Widget Newsletter Folha News */}
                <section className="bg-gray-900 text-white p-6 md:p-8 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2 italic">
                      Folha <span className="text-[#0056a4]">News</span>
                    </h3>
                    <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                      As principais notícias de Sergipe e do Brasil, direto no seu e-mail todos os dias.
                    </p>

                    {sidebarSubscribed ? (
                      <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Inscrição confirmada com sucesso!</span>
                      </div>
                    ) : (
                      <form onSubmit={handleSidebarNewsletter} className="space-y-2">
                        <input
                          type="email"
                          required
                          placeholder="Seu melhor e-mail"
                          value={sidebarEmail}
                          onChange={(e) => setSidebarEmail(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#0056a4]/50 transition-all outline-none text-white placeholder:text-gray-500"
                        />
                        <button
                          type="submit"
                          className="w-full bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-widest text-xs py-3 rounded-lg transition-all shadow-md cursor-pointer"
                        >
                          Inscrever-se Grátis
                        </button>
                      </form>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* Footer Fixo (Publicidade integrada internamente imediatamente acima dos direitos reservados e área administrativa) */}
      <Footer
        onOpenInstitutional={handleOpenInstitutional}
        onOpenAdmin={handleOpenAdminLogin}
        onGoHome={handleGoHome}
        footerAds={footerAds}
        onOpenClassifieds={() => {
          setCurrentCategory('classificados');
          setViewMode('classifieds');
          setSelectedArticle(null);
          setSelectedClassified(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Modal de Autenticação (Login / Cadastro / Recuperação) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthReasonMessage(undefined);
          setPendingActionAfterAuth(null);
        }}
        initialMode={authModalMode}
        reasonMessage={authReasonMessage}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (pendingActionAfterAuth === 'create_classified') {
            setPendingActionAfterAuth(null);
            setAuthReasonMessage(undefined);
            setEditingClassified(null);
            setTimeout(() => {
              setIsClassifiedFormOpen(true);
            }, 300);
          }
        }}
      />

      {/* Modal Exclusivo de Login Administrativo (Acesso Restrito) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={(adminUser) => {
          setCurrentUser(adminUser);
          setIsAdminLoginOpen(false);
          setViewMode('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Modais de Gestão e Criação de Classificados */}
      {currentUser && (
        <>
          <ClassifiedFormModal
            isOpen={isClassifiedFormOpen}
            onClose={() => {
              setIsClassifiedFormOpen(false);
              setEditingClassified(null);
            }}
            currentUser={currentUser}
            initialData={editingClassified}
            onSuccess={(saved) => {
              setIsClassifiedFormOpen(false);
              setEditingClassified(null);
              setSelectedClassified(saved);
              setViewMode('classified-detail');
            }}
          />

          <MyClassifiedsModal
            isOpen={isMyClassifiedsOpen}
            onClose={() => setIsMyClassifiedsOpen(false)}
            currentUser={currentUser}
            onOpenCreateModal={handleOpenCreateClassified}
            onEditClassified={handleEditClassified}
            onViewClassified={handleViewClassified}
          />
        </>
      )}

      {/* Modal de Confirmação de E-mail */}
      {emailConfirmToken && (
        <EmailConfirmationModal
          isOpen={Boolean(emailConfirmToken)}
          token={emailConfirmToken}
          onClose={() => {
            setEmailConfirmToken(null);
            if (window.location.search.includes('action=confirm-email') || window.location.hash.includes('confirm-email')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          }}
          onGoToLogin={() => {
            setEmailConfirmToken(null);
            if (window.location.search.includes('action=confirm-email') || window.location.hash.includes('confirm-email')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
            handleOpenAuth('login');
          }}
        />
      )}

      {/* Modal de Redefinição de Senha */}
      {resetPasswordToken && (
        <ResetPasswordModal
          isOpen={Boolean(resetPasswordToken)}
          token={resetPasswordToken}
          onClose={() => {
            setResetPasswordToken(null);
            if (window.location.search.includes('action=reset-password') || window.location.hash.includes('reset-password') || window.location.hash.includes('type=recovery')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          }}
          onSuccessGoToLogin={() => {
            setResetPasswordToken(null);
            if (window.location.search.includes('action=reset-password') || window.location.hash.includes('reset-password') || window.location.hash.includes('type=recovery')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
            handleOpenAuth('login');
          }}
        />
      )}
    </div>
  );
}
