import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Shield, ShieldAlert, CheckCircle2, 
  AlertCircle, Building2, User, Phone, MapPin, Calendar, 
  Mail, Send, Eye, EyeOff, FileText, ChevronLeft, ChevronRight, 
  RotateCw, Filter, Check, X, Tag, History, AlertTriangle, 
  Lock, ArrowUpRight, Ban, UserCheck, ShieldCheck
} from 'lucide-react';
import { UserProfile, UserRole, UserStatus, UserAuditLog, ClassifiedReport } from '../../types/database';
import { usersService } from '../../lib/supabase';

interface AdminManageUsersProps {
  currentUser: UserProfile;
}

export const AdminManageUsers: React.FC<AdminManageUsersProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailConfirmFilter, setEmailConfirmFilter] = useState<string>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Contadores de classificados por usuário { [userId]: { total, published, pending, rejected } }
  const [classifiedCounts, setClassifiedCounts] = useState<Record<string, { total: number; published: number; pending: number; rejected: number }>>({});

  // Ficha de Detalhes do Usuário Selecionado
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userReports, setUserReports] = useState<ClassifiedReport[]>([]);
  const [userAuditLogs, setUserAuditLogs] = useState<UserAuditLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showSensitiveDoc, setShowSensitiveDoc] = useState(false);

  // Modal de Ação de Moderação (Suspender / Bloquear / Reativar)
  const [moderationModal, setModerationModal] = useState<{
    isOpen: boolean;
    user: UserProfile | null;
    targetStatus: UserStatus | null;
    reason: string;
    submitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    user: null,
    targetStatus: null,
    reason: '',
    submitting: false,
    error: null
  });

  // Modal de Alteração de Papel Administrativo (Restrito com Justificativa)
  const [roleModal, setRoleModal] = useState<{
    isOpen: boolean;
    user: UserProfile | null;
    newRole: UserRole;
    reason: string;
    submitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    user: null,
    newRole: 'reader',
    reason: '',
    submitting: false,
    error: null
  });

  // Modal Geral de Auditoria do Sistema
  const [showFullAuditModal, setShowFullAuditModal] = useState(false);
  const [allAuditLogs, setAllAuditLogs] = useState<UserAuditLog[]>([]);

  // Carregar Lista de Usuários
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.getAllUsers(currentUser);
      setUsers(data);

      // Carregar contagens de classificados de cada usuário
      const counts: Record<string, { total: number; published: number; pending: number; rejected: number }> = {};
      for (const u of data) {
        counts[u.id] = await usersService.getUserClassifiedsCount(u.id);
      }
      setClassifiedCounts(counts);
    } catch (err: any) {
      setNotice({ message: err?.message || 'Erro ao carregar usuários.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Carregar detalhes ao selecionar um usuário
  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setShowSensitiveDoc(false);
    setLoadingDetails(true);
    try {
      const [reports, logs] = await Promise.all([
        usersService.getUserReports(user.id),
        usersService.getAuditLogs(user.id)
      ]);
      setUserReports(reports);
      setUserAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenFullAudit = async () => {
    const logs = await usersService.getAuditLogs();
    setAllAuditLogs(logs);
    setShowFullAuditModal(true);
  };

  // Submeter Moderação de Status
  const handleConfirmModeration = async () => {
    if (!moderationModal.user || !moderationModal.targetStatus) return;

    if (!moderationModal.reason.trim() || moderationModal.reason.trim().length < 5) {
      setModerationModal(prev => ({
        ...prev,
        error: 'É obrigatório informar uma justificativa detalhada (mínimo de 5 caracteres).'
      }));
      return;
    }

    setModerationModal(prev => ({ ...prev, submitting: true, error: null }));
    try {
      const updated = await usersService.moderateUserStatus(
        moderationModal.user.id,
        moderationModal.targetStatus,
        moderationModal.reason.trim(),
        currentUser
      );

      setNotice({
        message: `Situação do usuário alterada para "${
          moderationModal.targetStatus === 'active' 
            ? 'Ativo' 
            : moderationModal.targetStatus === 'suspended' 
              ? 'Suspenso' 
              : 'Bloqueado'
        }" com sucesso!`,
        type: 'success'
      });

      // Se o usuário selecionado for este mesmo, atualiza na ficha
      if (selectedUser?.id === updated.id) {
        setSelectedUser(updated);
        const logs = await usersService.getAuditLogs(updated.id);
        setUserAuditLogs(logs);
      }

      setModerationModal({
        isOpen: false,
        user: null,
        targetStatus: null,
        reason: '',
        submitting: false,
        error: null
      });

      await loadUsers();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setModerationModal(prev => ({
        ...prev,
        submitting: false,
        error: err?.message || 'Erro ao aplicar ação de moderação.'
      }));
    }
  };

  // Submeter Alteração de Papel
  const handleConfirmRoleChange = async () => {
    if (!roleModal.user) return;

    if (!roleModal.reason.trim() || roleModal.reason.trim().length < 5) {
      setRoleModal(prev => ({
        ...prev,
        error: 'É obrigatório informar uma justificativa fundamentada para alterar o papel.'
      }));
      return;
    }

    setRoleModal(prev => ({ ...prev, submitting: true, error: null }));
    try {
      await usersService.updateUserRoleProtected(
        roleModal.user.id,
        roleModal.newRole,
        roleModal.reason.trim(),
        currentUser
      );

      setNotice({
        message: `Papel do usuário atualizado para "${roleModal.newRole}". Auditoria registrada.`,
        type: 'success'
      });

      if (selectedUser?.id === roleModal.user.id) {
        setSelectedUser({ ...selectedUser, role: roleModal.newRole });
        const logs = await usersService.getAuditLogs(roleModal.user.id);
        setUserAuditLogs(logs);
      }

      setRoleModal({
        isOpen: false,
        user: null,
        newRole: 'reader',
        reason: '',
        submitting: false,
        error: null
      });

      await loadUsers();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setRoleModal(prev => ({
        ...prev,
        submitting: false,
        error: err?.message || 'Erro ao alterar papel.'
      }));
    }
  };

  // Reenviar confirmação de e-mail pelo administrador
  const handleAdminResendEmail = async (user: UserProfile) => {
    try {
      const res = await usersService.adminResendConfirmation(user.id, currentUser);
      setNotice({ message: res.message, type: res.success ? 'success' : 'error' });
      if (selectedUser?.id === user.id) {
        const logs = await usersService.getAuditLogs(user.id);
        setUserAuditLogs(logs);
      }
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice({ message: err?.message || 'Erro ao reenviar e-mail.', type: 'error' });
      setTimeout(() => setNotice(null), 4000);
    }
  };

  // Forçar confirmação manual pelo administrador
  const handleAdminForceConfirmEmail = async (user: UserProfile) => {
    if (!window.confirm(`Confirma manualmente o endereço de e-mail (${user.email}) para o usuário ${user.fullName}?`)) {
      return;
    }

    try {
      await usersService.adminForceConfirmEmail(user.id, currentUser);
      setNotice({ message: `E-mail de ${user.fullName} confirmado manualmente com sucesso!`, type: 'success' });
      await loadUsers();
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, emailConfirmed: true, emailConfirmedAt: new Date().toISOString() });
        const logs = await usersService.getAuditLogs(user.id);
        setUserAuditLogs(logs);
      }
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice({ message: err?.message || 'Erro ao confirmar e-mail.', type: 'error' });
      setTimeout(() => setNotice(null), 4000);
    }
  };

  // Filtragem
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      u.fullName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.phone && u.phone.includes(term)) ||
      (u.companyName && u.companyName.toLowerCase().includes(term)) ||
      (u.tradeName && u.tradeName.toLowerCase().includes(term)) ||
      (u.city && u.city.toLowerCase().includes(term));

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && (!u.status || u.status === 'active')) ||
      u.status === statusFilter;

    const matchesEmailConfirm = 
      emailConfirmFilter === 'all' ||
      (emailConfirmFilter === 'confirmed' && Boolean(u.emailConfirmed)) ||
      (emailConfirmFilter === 'unconfirmed' && !u.emailConfirmed);

    const matchesType = 
      accountTypeFilter === 'all' || 
      (u.accountType || 'pf') === accountTypeFilter;

    let matchesDate = true;
    if (dateFilter !== 'all' && u.createdAt) {
      const regTime = new Date(u.createdAt).getTime();
      const now = Date.now();
      if (dateFilter === '7d') {
        matchesDate = now - regTime <= 7 * 24 * 3600 * 1000;
      } else if (dateFilter === '30d') {
        matchesDate = now - regTime <= 30 * 24 * 3600 * 1000;
      } else if (dateFilter === '90d') {
        matchesDate = now - regTime <= 90 * 24 * 3600 * 1000;
      }
    }

    return matchesSearch && matchesStatus && matchesEmailConfirm && matchesType && matchesDate;
  });

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Topo do Módulo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-700">
              Módulo de Controle e Moderação
            </span>
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
            Gerenciar Usuários do Portal
          </h2>
          <p className="text-xs text-gray-500">
            Acesso centralizado para consulta, moderação de anunciantes, segurança de credenciais e histórico auditado.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenFullAudit}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-gray-200"
            title="Consultar Histórico Completo de Auditoria Administrativa"
          >
            <History className="w-4 h-4 text-gray-600" />
            <span>Auditoria Geral</span>
          </button>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition-colors cursor-pointer"
            title="Atualizar lista de usuários"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0056a4]' : ''}`} />
          </button>

          <span className="px-3 py-2 bg-cyan-50 text-cyan-900 text-xs font-bold rounded-xl border border-cyan-200 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-600" />
            <span>{users.length} usuários cadastrados</span>
          </span>
        </div>
      </div>

      {notice && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in ${
          notice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Barra de Filtros e Pesquisa Avançada */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Busca por Texto */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Pesquisar por nome, e-mail, telefone, empresa ou cidade..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Filtro: Situação da Conta */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-[#0056a4]"
            >
              <option value="all">Todas as Situações</option>
              <option value="active">Apenas Ativos</option>
              <option value="suspended">Apenas Suspensos</option>
              <option value="blocked">Apenas Bloqueados</option>
            </select>
          </div>

          {/* Filtro: Confirmação de E-mail */}
          <div className="md:col-span-2">
            <select
              value={emailConfirmFilter}
              onChange={(e) => { setEmailConfirmFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-[#0056a4]"
            >
              <option value="all">Confirmação de E-mail</option>
              <option value="confirmed">E-mail Confirmado</option>
              <option value="unconfirmed">E-mail Pendente</option>
            </select>
          </div>

          {/* Filtro: Tipo de Cadastro (PF / PJ) */}
          <div className="md:col-span-3">
            <select
              value={accountTypeFilter}
              onChange={(e) => { setAccountTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-[#0056a4]"
            >
              <option value="all">Pessoa Física & Jurídica</option>
              <option value="pf">Pessoa Física (CPF)</option>
              <option value="pj">Pessoa Jurídica (CNPJ)</option>
            </select>
          </div>
        </div>

        {/* Linha secundária de filtros rápidos e contador */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 font-bold">Data de Registro:</span>
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'Todo o Período' },
                { id: '7d', label: 'Últimos 7 dias' },
                { id: '30d', label: 'Últimos 30 dias' },
                { id: '90d', label: 'Últimos 90 dias' }
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => { setDateFilter(d.id); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    dateFilter === d.id 
                      ? 'bg-gray-900 text-white shadow-xs' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-gray-400 text-[11px] font-bold">
            Exibindo {paginatedUsers.length} de {filteredUsers.length} resultados filtrados
          </div>
        </div>
      </div>

      {/* Tabela de Usuários com Paginação */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-6 h-6 animate-spin text-[#0056a4]" />
            <span className="text-xs font-bold uppercase tracking-wider">Carregando lista completa de usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-bold text-sm text-gray-700">Nenhum usuário encontrado</p>
            <p className="text-xs text-gray-400 mt-1">
              Verifique os filtros aplicados ou limpe a busca para listar os usuários cadastrados.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setEmailConfirmFilter('all');
                setAccountTypeFilter('all');
                setDateFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                  <th className="py-3.5 px-4">Nome / Identificação</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Contato / Localização</th>
                  <th className="py-3.5 px-4">Cadastro</th>
                  <th className="py-3.5 px-4 text-center">E-mail</th>
                  <th className="py-3.5 px-4 text-center">Situação</th>
                  <th className="py-3.5 px-4 text-center">Classificados</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {paginatedUsers.map((u) => {
                  const isPF = (u.accountType || 'pf') === 'pf';
                  const isSuspended = u.status === 'suspended';
                  const isBlocked = u.status === 'blocked';
                  const isProtectedAdmin = u.email.toLowerCase() === 'tomsilvaconsignado@gmail.com';
                  const counts = classifiedCounts[u.id] || { total: 0, published: 0, pending: 0, rejected: 0 };

                  return (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${
                        selectedUser?.id === u.id ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Nome / Identificação */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`}
                            alt={u.fullName}
                            className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 truncate max-w-[200px]" title={u.fullName}>
                                {u.fullName}
                              </p>
                              {u.role === 'admin' && (
                                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[9px] font-black rounded uppercase tracking-wider border border-red-200">
                                  Admin
                                </span>
                              )}
                              {u.role === 'editor' && (
                                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase tracking-wider border border-blue-200">
                                  Editor
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate max-w-[200px]" title={u.email}>
                              {u.email}
                            </p>
                            {u.tradeName && (
                              <p className="text-[10px] text-purple-700 font-bold truncate max-w-[180px]">
                                Fantasia: {u.tradeName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo de Cadastro */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          isPF ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          {isPF ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </span>
                      </td>

                      {/* Contato & Localização */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 whitespace-nowrap">{u.phone || 'Sem telefone'}</p>
                        <p className="text-[11px] text-gray-400">
                          {u.city ? `${u.city} - ${u.state || 'SE'}` : 'Sergipe'}
                        </p>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'Data n/d'}
                          </span>
                        </div>
                      </td>

                      {/* Situação da Confirmação de E-mail */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {u.emailConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Confirmado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-black uppercase rounded-full border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* Situação da Conta */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded-full border border-gray-700">
                            <Ban className="w-3 h-3 text-red-400" />
                            Bloqueado
                          </span>
                        ) : isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-full border border-red-200">
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            Suspenso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Ativo
                          </span>
                        )}
                      </td>

                      {/* Classificados Publicados */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleSelectUser(u)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[11px] font-bold text-gray-700 transition-colors cursor-pointer"
                          title="Clique para ver classificados na ficha detalhada"
                        >
                          <Tag className="w-3 h-3 inline mr-1 text-amber-600" />
                          <span>{counts.total} anúncio(s)</span>
                        </button>
                      </td>

                      {/* Ações de Moderação */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSelectUser(u)}
                            className="p-1.5 bg-gray-100 hover:bg-[#0056a4] hover:text-white text-gray-700 rounded-lg transition-all cursor-pointer"
                            title="Consultar ficha completa do usuário"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Se for conta protegida do Administrador Principal, não permite suspensão */}
                          {isProtectedAdmin ? (
                            <span 
                              className="px-2 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-lg cursor-not-allowed"
                              title="Conta do administrador principal protegida pelo sistema"
                            >
                              Protegido
                            </span>
                          ) : (
                            <>
                              {isSuspended || isBlocked ? (
                                <button
                                  onClick={() => setModerationModal({
                                    isOpen: true,
                                    user: u,
                                    targetStatus: 'active',
                                    reason: '',
                                    submitting: false,
                                    error: null
                                  })}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                  title="Reativar conta do usuário"
                                >
                                  Reativar
                                </button>
                              ) : (
                                <button
                                  onClick={() => setModerationModal({
                                    isOpen: true,
                                    user: u,
                                    targetStatus: 'suspended',
                                    reason: '',
                                    submitting: false,
                                    error: null
                                  })}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-lg border border-red-200 transition-colors cursor-pointer"
                                  title="Suspender conta do usuário com justificativa"
                                >
                                  Suspender
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé da Tabela: Paginação */}
        {filteredUsers.length > pageSize && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs font-bold text-gray-600">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          PAINEL DE DETALHES / FICHA CADASTRAL DO USUÁRIO SELECIONADO
      ========================================================================== */}
      {selectedUser && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl space-y-6 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img
                src={selectedUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.fullName)}`}
                alt={selectedUser.fullName}
                className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                    {selectedUser.fullName}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    (selectedUser.accountType || 'pf') === 'pf' 
                      ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                      : 'bg-purple-50 text-purple-800 border border-purple-200'
                  }`}>
                    {(selectedUser.accountType || 'pf') === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                title="Fechar ficha de detalhes"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Grid de Informações Cadastrais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bloco 1: Identificação e Contato */}
            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0056a4]" />
                <span>Dados de Identificação</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Nome Completo:</span>
                  <span className="font-bold text-gray-900">{selectedUser.fullName}</span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">E-mail:</span>
                  <span className="font-medium text-gray-800">{selectedUser.email}</span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Telefone:</span>
                  <span className="font-medium text-gray-800">{selectedUser.phone || 'Não informado'}</span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Localização:</span>
                  <span className="font-medium text-gray-800">
                    {selectedUser.city ? `${selectedUser.city} - ${selectedUser.state || 'SE'}` : 'Não informada'}
                  </span>
                </div>

                {/* Exibição Protegida de CPF/CNPJ (LGPD & Segurança) */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">
                      {(selectedUser.accountType || 'pf') === 'pf' ? 'CPF (Protegido):' : 'CNPJ (Protegido):'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSensitiveDoc(!showSensitiveDoc)}
                      className="text-[10px] text-[#0056a4] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showSensitiveDoc ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showSensitiveDoc ? 'Ocultar' : 'Visualizar para Auditoria'}
                    </button>
                  </div>
                  <p className="font-mono text-xs font-bold text-gray-800 mt-0.5">
                    {showSensitiveDoc ? (
                      (selectedUser.accountType || 'pf') === 'pf' 
                        ? (selectedUser.cpf || 'Não informado') 
                        : (selectedUser.cnpj || 'Não informado')
                    ) : (
                      '••••••••••••••'
                    )}
                  </p>
                </div>

                {selectedUser.companyName && (
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Razão Social:</span>
                    <span className="font-medium text-gray-800">{selectedUser.companyName}</span>
                  </div>
                )}
                {selectedUser.tradeName && (
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold uppercase">Nome Fantasia:</span>
                    <span className="font-medium text-gray-800">{selectedUser.tradeName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 2: Segurança, Papéis e Situação */}
            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Situação e Credenciais</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Situação da Conta:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                      selectedUser.status === 'blocked'
                        ? 'bg-black text-white'
                        : selectedUser.status === 'suspended'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedUser.status === 'blocked' ? 'Bloqueado' : selectedUser.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                    </span>

                    {/* Botões de Ação Imediata */}
                    {selectedUser.email.toLowerCase() !== 'tomsilvaconsignado@gmail.com' && (
                      <div className="flex gap-1">
                        {selectedUser.status === 'active' || !selectedUser.status ? (
                          <>
                            <button
                              onClick={() => setModerationModal({
                                isOpen: true,
                                user: selectedUser,
                                targetStatus: 'suspended',
                                reason: '',
                                submitting: false,
                                error: null
                              })}
                              className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded cursor-pointer"
                            >
                              Suspender
                            </button>
                            <button
                              onClick={() => setModerationModal({
                                isOpen: true,
                                user: selectedUser,
                                targetStatus: 'blocked',
                                reason: '',
                                submitting: false,
                                error: null
                              })}
                              className="px-2 py-0.5 bg-gray-900 hover:bg-black text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Bloquear
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setModerationModal({
                              isOpen: true,
                              user: selectedUser,
                              targetStatus: 'active',
                              reason: '',
                              submitting: false,
                              error: null
                            })}
                            className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded cursor-pointer"
                          >
                            Reativar
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedUser.moderationReason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-800">
                      <strong>Motivo:</strong> {selectedUser.moderationReason}
                      {selectedUser.moderationAt && (
                        <span className="block text-[10px] text-red-500 mt-0.5">
                          Em: {new Date(selectedUser.moderationAt).toLocaleString('pt-BR')} por {selectedUser.moderatedBy || 'Administrador'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirmação de E-mail */}
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-400 block text-[10px] font-bold uppercase">Confirmação de E-mail:</span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      selectedUser.emailConfirmed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {selectedUser.emailConfirmed ? 'Confirmado' : 'Pendente de Confirmação'}
                    </span>
                    {!selectedUser.emailConfirmed && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAdminResendEmail(selectedUser)}
                          className="px-2 py-1 bg-[#0056a4] hover:bg-[#004482] text-white rounded text-[10px] font-bold cursor-pointer"
                          title="Reenviar link de confirmação para o e-mail do usuário"
                        >
                          Reenviar Link
                        </button>
                        <button
                          onClick={() => handleAdminForceConfirmEmail(selectedUser)}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-[10px] font-bold cursor-pointer"
                          title="Confirmar manualmente pelo administrador"
                        >
                          Confirmar Manual
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedUser.emailConfirmedAt && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Confirmado em: {new Date(selectedUser.emailConfirmedAt).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>

                {/* Papel do Usuário (Fluxo Protegido) */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-[10px] font-bold uppercase">Papel de Acesso:</span>
                    {currentUser.role === 'admin' && selectedUser.email.toLowerCase() !== 'tomsilvaconsignado@gmail.com' && (
                      <button
                        onClick={() => setRoleModal({
                          isOpen: true,
                          user: selectedUser,
                          newRole: selectedUser.role,
                          reason: '',
                          submitting: false,
                          error: null
                        })}
                        className="text-[10px] text-[#0056a4] hover:underline font-bold cursor-pointer"
                      >
                        Alterar Papel com Auditoria
                      </button>
                    )}
                  </div>
                  <span className="font-bold text-gray-900 uppercase text-xs">
                    {selectedUser.role === 'admin' ? 'Administrador Geral' : selectedUser.role === 'editor' ? 'Editor de Notícias' : 'Leitor / Anunciante'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 3: Classificados e Denúncias */}
            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Classificados & Denúncias</span>
              </h4>

              <div className="space-y-3 text-xs">
                {/* Resumo de Anúncios */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Total</span>
                    <span className="text-base font-black text-gray-900">
                      {classifiedCounts[selectedUser.id]?.total || 0}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Publicados</span>
                    <span className="text-base font-black text-emerald-700">
                      {classifiedCounts[selectedUser.id]?.published || 0}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Pendentes</span>
                    <span className="text-base font-black text-amber-700">
                      {classifiedCounts[selectedUser.id]?.pending || 0}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-center">
                    <span className="text-[10px] font-bold text-red-600 uppercase block">Recusados</span>
                    <span className="text-base font-black text-red-700">
                      {classifiedCounts[selectedUser.id]?.rejected || 0}
                    </span>
                  </div>
                </div>

                {/* Denúncias Recebidas */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-[10px] font-bold uppercase">Denúncias Relacionadas:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      userReports.length > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {userReports.length} denúncia(s)
                    </span>
                  </div>

                  {userReports.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">Nenhuma denúncia registrada contra anúncios deste usuário.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {userReports.map(rep => (
                        <div key={rep.id} className="p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-900">
                          <p className="font-bold">Motivo: {rep.reason}</p>
                          <p className="truncate text-red-700">Anúncio: {rep.classifiedTitle}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de Auditoria do Usuário */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-[#0056a4]" />
              <span>Histórico de Moderação e Auditoria da Conta ({userAuditLogs.length} registros)</span>
            </h4>

            {userAuditLogs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhuma ação administrativa registrada para esta conta até o momento.</p>
            ) : (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100/70 border-b border-gray-200 font-black uppercase text-gray-500">
                      <th className="p-2.5">Data / Hora</th>
                      <th className="p-2.5">Ação Realizada</th>
                      <th className="p-2.5">Administrador Responsável</th>
                      <th className="p-2.5">Justificativa Registrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    {userAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/80">
                        <td className="p-2.5 whitespace-nowrap text-gray-500">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-bold">
                          {log.action === 'suspend' && <span className="text-red-600">Suspensão de Conta</span>}
                          {log.action === 'reactivate' && <span className="text-emerald-600">Reativação de Conta</span>}
                          {log.action === 'block' && <span className="text-black">Bloqueio Definitivo</span>}
                          {log.action === 'resend_confirmation' && <span className="text-blue-600">Reenvio de Confirmação</span>}
                          {log.action === 'confirm_email' && <span className="text-purple-600">Confirmação Manual</span>}
                          {log.action === 'change_role' && <span className="text-amber-600">Alteração de Papel</span>}
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-medium text-gray-900">
                          {log.adminName} ({log.adminEmail})
                        </td>
                        <td className="p-2.5 text-gray-600">
                          {log.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE CONFIRMAÇÃO DE MODERAÇÃO COM JUSTIFICATIVA OBRIGATÓRIA
      ========================================================================== */}
      {moderationModal.isOpen && moderationModal.user && moderationModal.targetStatus && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  moderationModal.targetStatus === 'active' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {moderationModal.targetStatus === 'active' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                    {moderationModal.targetStatus === 'active' && 'Confirmar Reativação de Conta'}
                    {moderationModal.targetStatus === 'suspended' && 'Confirmar Suspensão de Conta'}
                    {moderationModal.targetStatus === 'blocked' && 'Confirmar Bloqueio de Conta'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Ação administrativa aplicada a: <strong>{moderationModal.user.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModerationModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {moderationModal.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{moderationModal.error}</span>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-700 leading-relaxed">
                {moderationModal.targetStatus === 'suspended' && (
                  <p>
                    <strong>Efeito:</strong> O usuário terá seu acesso restringido. Não poderá criar novos anúncios nos Classificados nem editar anúncios existentes até ser reativado. O motivo informado será exibido ao usuário com instruções de revisão.
                  </p>
                )}
                {moderationModal.targetStatus === 'blocked' && (
                  <p>
                    <strong>Efeito:</strong> A conta será completamente bloqueada para operações e publicações no portal. Ação recomendada em casos de violação grave dos Termos de Uso ou fraude.
                  </p>
                )}
                {moderationModal.targetStatus === 'active' && (
                  <p>
                    <strong>Efeito:</strong> A conta será restabelecida. O usuário voltará a ter permissão para gerenciar e publicar anúncios nos Classificados normalmente.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Justificativa Administrativa Obrigatória:
                </label>
                <textarea
                  required
                  rows={3}
                  value={moderationModal.reason}
                  onChange={(e) => setModerationModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Descreva o motivo desta ação (ex.: Violação da regra de classificados, denúncia de dados falsos, regularização cadastral, etc.)..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
                <span className="text-[10px] text-gray-400">
                  Esta justificativa ficará registrada permanentemente na auditoria do sistema.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModerationModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={moderationModal.submitting}
                  onClick={handleConfirmModeration}
                  className={`flex-1 py-3 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                    moderationModal.targetStatus === 'active'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : moderationModal.targetStatus === 'suspended'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-black hover:bg-gray-900'
                  }`}
                >
                  {moderationModal.submitting ? 'Gravando...' : 'Confirmar e Gravar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE ALTERAÇÃO RESTRITA DE PAPEL COM JUSTIFICATIVA
      ========================================================================== */}
      {roleModal.isOpen && roleModal.user && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                    Alteração de Privilégio de Acesso
                  </h3>
                  <p className="text-xs text-gray-500">
                    Usuário: <strong>{roleModal.user.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleModal.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{roleModal.error}</span>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Novo Papel:
                </label>
                <select
                  value={roleModal.newRole}
                  onChange={(e) => setRoleModal(prev => ({ ...prev, newRole: e.target.value as UserRole }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#0056a4] outline-none cursor-pointer"
                >
                  <option value="reader">Leitor / Anunciante Comum (Acesso Público)</option>
                  <option value="editor">Editor de Notícias (Acesso Restrito)</option>
                  <option value="admin">Administrador Geral do Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Justificativa Fundamentada:
                </label>
                <textarea
                  required
                  rows={3}
                  value={roleModal.reason}
                  onChange={(e) => setRoleModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Informe o motivo formal para a concessão ou revogação de privilégios..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={roleModal.submitting}
                  onClick={handleConfirmRoleChange}
                  className="flex-1 py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {roleModal.submitting ? 'Salvando...' : 'Aplicar Alteração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE AUDITORIA GERAL DO SISTEMA
      ========================================================================== */}
      {showFullAuditModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                    Livro de Auditoria Administrativa Geral
                  </h3>
                  <p className="text-xs text-gray-500">
                    Registro imutável de todas as ações de moderação executadas no portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullAuditModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4">
              {allAuditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  Nenhum registro de auditoria arquivado ainda.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0 border-b border-gray-200 font-black uppercase text-[10px] text-gray-400">
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Usuário Afetado</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Administrador</th>
                      <th className="p-3">Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {allAuditLogs.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="p-3 whitespace-nowrap text-gray-400 text-[11px]">
                          {new Date(l.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-gray-900">{l.userName}</p>
                          <p className="text-[10px] text-gray-400">{l.userEmail}</p>
                        </td>
                        <td className="p-3 whitespace-nowrap font-black uppercase text-[10px]">
                          {l.action === 'suspend' && <span className="text-red-600">Suspensão</span>}
                          {l.action === 'reactivate' && <span className="text-emerald-600">Reativação</span>}
                          {l.action === 'block' && <span className="text-black">Bloqueio</span>}
                          {l.action === 'resend_confirmation' && <span className="text-blue-600">Reenvio Link</span>}
                          {l.action === 'confirm_email' && <span className="text-purple-600">Confirmação Manual</span>}
                          {l.action === 'change_role' && <span className="text-amber-600">Mudança de Papel</span>}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <p className="font-bold text-gray-800">{l.adminName}</p>
                          <p className="text-[10px] text-gray-400">{l.adminEmail}</p>
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs">
                          {l.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowFullAuditModal(false)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
