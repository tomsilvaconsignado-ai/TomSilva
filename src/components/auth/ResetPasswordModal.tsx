import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, 
  ShieldCheck, ArrowRight, KeyRound, Check, RefreshCw 
} from 'lucide-react';
import { authService, isSupabaseConfigured, supabase } from '../../lib/supabase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onSuccessGoToLogin: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  token,
  onClose,
  onSuccessGoToLogin
}) => {
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successText, setSuccessText] = useState('');

  // Verificação inicial do token
  useEffect(() => {
    if (!isOpen || !token) return;

    setTokenValid(null);
    setTokenError(null);
    setIsSuccess(false);
    setErrorMessage(null);
    setNewPassword('');
    setConfirmPassword('');

    const check = authService.verifyResetToken(token);
    if (check.valid) {
      setTokenValid(true);
      setUserEmail(check.email);

      // Se for recuperação via Supabase Auth e o e-mail não estiver em cache local, consulta a sessão ativa
      if (!check.email && isSupabaseConfigured() && supabase) {
        supabase.auth.getUser().then(({ data }) => {
          if (data?.user?.email) {
            setUserEmail(data.user.email);
          }
        }).catch(() => {});
      }
    } else {
      setTokenValid(false);
      setTokenError(check.message);
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  // Critérios de segurança da senha
  const hasMinLength = newPassword.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength) {
      setErrorMessage('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('A confirmação da senha não confere com a nova senha digitada.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.completePasswordReset(token, newPassword);
      if (res.success) {
        setIsSuccess(true);
        setSuccessText(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden p-6 md:p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. ESTADO DE TOKEN INVÁLIDO OU EXPIRADO */}
        {tokenValid === false && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 rounded-full bg-red-100 text-red-900 text-[10px] font-black uppercase tracking-wider inline-block">
              Link Expirado ou Inválido
            </span>

            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
              Não Foi Possível Redefinir
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
              {tokenError || 'Este link de redefinição de senha expirou (validade máxima de 1 hora) ou já foi utilizado anteriormente.'}
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onSuccessGoToLogin();
                }}
                className="w-full py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Solicitar Novo Link de Redefinição
              </button>
            </div>
          </div>
        )}

        {/* 2. ESTADO DE SUCESSO APÓS REDEFINIÇÃO */}
        {isSuccess && (
          <div className="text-center py-4 space-y-4 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-sm animate-in zoom-in-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider inline-block">
              Credenciais Atualizadas
            </span>

            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
              Senha Alterada com Sucesso!
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
              {successText || 'Sua nova senha foi salva de forma segura. Por proteção, qualquer sessão anterior foi encerrada.'}
            </p>

            <div className="pt-3">
              <button
                onClick={() => {
                  onClose();
                  onSuccessGoToLogin();
                }}
                className="w-full py-3.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Fazer Login com a Nova Senha</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3. FORMULÁRIO DE CADASTRO DA NOVA SENHA */}
        {tokenValid === true && !isSuccess && (
          <div className="space-y-4">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0056a4] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0056a4]">
                  Folha da Região • Segurança
                </span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                Criar Nova Senha
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {userEmail ? `Cadastre uma nova senha para ${userEmail}:` : 'Cadastre uma nova senha segura para acessar sua conta:'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Campo Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nova Senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    title={showPassword ? 'Ocultar' : 'Visualizar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Campo Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    title={showConfirmPassword ? 'Ocultar' : 'Visualizar'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checklist Visual de Requisitos de Segurança */}
              <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-[11px] space-y-1.5">
                <p className="font-bold text-gray-600 mb-1">Requisitos de segurança:</p>
                
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasMinLength ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    ✓
                  </span>
                  <span>Mínimo de 6 caracteres</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasLetter && hasNumber ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasLetter && hasNumber ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    ✓
                  </span>
                  <span>Combinação de letras e números</span>
                </div>

                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordsMatch ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    ✓
                  </span>
                  <span>As senhas digitadas conferem</span>
                </div>
              </div>

              {/* Botão Salvar Nova Senha */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Salvar Nova Senha</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
