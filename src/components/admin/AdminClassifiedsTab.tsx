import React, { useState, useEffect } from 'react';
import { 
  Check, X, AlertTriangle, Trash2, Edit2, PlayCircle, PauseCircle, 
  RefreshCw, Search, Plus, SlidersHorizontal, ShieldAlert, Tag, CheckCheck, Eye 
} from 'lucide-react';
import { 
  ClassifiedItem, ClassifiedCategory, ClassifiedReport, 
  ClassifiedsSettings, ClassifiedStatus, UserProfile 
} from '../../types/database';
import { classifiedsService } from '../../lib/supabase';
import { formatPrice } from '../classifieds/ClassifiedCard';
import { getStatusBadge } from '../classifieds/MyClassifiedsModal';
import { formatRelativeTime } from '../news/ArticleCard';

interface AdminClassifiedsTabProps {
  currentUser: UserProfile;
}

export const AdminClassifiedsTab: React.FC<AdminClassifiedsTabProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<'ads' | 'categories' | 'reports' | 'settings'>('ads');
  const [items, setItems] = useState<ClassifiedItem[]>([]);
  const [categories, setCategories] = useState<ClassifiedCategory[]>([]);
  const [reports, setReports] = useState<ClassifiedReport[]>([]);
  const [settings, setSettings] = useState<ClassifiedsSettings>({
    requireApproval: true,
    defaultValidityDays: 30
  });

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Rejeição
  const [rejectingItem, setRejectingItem] = useState<ClassifiedItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Nova categoria
  const [newCatName, setNewCatName] = useState('');
  const [newCatSection, setNewCatSection] = useState<'produtos_servicos' | 'vagas_emprego' | 'procuro_emprego'>('produtos_servicos');

  const loadAll = async () => {
    setLoading(true);
    const [fetchedItems, fetchedCats, fetchedReps, fetchedSets] = await Promise.all([
      classifiedsService.getClassifieds({ includeExpired: true }),
      classifiedsService.getCategories(),
      classifiedsService.getReports(),
      classifiedsService.getSettings()
    ]);
    setItems(fetchedItems);
    setCategories(fetchedCats);
    setReports(fetchedReps);
    setSettings(fetchedSets);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // As gravações vão para o Supabase e podem falhar (sessão expirada, sem permissão, rede)
  const runSafely = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível concluir a operação.');
    }
  };

  const handleApprove = (id: string) => runSafely(async () => {
    await classifiedsService.updateClassifiedStatus(id, 'published', currentUser);
    await loadAll();
  });

  const handleOpenReject = (item: ClassifiedItem) => {
    setRejectingItem(item);
    setRejectionReason('Conteúdo em desacordo com as regras do portal.');
  };

  const handleConfirmReject = () => runSafely(async () => {
    if (!rejectingItem) return;
    await classifiedsService.updateClassifiedStatus(
      rejectingItem.id,
      'rejected',
      currentUser,
      rejectionReason.trim()
    );
    setRejectingItem(null);
    await loadAll();
  });

  const handleToggleStatus = (item: ClassifiedItem) => runSafely(async () => {
    const nextStatus: ClassifiedStatus = item.status === 'paused' ? 'published' : 'paused';
    await classifiedsService.updateClassifiedStatus(item.id, nextStatus, currentUser);
    await loadAll();
  });

  const handleDelete = (id: string) => runSafely(async () => {
    if (window.confirm('Tem certeza que deseja remover este anúncio definitivamente?')) {
      await classifiedsService.deleteClassified(id, currentUser);
      await loadAll();
    }
  });

  const handleRenew = (item: ClassifiedItem) => runSafely(async () => {
    await classifiedsService.renewClassified(item.id, currentUser);
    await loadAll();
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    return runSafely(async () => {
      await classifiedsService.saveCategory({
        name: newCatName.trim(),
        section: newCatSection
      });
      setNewCatName('');
      await loadAll();
    });
  };

  const handleDeleteCategory = (id: string) => runSafely(async () => {
    if (window.confirm('Excluir esta categoria?')) {
      await classifiedsService.deleteCategory(id);
      await loadAll();
    }
  });

  const handleUpdateReportStatus = (id: string, status: 'resolved' | 'dismissed') => runSafely(async () => {
    await classifiedsService.updateReportStatus(id, status);
    await loadAll();
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    return runSafely(async () => {
      await classifiedsService.updateSettings(settings);
      alert('Configurações de classificados salvas com sucesso!');
    });
  };

  // Contadores
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const publishedCount = items.filter(i => i.status === 'published').length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  // Filtros de anúncios
  const filteredItems = items.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.advertiserName.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total de Anúncios</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{items.length}</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Pendentes de Moderação</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Publicados Ativos</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{publishedCount}</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${pendingReportsCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-red-800">Denúncias Pendentes</p>
          <p className="text-2xl font-black text-red-700 mt-1">{pendingReportsCount}</p>
        </div>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setSubTab('ads')}
          className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'ads' ? 'bg-[#0056a4] text-white shadow-xs' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Anúncios ({items.length})
        </button>

        <button
          onClick={() => setSubTab('categories')}
          className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'categories' ? 'bg-[#0056a4] text-white shadow-xs' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Categorias ({categories.length})
        </button>

        <button
          onClick={() => setSubTab('reports')}
          className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'reports' ? 'bg-[#0056a4] text-white shadow-xs' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          Denúncias {pendingReportsCount > 0 && `(${pendingReportsCount})`}
        </button>

        <button
          onClick={() => setSubTab('settings')}
          className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'settings' ? 'bg-[#0056a4] text-white shadow-xs' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Configurações de Validade & Aprovação
        </button>
      </div>

      {/* SUB-ABA 1: ANÚNCIOS */}
      {subTab === 'ads' && (
        <div className="space-y-4">
          {/* Barra de Filtro e Busca */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'published', 'paused', 'rejected', 'expired'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st === 'all' && 'Todos'}
                  {st === 'pending' && `Pendentes (${pendingCount})`}
                  {st === 'published' && 'Publicados'}
                  {st === 'paused' && 'Pausados'}
                  {st === 'rejected' && 'Reprovados'}
                  {st === 'expired' && 'Expirados'}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filtrar por título, código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
              />
            </div>
          </div>

          {/* Tabela de Anúncios */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Código & Foto</th>
                    <th className="py-3 px-4">Título & Anunciante</th>
                    <th className="py-3 px-4">Modalidade</th>
                    <th className="py-3 px-4">Preço</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Data & Validade</th>
                    <th className="py-3 px-4 text-right">Moderação / Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                        Nenhum anúncio encontrado para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <img
                              src={item.images?.[0] || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=80&fit=crop'}
                              alt={item.title}
                              className="w-12 h-10 object-cover rounded bg-gray-100 shrink-0"
                            />
                            <span className="font-mono font-bold text-[10px] text-gray-600">
                              #{item.code}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-bold text-gray-900 line-clamp-1">{item.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {item.advertiserName} ({item.city}-{item.state}) • Tel: {item.phone}
                          </p>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold text-gray-600 block">
                            {item.category}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-gray-400">
                            {item.section}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-[#0056a4]">
                          {formatPrice(item)}
                        </td>

                        <td className="py-3 px-4">
                          {getStatusBadge(item.status, item.rejectionReason)}
                        </td>

                        <td className="py-3 px-4 text-[10px] text-gray-500">
                          <p>{formatRelativeTime(item.createdAt)}</p>
                          <p className="text-[9px] text-gray-400">
                            Expira: {new Date(item.expiresAt).toLocaleDateString('pt-BR')}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Botão Aprovar se pendente ou reprovado */}
                          {item.status !== 'published' && (
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              title="Aprovar Anúncio"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Botão Reprovar se não foi reprovado */}
                          {item.status !== 'rejected' && (
                            <button
                              onClick={() => handleOpenReject(item)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Reprovar Anúncio"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          {/* Pausar/Reativar */}
                          {(item.status === 'published' || item.status === 'paused') && (
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                              title={item.status === 'paused' ? 'Reativar' : 'Pausar'}
                            >
                              {item.status === 'paused' ? (
                                <PlayCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <PauseCircle className="w-4 h-4 text-amber-600" />
                              )}
                            </button>
                          )}

                          {/* Renovar */}
                          {item.status === 'expired' && (
                            <button
                              onClick={() => handleRenew(item)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded cursor-pointer"
                              title="Renovar por mais 30 dias"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Deletar */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Excluir Anúncio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: CATEGORIAS */}
      {subTab === 'categories' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-6">
          <h3 className="text-base font-black uppercase tracking-tight text-gray-900 border-l-4 border-[#0056a4] pl-3">
            Gerenciador de Categorias de Classificados
          </h3>

          <form onSubmit={handleAddCategory} className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nome da Nova Categoria
              </label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Barcos e Náutica"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
              />
            </div>

            <div className="w-60">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Modalidade / Seção
              </label>
              <select
                value={newCatSection}
                onChange={(e) => setNewCatSection(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
              >
                <option value="produtos_servicos">Produtos e Serviços</option>
                <option value="vagas_emprego">Vagas de Emprego</option>
                <option value="procuro_emprego">Procuro Emprego</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-wider text-xs rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['produtos_servicos', 'vagas_emprego', 'procuro_emprego'] as const).map((sec) => (
              <div key={sec} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-gray-900 border-b pb-2 border-gray-200">
                  {sec === 'produtos_servicos' && 'Produtos e Serviços'}
                  {sec === 'vagas_emprego' && 'Vagas de Emprego'}
                  {sec === 'procuro_emprego' && 'Procuro Emprego'}
                </h4>
                <div className="space-y-1.5">
                  {categories.filter(c => c.section === sec).map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-gray-100">
                      <span className="font-bold text-gray-800">{cat.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Remover Categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: DENÚNCIAS */}
      {subTab === 'reports' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
          <h3 className="text-base font-black uppercase tracking-tight text-gray-900 border-l-4 border-red-600 pl-3">
            Denúncias de Anúncios Recebidas ({reports.length})
          </h3>

          {reports.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-6 text-center">
              Nenhuma denúncia registrada até o momento.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-800">
                        {rep.reason}
                      </span>
                      <strong className="text-xs text-gray-900">Anúncio: {rep.classifiedTitle}</strong>
                      <span className="text-[10px] text-gray-400">({formatRelativeTime(rep.createdAt)})</span>
                    </div>
                    <p className="text-xs text-gray-700 bg-white p-2.5 rounded border border-gray-200">
                      "{rep.details}"
                    </p>
                    {rep.reporterEmail && (
                      <p className="text-[10px] text-gray-500">
                        Denunciante: {rep.reporterName || 'Anônimo'} ({rep.reporterEmail})
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {rep.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleUpdateReportStatus(rep.id, 'resolved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => handleUpdateReportStatus(rep.id, 'dismissed')}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-bold cursor-pointer"
                        >
                          Descartar
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        {rep.status === 'resolved' ? 'Resolvido' : 'Descartado'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 4: CONFIGURAÇÕES */}
      {subTab === 'settings' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 space-y-6 max-w-xl">
          <h3 className="text-base font-black uppercase tracking-tight text-gray-900 border-l-4 border-[#0056a4] pl-3">
            Configurações do Módulo Classificados
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireApproval}
                  onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                  className="w-4 h-4 text-[#0056a4] rounded cursor-pointer"
                />
                <div>
                  <strong className="text-xs text-gray-900 block">Aprovação Prévia Obrigatória (Recomendado)</strong>
                  <span className="text-[11px] text-gray-500 block leading-tight">
                    Quando ativado, novos anúncios de usuários ficam como "Pendentes de Aprovação" até um administrador aprovar.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Prazo de Validade Padrão dos Anúncios (em dias)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.defaultValidityDays}
                onChange={(e) => setSettings({ ...settings, defaultValidityDays: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0056a4]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Ao vencer esse prazo, o anúncio expira automaticamente e sai das pesquisas públicas.
              </p>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-wider text-xs rounded-lg transition-all shadow-md cursor-pointer"
            >
              Salvar Configurações
            </button>
          </form>
        </div>
      )}

      {/* Modal de Rejeição de Anúncio com Motivo */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-black uppercase text-red-600 mb-2">
              Reprovar Anúncio
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Informe o motivo da reprovação de <strong className="text-gray-900">"{rejectingItem.title}"</strong> para que o anunciante saiba o que corrigir:
            </p>

            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-red-500 resize-none"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Confirmar Reprovação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
