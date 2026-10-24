import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Settings, X, ExternalLink, Sparkles, SlidersHorizontal, CheckCheck } from 'lucide-react';
import { NotificationItem, UserProfile } from '../../types/database';
import { notificationsService, authService } from '../../lib/supabase';
import { INITIAL_CATEGORIES } from '../../data/initialData';
import { formatRelativeTime } from '../news/ArticleCard';

interface NotificationBellProps {
  currentUser: UserProfile;
  onSelectArticleSlug: (slug: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onSelectArticleSlug
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    currentUser.interests || ['Política', 'Cidades']
  );
  const [savingInterests, setSavingInterests] = useState(false);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!currentUser) return;
    const items = await notificationsService.getNotifications(currentUser.id);
    setNotifications(items);
    setUnreadCount(items.filter(n => !n.read).length);
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    const handleNewNotification = (e: any) => {
      const newItems: NotificationItem[] = e.detail || [];
      const forCurrent = newItems.find(n => n.userId === currentUser.id);
      if (forCurrent) {
        setToastNotification(forCurrent);
        loadNotifications();
        setTimeout(() => setToastNotification(null), 7000);
      }
    };

    window.addEventListener('folha_notifications_updated', handleUpdate);
    window.addEventListener('folha_new_notification', handleNewNotification);

    // Fechar ao clicar fora
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('folha_notifications_updated', handleUpdate);
      window.removeEventListener('folha_new_notification', handleNewNotification);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentUser.id]);

  useEffect(() => {
    setSelectedInterests(currentUser.interests || ['Política', 'Cidades']);
  }, [currentUser.interests]);

  const handleMarkAsRead = async (notif: NotificationItem) => {
    await notificationsService.markAsRead(notif.id);
    setIsOpen(false);
    onSelectArticleSlug(notif.articleSlug);
  };

  const handleMarkAllRead = async () => {
    await notificationsService.markAllAsRead(currentUser.id);
    await loadNotifications();
  };

  const handleToggleInterest = (categoryName: string) => {
    if (selectedInterests.includes(categoryName)) {
      if (selectedInterests.length > 1) {
        setSelectedInterests(selectedInterests.filter(c => c !== categoryName));
      }
    } else {
      setSelectedInterests([...selectedInterests, categoryName]);
    }
  };

  const handleSavePreferences = async () => {
    setSavingInterests(true);
    try {
      await authService.updateInterests(currentUser.id, selectedInterests);
      setIsPreferencesOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Não foi possível salvar suas preferências.');
    } finally {
      setSavingInterests(false);
    }
  };

  // Categorias disponíveis para preferências (exceto 'Início')
  const availableCategories = INITIAL_CATEGORIES
    .filter(c => c.slug !== 'todos')
    .map(c => c.name);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão Sino com Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-[#0056a4] hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        title="Notificações de novas matérias"
        aria-label="Notificações"
      >
        <Bell className="w-4 h-4 md:w-4.5 md:h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header do Dropdown */}
          <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0056a4]" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                Notificações
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-full">
                  {unreadCount} nova(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsOpen(false); setIsPreferencesOpen(true); }}
                className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Configurar Categorias de Interesse"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-gray-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Lidas
                </button>
              )}
            </div>
          </div>

          {/* Categorias ativas do usuário */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-gray-500 truncate max-w-[220px]">
              <span className="font-bold text-gray-700">Seus Interesses:</span>
              <span className="truncate">{selectedInterests.join(', ')}</span>
            </div>
            <button
              onClick={() => { setIsOpen(false); setIsPreferencesOpen(true); }}
              className="text-[#0056a4] hover:underline font-bold shrink-0 text-[10px] uppercase cursor-pointer"
            >
              Ajustar
            </button>
          </div>

          {/* Lista de Alertas */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold text-gray-600">Nenhum alerta no momento</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Você será avisado sempre que sair uma nova matéria em suas categorias de interesse.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif)}
                  className={`p-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer flex gap-3 items-start ${
                    !notif.read ? 'bg-blue-50/20' : 'bg-white'
                  }`}
                >
                  {notif.imageUrl ? (
                    <img
                      src={notif.imageUrl}
                      alt={notif.articleTitle}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#0056a4] text-white flex items-center justify-center shrink-0 font-black text-xs">
                      FR
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-[#0056a4] text-[9px] font-black uppercase tracking-wider rounded">
                        {notif.category}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className={`text-xs leading-snug line-clamp-2 ${!notif.read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                      {notif.articleTitle}
                    </p>
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#0056a4] mt-1 shrink-0"></span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer do Dropdown */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
            <button
              onClick={() => { setIsOpen(false); setIsPreferencesOpen(true); }}
              className="text-[10px] font-black uppercase tracking-wider text-gray-600 hover:text-[#0056a4] transition-colors cursor-pointer"
            >
              Personalizar Categorias de Notificação →
            </button>
          </div>
        </div>
      )}

      {/* Modal de Preferências de Interesses */}
      {isPreferencesOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsPreferencesOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="w-5 h-5 text-[#0056a4]" />
              <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                Suas Categorias de Interesse
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Marque os temas que você mais gosta. Nós avisaremos você automaticamente no sino de notificações quando houver novas matérias publicadas.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {availableCategories.map((cat) => {
                const isChecked = selectedInterests.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleInterest(cat)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'border-[#0056a4] bg-blue-50/70 text-[#0056a4] font-black'
                        : 'border-gray-200 bg-gray-50 text-gray-700 font-bold hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider">{cat}</span>
                    {isChecked ? (
                      <span className="w-4 h-4 rounded-full bg-[#0056a4] text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-300"></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-[#0056a4] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#0056a4] leading-relaxed">
                As notificações aparecerão no topo do portal sempre que você estiver logado com sua conta da Folha da Região.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingInterests}
                onClick={handleSavePreferences}
                className="px-5 py-2 bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-wider text-xs rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {savingInterests ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Flutuante em Tempo Real */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm bg-gray-900 text-white rounded-2xl p-4 shadow-2xl border border-gray-800 flex gap-3 items-start animate-in slide-in-from-bottom-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-[#0056a4] text-white flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-yellow-300 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0056a4] bg-blue-950 px-2 py-0.5 rounded">
                Alerta • {toastNotification.category}
              </span>
              <button
                onClick={() => setToastNotification(null)}
                className="text-gray-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-bold leading-tight text-white line-clamp-2">
              {toastNotification.articleTitle}
            </p>

            <button
              onClick={() => {
                setToastNotification(null);
                handleMarkAsRead(toastNotification);
              }}
              className="mt-2 text-[10px] font-black uppercase tracking-wider text-blue-300 hover:text-blue-200 hover:underline cursor-pointer"
            >
              Ler Notícia Agora →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
