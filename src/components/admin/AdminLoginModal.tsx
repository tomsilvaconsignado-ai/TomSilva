import React, { useState } from 'react';
import { 
  X, Lock, Mail, Eye, EyeOff, Shield, AlertCircle, 
  CheckCircle2, KeyRound, Sparkles, ArrowRight
} from 'lucide-react';
import { authService } from '../../lib/supabase';
import { UserProfile } from '../../types/database';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modo de recuperação exclusivo para administradores
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setError('Informe o e-mail administrativo e sua senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.signInAdmin(email.trim(), password);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      if (res.user) {
        setSuccessMessage(`Acesso autorizado! Bem-vindo, ${res.user.fullName}.`);
        setTimeout(() => {
          onSuccess(res.user!);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha na autenticação administrativa.');
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError('Informe o e-mail corporativo cadastrado.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.resetPassword(forgotEmail.trim());
      if (res.success) {
        setForgotSuccess('Instruções de redefinição de senha enviadas com sucesso para o e-mail informado.');
      } else {
        setForgotError(res.message);
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Erro ao processar recuperação de senha.');
    } finally {
      setForgotLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('tomsilvaconsignado@gmail.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
      >
        {/* Cabeçalho Distinto e Corporativo */}
        <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
              Ambiente Restrito & Auditado
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 id="admin-login-title" className="text-xl font-black uppercase tracking-tight text-white">
                {isForgotMode ? 'Recuperação Administrativa' : 'Área Administrativa'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isForgotMode 
                  ? 'Redefinição de credencial exclusiva para administradores' 
                  : 'Acesso restrito para editores e administradores autorizados'}
              </p>
            </div>
          </div>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6 space-y-4">
          {!isForgotMode ? (
            <>
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    E-mail Administrativo
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@folhadaregiao.com.br"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Senha Administrativa
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                        setForgotEmail(email);
                        setError(null);
                      }}
                      className="text-[11px] text-gray-600 hover:text-gray-950 hover:underline font-semibold cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <span>
                    Contas públicas e leitores comuns não possuem acesso a este painel. Apenas credenciais com permissão administrativa atribuída serão aceitas.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gray-950 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Entrar no Painel</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Botão de Preenchimento Rápido com a Conta Oficial do Administrador */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={fillAdminCredentials}
                  className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-red-200"
                >
                  <KeyRound className="w-3.5 h-3.5 text-red-600" />
                  <span>Preencher Credencial de Administrador Autorizado</span>
                </button>
              </div>
            </>
          ) : (
            /* Modo Recuperação de Senha Administrativa */
            <div className="space-y-4">
              {forgotError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-relaxed font-medium">{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="font-medium leading-relaxed">{forgotSuccess}</span>
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    E-mail do Administrador
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@folhadaregiao.com.br"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 bg-gray-950 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Enviar Link Seguro de Recuperação'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setForgotError(null);
                    setForgotSuccess(null);
                  }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Voltar para o Login Administrativo
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
