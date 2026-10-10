import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Shield, UserCheck, ShieldAlert, CheckCircle2, 
  AlertCircle, Lock, Building2, User, Phone, MapPin, Calendar 
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types/database';
import { usersService } from '../../lib/supabase';

interface AdminManageUsersProps {
  currentUser: UserProfile;
}

export const AdminManageUsers: React.FC<AdminManageUsersProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const data = await usersService.getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser.id && newRole !== 'admin') {
      alert('Você não pode revogar seu próprio papel de administrador.');
      return;
    }
    await usersService.updateUserRole(userId, newRole);
    setNotice('Papel do usuário atualizado com sucesso!');
    await loadUsers();
    setTimeout(() => setNotice(null), 3000);
  };

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.id === currentUser.id) {
      alert('Você não pode suspender sua própria conta administrativa.');
      return;
    }
    const next = await usersService.toggleUserStatus(user.id);
    setNotice(`Status do usuário alterado para: ${next === 'active' ? 'Ativo' : 'Suspenso'}.`);
    await loadUsers();
    setTimeout(() => setNotice(null), 3000);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm)) ||
      (u.companyName && u.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesType = typeFilter === 'all' || (u.accountType || 'pf') === typeFilter;

    return matchesSearch && matchesRole && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Topo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
            Gerenciar Usuários do Portal
          </h2>
          <p className="text-xs text-gray-500">
            Gerencie anunciantes dos classificados, editores de notícias e permissões de acesso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 text-[#0056a4] text-xs font-bold rounded-lg border border-blue-200">
            Total de {users.length} usuários
          </span>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{notice}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou empresa..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
          >
            <option value="all">Todos os Papéis</option>
            <option value="admin">Administradores</option>
            <option value="editor">Editores</option>
            <option value="reader">Leitores / Anunciantes</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
          >
            <option value="all">Pessoa Física & Jurídica</option>
            <option value="pf">Apenas Pessoa Física (PF)</option>
            <option value="pj">Apenas Pessoa Jurídica (PJ)</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando usuários...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-bold text-sm">
            Nenhum usuário encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                  <th className="py-3.5 px-4">Usuário</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Contato / Local</th>
                  <th className="py-3.5 px-4">Papel no Portal</th>
                  <th className="py-3.5 px-4">Situação</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredUsers.map((u) => {
                  const isPF = (u.accountType || 'pf') === 'pf';
                  const isSuspended = u.status === 'suspended';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}`}
                            alt={u.fullName}
                            className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200"
                          />
                          <div>
                            <p className="font-bold text-gray-900">{u.fullName}</p>
                            <p className="text-[11px] text-gray-400">{u.email}</p>
                            {u.termsAccepted && (
                              <span className="text-[9px] text-emerald-600 font-bold">
                                ✓ Termos LGPD aceitos ({u.termsVersion || 'v2.1'})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isPF ? 'bg-blue-50 text-blue-800' : 'bg-purple-50 text-purple-800'
                        }`}>
                          {isPF ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </span>
                        {u.companyName && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[140px]">
                            {u.companyName}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600">
                        {u.phone && <p className="font-bold text-gray-800">{u.phone}</p>}
                        <p className="text-[11px] text-gray-400">
                          {u.city ? `${u.city} - ${u.state || 'SE'}` : 'Sergipe'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#0056a4] cursor-pointer"
                        >
                          <option value="reader">Leitor / Anunciante</option>
                          <option value="editor">Editor de Notícias</option>
                          <option value="admin">Administrador Geral</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-full border border-red-200">
                            Suspenso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200">
                            Ativo
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            isSuspended
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {isSuspended ? 'Reativar Conta' : 'Suspender'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
