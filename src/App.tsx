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
import { EmailOutboxModal } from './components/notifications/EmailOutboxModal';
import { EmailNotificationToast } from './components/notifications/EmailNotificationToast';
import { ArticleDetail } from './components/pages/ArticleDetail';
import { InstitutionalPage } from './components/pages/InstitutionalPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { ClassifiedList } from './components/classifieds/ClassifiedList';
import { ClassifiedDetail } from './components/classifieds/ClassifiedDetail';
import { ClassifiedFormModal } from './components/classifieds/ClassifiedFormModal';
import { MyClassifiedsModal } from './components/classifieds/MyClassifiedsModal';
import { Article, AdItem, CategorySlug, UserProfile, ClassifiedItem } from './types/database';
import { newsService, adsService, authService, newsletterService, notificationsService } from './lib/supabase';
import { INITIAL_ARTICLES, INITIAL_ADS } from './data/initialData';
import { Sparkles, CheckCircle2 } from 'lucide-react';

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
  
  // Modais de Segurança (Confirmação de E-mail, Redefinição de Senha e Caixa de E-mails)
  const [emailConfirmToken, setEmailConfirmToken] = useState<string | null>(null);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null);
  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState(false);

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
      authService.getCurrentUser()
    ]);
    setArticles(arts);
    setAds(currentAds);
    setCurrentUser(user);

    if (user) {
      notificationsService.seedInitialNotificationsIfEmpty(user, arts);
    }
  };

  useEffect(() => {
    loadData();

    const handleAuthChange = () => {
      authService.getCurrentUser().then(user => {
        setCurrentUser(user);
        if (user) {
          notificationsService.seedInitialNotificationsIfEmpty(user, articles);
        }
      });
    };

    window.addEventListener('folha_auth_changed', handleAuthChange);
    return () => window.removeEventListener('folha_auth_changed', handleAuthChange);
  }, []);

  const handleSelectArticle = (art: Article) => {
    setSelectedArticle(art);
    setViewMode('article');
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
  const headerAd = ads.find(a => a.placement === 'header' && isAdActive(a));
  const feedAd = ads.find(a => a.placement === 'feed' && isAdActive(a));
  const sidebarAds = ads.filter(a => a.placement === 'sidebar' && isAdActive(a));
  const articleAd = ads.find(a => a.placement === 'article' && isAdActive(a));
  const footerAd = ads.find(a => a.placement === 'footer' && isAdActive(a));

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
        headerAd={headerAd}
        onGoHome={() => {
          setViewMode('home');
          setSelectedArticle(null);
          setSelectedClassified(null);
          setCurrentCategory('todos');
          setSearchQuery('');
        }}
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
            onBack={() => setViewMode('home')}
            onSelectArticle={handleSelectArticle}
            articleAd={articleAd}
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
                        {idx === 2 && feedAd && (
                          <div className="py-4 border-b border-gray-100 flex justify-center">
                            <AdSlot ad={feedAd} />
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
                {/* Anúncios da Barra Lateral */}
                <div className="space-y-6">
                  {sidebarAds.slice(0, 3).map((ad) => (
                    <AdSlot key={ad.id} ad={ad} />
                  ))}
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

                {/* Restante dos Anúncios da Barra Lateral */}
                <div className="space-y-6">
                  {sidebarAds.slice(3).map((ad) => (
                    <AdSlot key={ad.id} ad={ad} />
                  ))}
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

      {/* Footer Fixo */}
      <Footer
        onOpenInstitutional={handleOpenInstitutional}
        onOpenAdmin={handleOpenAdminLogin}
        onGoHome={() => {
          setViewMode('home');
          setSelectedArticle(null);
          setSelectedClassified(null);
          setCurrentCategory('todos');
          setSearchQuery('');
        }}
        onOpenClassifieds={() => {
          setCurrentCategory('classificados');
          setViewMode('classifieds');
          setSelectedArticle(null);
          setSelectedClassified(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Banner Publicitário de Rodapé */}
      {footerAd && (
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <AdSlot ad={footerAd} />
        </div>
      )}

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
    </div>
  );
}
