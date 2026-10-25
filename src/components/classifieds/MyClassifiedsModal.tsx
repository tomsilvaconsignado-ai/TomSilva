import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit2, Trash2, PauseCircle, PlayCircle, RefreshCw, 
  AlertCircle, CheckCircle2, Clock, Eye, Ban, Calendar 
} from 'lucide-react';
import { ClassifiedItem, ClassifiedStatus, UserProfile } from '../../types/database';
import { classifiedsService } from '../../lib/supabase';
import { formatPrice } from './ClassifiedCard';
import { formatRelativeTime } from '../news/ArticleCard';

interface MyClassifiedsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onOpenCreateModal: () => void;
  onEditClassified: (item: ClassifiedItem) => void;
  onViewClassified: (item: ClassifiedItem) => void;
}

export const getStatusBadge = (status: ClassifiedStatus, rejectionReason?: string) => {
  switch (status) {
    case 'published':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
          Publicado
        </span>
      );
    case 'pending':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
          Pendente de Aprovação
        </span>
      );
    case 'rejected':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800" title={rejectionReason}>
          Reprovado
        </span>
      );
    case 'paused':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gray-200 text-gray-700">
          Pausado
        </span>
      );
    case 'expired':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800">
          Expirado
        </span>
      );
  }
};

export const MyClassifiedsModal: React.FC<MyClassifiedsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenCreateModal,
  onEditClassified,
  onViewClassified
}) => {
  const [items, setItems] = useState<ClassifiedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // As operações vão para o Supabase e podem falhar (sessão expirada, sem permissão, rede)
  const runSafely = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível concluir a operação.');
    }
  };

  const loadUserItems = async () => {
    setLoading(true);
    try {
      setItems(await classifiedsService.getUserClassifieds(currentUser.id));
    } catch (err: any) {
      alert(err?.message || 'Não foi possível carregar seus anúncios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserItems();
    }
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const handleTogglePause = (item: ClassifiedItem) => runSafely(async () => {
    const nextStatus: ClassifiedStatus = item.status === 'paused' ? 'published' : 'paused';
    await classifiedsService.updateClassifiedStatus(item.id, nextStatus, currentUser);
    await loadUserItems();
  });

  const handleDelete = (item: ClassifiedItem) => runSafely(async () => {
    if (window.confirm(`Tem certeza que deseja excluir o anúncio "${item.title}"?`)) {
      await classifiedsService.deleteClassified(item.id, currentUser);
      await loadUserItems();
    }
  });

  const handleRenew = (item: ClassifiedItem) => runSafely(async () => {
    await classifiedsService.renewClassified(item.id, currentUser);
    alert('Anúncio renovado por mais 30 dias!');
    await loadUserItems();
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">
              Meus Classificados
            </h2>
            <p className="text-xs text-gray-500">
              Gerencie seus anúncios publicados, pause, edite ou renove a qualquer momento.
            </p>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenCreateModal();
            }}
            className="px-4 py-2 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Anúncio
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0056a4]" />
            <p className="text-xs font-bold">Carregando seus anúncios...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0056a4] flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Você ainda não tem anúncios publicados</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Desapegue de produtos, anuncie seus serviços ou divulgue vagas de emprego agora mesmo.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenCreateModal();
              }}
              className="px-6 py-2.5 bg-[#0056a4] text-white font-black uppercase tracking-wider text-xs rounded-lg shadow-md cursor-pointer"
            >
              Publicar Meu Primeiro Anúncio
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs hover:border-[#0056a4]/30 transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
              >
                <div className="flex gap-4 items-center">
                  <img
                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=150&fit=crop'}
                    alt={item.title}
                    className="w-20 h-16 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getStatusBadge(item.status, item.rejectionReason)}
                      <span className="text-[10px] font-bold text-gray-400">
                        #{item.code}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        • {item.category}
                      </span>
                    </div>

                    <h4
                      onClick={() => {
                        onClose();
                        onViewClassified(item);
                      }}
                      className="text-sm font-bold text-gray-900 hover:text-[#0056a4] cursor-pointer line-clamp-1"
                    >
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-gray-500">
                      <span className="font-bold text-[#0056a4]">{formatPrice(item)}</span>
                      <span>• {item.city}-{item.state}</span>
                      <span>• {formatRelativeTime(item.createdAt)}</span>
                      <span className="flex items-center gap-1 font-bold">
                        <Eye className="w-3 h-3 text-[#0056a4]" /> {item.viewsCount || 0} views
                      </span>
                    </div>

                    {item.status === 'rejected' && item.rejectionReason && (
                      <p className="text-[11px] text-red-600 font-bold mt-1 bg-red-50 p-1.5 rounded">
                        Motivo da recusa: {item.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-50">
                  {/* Renovar se expirado */}
                  {item.status === 'expired' && (
                    <button
                      onClick={() => handleRenew(item)}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Renovar por mais 30 dias"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Renovar
                    </button>
                  )}

                  {/* Pausar / Reativar */}
                  {(item.status === 'published' || item.status === 'paused') && (
                    <button
                      onClick={() => handleTogglePause(item)}
                      className="p-2 text-gray-600 hover:text-[#0056a4] hover:bg-gray-100 rounded-lg cursor-pointer"
                      title={item.status === 'paused' ? 'Reativar Anúncio' : 'Pausar Anúncio'}
                    >
                      {item.status === 'paused' ? (
                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <PauseCircle className="w-4 h-4 text-amber-600" />
                      )}
                    </button>
                  )}

                  {/* Editar */}
                  <button
                    onClick={() => {
                      onClose();
                      onEditClassified(item);
                    }}
                    className="p-2 text-gray-600 hover:text-[#0056a4] hover:bg-gray-100 rounded-lg cursor-pointer"
                    title="Editar Anúncio"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Excluir */}
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Excluir Anúncio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
