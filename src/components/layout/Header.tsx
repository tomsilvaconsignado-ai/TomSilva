import React, { useState } from 'react';
import { Search, Menu, X, User, Shield, LogOut, ChevronDown, Bell, Tag } from 'lucide-react';
import { TopBar } from './TopBar';
import { AdSlot } from '../news/AdSlot';
import { NotificationBell } from '../notifications/NotificationBell';
import { AdItem, CategorySlug, UserProfile } from '../../types/database';
import { INITIAL_CATEGORIES } from '../../data/initialData';

interface HeaderProps {
  currentCategory: CategorySlug;
  onSelectCategory: (cat: CategorySlug) => void;
  onSearch: (query: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenAdmin: () => void;
  currentUser: UserProfile | null;
  onSignOut: () => void;
  headerAd?: AdItem;
  onGoHome: () => void;
  onSelectArticleSlug: (slug: string) => void;
  onOpenMyClassifieds?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategory,
  onSelectCategory,
  onSearch,
  onOpenAuth,
  onOpenAdmin,
  currentUser,
  onSignOut,
  headerAd,
  onGoHome,
  onSelectArticleSlug,
  onOpenMyClassifieds
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Formatar data em português
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      {/* Ticker / Cotações */}
      <TopBar />

      <div className="container mx-auto px-4">
        {/* Top Header Bar (Data, Redes e Acesso) */}
        <div className="hidden md:flex justify-between items-center py-2 text-[10px] text-gray-500 border-b border-gray-50">
          <div className="flex items-center gap-5">
            <span className="capitalize font-bold text-gray-900 tracking-tight">
              {formattedDate}
            </span>
            <div className="flex items-center gap-3 border-l border-gray-100 pl-5">
              <button
                onClick={onOpenAdmin}
                className="hover:text-[#0056a4] transition-colors font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                title="Acesso exclusivo para administradores e editores"
              >
                <Shield className="w-3 h-3 text-[#0056a4]" />
                Acesso Restrito
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Redes Sociais */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/folhadaregiaose/?locale=pt_BR"
                target="_blank"
                rel="noopener noreferrer"
                className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center text-white cursor-pointer hover:bg-[#0056a4] transition-all shadow-sm"
                title="Facebook"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/folhadaregiaose"
                target="_blank"
                rel="noopener noreferrer"
                className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center text-white cursor-pointer hover:bg-[#0056a4] transition-all shadow-sm"
                title="Instagram"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>

            {/* Usuário ou Login */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                {/* Sino de Notificações para Usuário Logado */}
                <NotificationBell
                  currentUser={currentUser}
                  onSelectArticleSlug={onSelectArticleSlug}
                />

                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-800 font-bold cursor-pointer"
                  >
                    <img
                      src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.fullName}`}
                      alt={currentUser.fullName}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-[10px] max-w-[120px] truncate">{currentUser.fullName}</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50 text-left text-xs animate-in fade-in">
                      <div className="px-3 py-1.5 border-b border-gray-50">
                        <p className="font-bold text-gray-900 truncate">{currentUser.fullName}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'editor' ? 'Jornalista' : 'Leitor VIP'}</p>
                      </div>

                      {(currentUser.role === 'admin' || currentUser.role === 'editor') && (
                        <button
                          onClick={() => { setUserDropdownOpen(false); onOpenAdmin(); }}
                          className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#0056a4]" />
                          Painel de Controle
                        </button>
                      )}

                      {onOpenMyClassifieds && (
                        <button
                          onClick={() => { setUserDropdownOpen(false); onOpenMyClassifieds(); }}
                          className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5 text-amber-500" />
                          Meus Classificados
                        </button>
                      )}

                      <button
                        onClick={() => { setUserDropdownOpen(false); onSignOut(); }}
                        className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sair da Conta
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-[10px] font-black uppercase tracking-wider text-[#0056a4] hover:underline cursor-pointer"
                >
                  Entrar
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="text-[10px] font-black uppercase tracking-wider text-gray-700 hover:text-black cursor-pointer"
                >
                  Cadastrar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Linha Central: Logotipo + Banner 728x90 + Busca */}
        <div className="flex justify-between items-center py-4 md:py-6 gap-6 relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-2 text-gray-900 touch-manipulation cursor-pointer"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logotipo da Folha da Região */}
            <button
              onClick={onGoHome}
              className="flex flex-col items-start group transition-opacity hover:opacity-90 cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-3xl font-black tracking-tighter text-[#0056a4] uppercase font-sans">
                  FOLHA <span className="text-gray-900">DA REGIÃO</span>
                </span>
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded">
                  ONLINE
                </span>
              </div>
              <p className="text-[8px] md:text-[11px] font-black tracking-[0.2em] md:tracking-[0.25em] text-gray-400 uppercase mt-1 group-hover:text-[#0056a4] transition-colors whitespace-nowrap">
                A NOTÍCIA ONDE VOCÊ ESTIVER
              </p>
            </button>
          </div>

          {/* Banner de Topo 728x90 */}
          <div className="hidden lg:flex flex-1 justify-center max-w-[728px]">
            {headerAd && <AdSlot ad={headerAd} />}
          </div>

          {/* Campo de Busca & Usuário Mobile */}
          <div className="flex items-center gap-3">
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:flex items-center bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 w-44 lg:w-60 focus-within:ring-2 focus-within:ring-[#0056a4]/10 focus-within:bg-white transition-all"
            >
              <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full font-medium placeholder:text-gray-400 text-gray-800"
              />
            </form>

            {currentUser && (
              <div className="md:hidden">
                <NotificationBell
                  currentUser={currentUser}
                  onSelectArticleSlug={onSelectArticleSlug}
                />
              </div>
            )}

            <button
              onClick={() => onOpenAuth('login')}
              className="md:hidden p-2 text-gray-700 hover:text-[#0056a4]"
              title="Minha Conta"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Menu de Navegação Horizontal (Desktop) */}
        <nav className="hidden md:block border-t border-gray-100">
          <ul className="flex justify-start items-center py-3 gap-8 lg:gap-10 whitespace-nowrap overflow-x-auto no-scrollbar">
            {INITIAL_CATEGORIES.map((cat) => {
              const isActive = currentCategory === cat.slug;
              const isClassifieds = cat.slug === 'classificados';
              return (
                <li key={cat.id}>
                  <button
                    onClick={() => onSelectCategory(cat.slug)}
                    className={`text-xs font-black uppercase tracking-widest transition-all pb-1 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? isClassifieds
                          ? 'text-amber-600 border-amber-500 font-black'
                          : 'text-[#0056a4] border-[#0056a4]'
                        : isClassifieds
                          ? 'text-amber-600 hover:text-amber-700 border-transparent hover:border-amber-500'
                          : 'text-gray-800 hover:text-[#0056a4] border-transparent hover:border-[#0056a4]'
                    }`}
                  >
                    {isClassifieds && <Tag className="w-3 h-3 text-amber-500" />}
                    <span>{cat.name}</span>
                    {isClassifieds && (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-amber-500 text-white tracking-normal leading-none shadow-xs">
                        NOVO
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Banner no Mobile */}
        <div className="lg:hidden w-full py-2 border-t border-gray-50 overflow-hidden">
          {headerAd && <AdSlot ad={headerAd} />}
        </div>

        {/* Menu Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearchSubmit} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Buscar notícias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm w-full outline-none"
              />
            </form>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {INITIAL_CATEGORIES.map((cat) => {
                const isClassifieds = cat.slug === 'classificados';
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.slug);
                      setMobileMenuOpen(false);
                    }}
                    className={`text-left px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center justify-between ${
                      currentCategory === cat.slug
                        ? isClassifieds ? 'bg-amber-500 text-white' : 'bg-[#0056a4] text-white'
                        : isClassifieds
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isClassifieds && (
                      <span className="text-[8px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-black">
                        NOVO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {currentUser && onOpenMyClassifieds && (
              <div className="pt-2 flex flex-col gap-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    onOpenMyClassifieds();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  Meus Classificados
                </button>
                {(currentUser.role === 'admin' || currentUser.role === 'editor') && (
                  <button
                    onClick={() => {
                      onOpenAdmin();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#0056a4]" />
                    Painel Administrativo
                  </button>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs font-bold">
              {currentUser ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-gray-900">{currentUser.fullName}</span>
                  <button
                    onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
                    className="text-red-600 uppercase tracking-widest text-[10px]"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                    className="flex-1 py-2 bg-[#0056a4] text-white rounded text-center uppercase tracking-wider text-[10px]"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                    className="flex-1 py-2 bg-gray-100 text-gray-800 rounded text-center uppercase tracking-wider text-[10px]"
                  >
                    Cadastrar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
