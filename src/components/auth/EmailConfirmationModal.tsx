import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, RotateCw, Send, X, ShieldCheck } from 'lucide-react';
import { authService } from '../../lib/supabase';

interface EmailConfirmationModalProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onGoToLogin: () => void;
}

export const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
  isOpen,
  token,
  onClose,
  onGoToLogin
}) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  
  // Reenvio em caso de falha/expiração
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!isOpen || !token) return;

    let isMounted = true;
    setLoading(true);
    setSuccess(false);
    setMessage('');

    authService.confirmEmail(token).then((res) => {
      if (!isMounted) return;
      setLoading(false);
      setSuccess(res.success);
      setMessage(res.message);
    }).catch((err) => {
      if (!isMounted) return;
      setLoading(false);
      setSuccess(false);
      setMessage(err.message || 'Erro ao validar o link de confirmação.');
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim() || !resendEmail.includes('@') || resendCooldown > 0) return;

    setResending(true);
    setResendStatus(null);
    try {
      const res = await authService.resendConfirmationEmail(resendEmail.trim());
      setResendStatus(res.message);
      if (res.success) {
        setResendCooldown(60);
      } else if (res.remainingSeconds) {
        setResendCooldown(res.remainingSeconds);
      }
    } catch (e: any) {
      setResendStatus(e.message || 'Erro ao solicitar novo link.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden p-6 md:p-8 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-16 h-16 border-4 border-[#0056a4] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-lg font-black uppercase text-gray-900 tracking-tight">
              Validando Confirmação de E-mail
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Aguarde um instante enquanto verificamos seu token de segurança e ativamos sua conta...
            </p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-sm animate-in zoom-in-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-wider inline-block">
              Conta Ativada com Sucesso
            </span>

            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
              E-mail Confirmado!
            </h3>

            <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
              {message || 'Seu endereço de e-mail foi validado com segurança. Sua conta está totalmente habilitada para publicar anúncios nos classificados e aproveitar todos os recursos do portal.'}
            </p>

            <div className="pt-3">
              <button
                onClick={() => {
                  onClose();
                  onGoToLogin();
                }}
                className="w-full py-3.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Minha Conta / Fazer Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-200 shadow-sm">
                <AlertCircle className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-full bg-red-100 text-red-900 text-[10px] font-black uppercase tracking-wider inline-block mb-1">
                Falha na Validação
              </span>

              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                Link Não Validado
              </h3>

              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {message || 'O link de confirmação informado é inválido, expirou ou já foi utilizado anteriormente.'}
              </p>
            </div>

            {/* Formulário para solicitar novo link */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-800 mb-2">
                Solicitar novo link de confirmação:
              </p>
              
              <form onSubmit={handleResend} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Digite seu e-mail cadastrado"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] outline-none"
                  />
                </div>

                {resendStatus && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                    {resendStatus}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resending || resendCooldown > 0}
                  className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {resending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {resendCooldown > 0 ? `Aguarde (${resendCooldown}s)` : 'Reenviar E-mail de Confirmação'}
                </button>
              </form>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 underline cursor-pointer"
              >
                Fechar e voltar ao portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
