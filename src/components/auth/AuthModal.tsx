import React, { useState } from 'react';
import { X, Mail, Lock, User, CheckCircle2, AlertCircle, Shield, Sparkles } from 'lucide-react';
import { authService, isSupabaseConfigured } from '../../lib/supabase';
import { UserProfile } from '../../types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'reader' | 'editor' | 'admin'>('reader');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError('Preencha seu e-mail e senha.');
          setLoading(false);
          return;
        }

        const res = await authService.signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          setSuccessMessage(`Bem-vindo de volta, ${res.user.fullName}!`);
          setTimeout(() => {
            onSuccess(res.user!);
            onClose();
          }, 800);
        }
      } else if (mode === 'register') {
        if (!fullName.trim()) {
          setError('Informe seu nome completo.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setError('Informe um e-mail válido.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('A senha deve conter no mínimo 6 caracteres.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          setLoading(false);
          return;
        }

        const res = await authService.signUp(email, password, fullName, role);
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          setSuccessMessage(`Conta criada com sucesso! Bem-vindo, ${res.user.fullName}.`);
          setTimeout(() => {
            onSuccess(res.user!);
            onClose();
          }, 1000);
        }
      } else if (mode === 'forgot') {
        if (!email.trim() || !email.includes('@')) {
          setError('Informe o e-mail cadastrado.');
          setLoading(false);
          return;
        }

        const res = await authService.resetPassword(email);
        if (res.success) {
          setSuccessMessage(res.message);
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoRole: 'admin' | 'reader') => {
    if (demoRole === 'admin') {
      setEmail('admin@folhadaregiao.com.br');
      setPassword('admin123');
      setMode('login');
    } else {
      setEmail('leitor@folhadaregiao.com.br');
      setPassword('leitor123');
      setMode('login');
    }
    setError(null);
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="bg-gray-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
              {configured ? 'Supabase Auth Conectado' : 'Supabase Auth Pronto (Modo Local)'}
            </span>
          </div>

          <h3 className="text-xl font-black uppercase tracking-tight">
            {mode === 'login' && 'Acessar Portal'}
            {mode === 'register' && 'Cadastrar Nova Conta'}
            {mode === 'forgot' && 'Recuperar Senha'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'login' && 'Entre com seu e-mail e senha para comentar e gerenciar.'}
            {mode === 'register' && 'Crie sua conta para participar da comunidade da Folha da Região.'}
            {mode === 'forgot' && 'Enviaremos as instruções de recuperação para seu e-mail.'}
          </p>
        </div>

        {/* Abas Alternadoras */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all ${
              mode === 'login'
                ? 'bg-white text-[#0056a4] border-b-2 border-[#0056a4]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all ${
              mode === 'register'
                ? 'bg-white text-[#0056a4] border-b-2 border-[#0056a4]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 text-xs text-green-700 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Tipo de Conta
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 transition-all"
                >
                  <option value="reader">Leitor (Comentar e salvar notícias)</option>
                  <option value="editor">Jornalista / Editor (Criar matérias)</option>
                  <option value="admin">Administrador (Controle total do portal)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 transition-all"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Senha
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-[11px] text-[#0056a4] hover:underline font-semibold"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 transition-all"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                {mode === 'login' && 'Entrar na Conta'}
                {mode === 'register' && 'Finalizar Cadastro'}
                {mode === 'forgot' && 'Enviar Instruções'}
              </>
            )}
          </button>

          {/* Atalhos de Teste Rápido */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center mb-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Contas de Demonstração (1 Clique)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Login como Editor/Administrador (admin@folhadaregiao.com.br)"
              >
                <Shield className="w-3 h-3 text-[#0056a4]" />
                Editor / Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('reader')}
                className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Login como Leitor (leitor@folhadaregiao.com.br)"
              >
                <User className="w-3 h-3 text-emerald-600" />
                Leitor Comum
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
