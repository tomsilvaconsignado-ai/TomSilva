import React, { useState } from 'react';
import { 
  X, Mail, Lock, User, CheckCircle2, AlertCircle, Shield, Sparkles, 
  Building2, Phone, MapPin, Eye, EyeOff, ShieldCheck, FileText 
} from 'lucide-react';
import { authService, isSupabaseConfigured } from '../../lib/supabase';
import { UserProfile, AccountType } from '../../types/database';
import { TermsModal } from './TermsModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
  reasonMessage?: string;
}

// Formatadores de máscara
const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  reasonMessage
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [accountType, setAccountType] = useState<AccountType>('pf');
  
  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Cadastro Geral
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Estância');
  const [state, setState] = useState('SE');
  
  // Pessoa Física
  const [cpf, setCpf] = useState('');
  const [isLegalAge, setIsLegalAge] = useState(false);
  
  // Pessoa Jurídica
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [legalRepresentative, setLegalRepresentative] = useState('');
  const [representativeCpf, setRepresentativeCpf] = useState('');
  
  // Termos de Uso e LGPD
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  
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
          setError('Preencha seu e-mail e sua senha.');
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
          }, 600);
        }
      } else if (mode === 'register') {
        // Validações comuns
        if (!email.trim() || !email.includes('@')) {
          setError('Informe um endereço de e-mail válido.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('A senha deve conter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('A confirmação de senha não confere com a senha digitada.');
          setLoading(false);
          return;
        }
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
          setError('Informe um telefone ou WhatsApp de contato válido com DDD.');
          setLoading(false);
          return;
        }
        if (!city.trim()) {
          setError('Informe a sua cidade.');
          setLoading(false);
          return;
        }

        // Validações Pessoa Física
        if (accountType === 'pf') {
          if (!fullName.trim()) {
            setError('Informe seu nome completo.');
            setLoading(false);
            return;
          }
          const cleanCpf = cpf.replace(/\D/g, '');
          if (cleanCpf.length !== 11) {
            setError('Informe um CPF válido com 11 dígitos.');
            setLoading(false);
            return;
          }
          if (!isLegalAge) {
            setError('Você deve confirmar que possui idade legal (maior de 18 anos) para utilizar a plataforma.');
            setLoading(false);
            return;
          }
        }

        // Validações Pessoa Jurídica
        if (accountType === 'pj') {
          if (!companyName.trim()) {
            setError('Informe a Razão Social da empresa.');
            setLoading(false);
            return;
          }
          const cleanCnpj = cnpj.replace(/\D/g, '');
          if (cleanCnpj.length !== 14) {
            setError('Informe um CNPJ válido com 14 dígitos.');
            setLoading(false);
            return;
          }
          if (!legalRepresentative.trim()) {
            setError('Informe o nome do representante legal responsável.');
            setLoading(false);
            return;
          }
        }

        // Segurança Jurídica: Aceite dos Termos Obrigatório
        if (!termsAccepted) {
          setError('É necessário ler e aceitar os Termos de Uso e a Política de Privacidade para concluir seu cadastro.');
          setLoading(false);
          return;
        }

        const registeredName = accountType === 'pf' ? fullName.trim() : (tradeName.trim() || companyName.trim());

        const res = await authService.signUp(
          email,
          password,
          registeredName,
          'reader',
          {
            accountType,
            phone: phone.trim(),
            city: city.trim(),
            state: state.trim(),
            cpf: accountType === 'pf' ? cpf.trim() : undefined,
            isLegalAge: accountType === 'pf' ? isLegalAge : true,
            companyName: accountType === 'pj' ? companyName.trim() : undefined,
            tradeName: accountType === 'pj' ? tradeName.trim() : undefined,
            cnpj: accountType === 'pj' ? cnpj.trim() : undefined,
            legalRepresentative: accountType === 'pj' ? legalRepresentative.trim() : undefined,
            representativeCpf: accountType === 'pj' ? representativeCpf.trim() : undefined,
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: 'v2.1-2026',
            status: 'active'
          }
        );

        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          setSuccessMessage(`Cadastro concluído com sucesso! Bem-vindo, ${res.user.fullName}.`);
          setTimeout(() => {
            onSuccess(res.user!);
            onClose();
          }, 800);
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
      setEmail('tomsilvaconsignado@gmail.com');
      setPassword('Folha@1234');
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
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header do Modal */}
          <div className="bg-gray-900 text-white p-5 sm:p-6 relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                {configured ? 'Supabase Auth Conectado' : 'Folha da Região • Acesso Seguro'}
              </span>
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight">
              {mode === 'login' && 'Entrar na Conta'}
              {mode === 'register' && 'Criar Cadastro Público'}
              {mode === 'forgot' && 'Recuperar Senha'}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {mode === 'login' && 'Acesse para publicar notícias, gerenciar publicidade ou anunciar nos classificados.'}
              {mode === 'register' && 'Cadastre-se gratuitamente para publicar classificados e participar do portal.'}
              {mode === 'forgot' && 'Digite seu e-mail para receber as instruções de redefinição.'}
            </p>

            {/* Aviso especial quando acionado por fluxo de publicação */}
            {reasonMessage && (
              <div className="mt-3 p-2.5 bg-[#0056a4]/30 border border-[#0056a4] rounded-xl flex items-center gap-2 text-xs text-blue-100">
                <ShieldCheck className="w-4 h-4 text-blue-300 shrink-0" />
                <span>{reasonMessage}</span>
              </div>
            )}
          </div>

          {/* Abas Alternadoras */}
          <div className="flex border-b border-gray-100 bg-gray-50/70 shrink-0">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                mode === 'login'
                  ? 'border-[#0056a4] text-[#0056a4] bg-white shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Já tenho conta (Entrar)
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                mode === 'register'
                  ? 'border-[#0056a4] text-[#0056a4] bg-white shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Formulário com rolagem interna */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* MODO LOGIN */}
              {mode === 'login' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-gray-700">
                        Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[11px] text-[#0056a4] hover:underline font-semibold cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-2.5 text-gray-400 hover:text-gray-600"
                        title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* MODO CADASTRO (REGISTRO PF OU PJ) */}
              {mode === 'register' && (
                <>
                  {/* Seletor PF / PJ */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Cadastro
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountType('pf')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          accountType === 'pf'
                            ? 'border-[#0056a4] bg-blue-50 text-[#0056a4] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        Pessoa Física (CPF)
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType('pj')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          accountType === 'pj'
                            ? 'border-[#0056a4] bg-blue-50 text-[#0056a4] shadow-xs'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        Pessoa Jurídica (CNPJ)
                      </button>
                    </div>
                  </div>

                  {/* Campos PESSOA FÍSICA */}
                  {accountType === 'pf' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: João da Silva Santos"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            CPF (Obrigatório) *
                          </label>
                          <input
                            type="text"
                            required
                            value={cpf}
                            onChange={(e) => setCpf(formatCPF(e.target.value))}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            WhatsApp / Telefone *
                          </label>
                          <input
                            type="text"
                            required
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            placeholder="(79) 99999-9999"
                            maxLength={15}
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Campos PESSOA JURÍDICA */
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Razão Social *
                        </label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ex: Silva & Santos Comércio LTDA"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Nome Fantasia
                          </label>
                          <input
                            type="text"
                            value={tradeName}
                            onChange={(e) => setTradeName(e.target.value)}
                            placeholder="Ex: Comercial Estância"
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            CNPJ *
                          </label>
                          <input
                            type="text"
                            required
                            value={cnpj}
                            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Representante Responsável *
                          </label>
                          <input
                            type="text"
                            required
                            value={legalRepresentative}
                            onChange={(e) => setLegalRepresentative(e.target.value)}
                            placeholder="Nome do representante"
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            WhatsApp Comercial *
                          </label>
                          <input
                            type="text"
                            required
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            placeholder="(79) 99999-9999"
                            maxLength={15}
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Localidade */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Estância"
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        UF *
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                      >
                        <option value="SE">SE</option>
                        <option value="AL">AL</option>
                        <option value="BA">BA</option>
                        <option value="PE">PE</option>
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* E-mail e Senhas */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      E-mail de Acesso *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Senha (mínimo 6 dígitos) *
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Confirmar Senha *
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Aviso de Privacidade e LGPD */}
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-900 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-[#0056a4] shrink-0 mt-0.5" />
                    <span>
                      <strong>Privacidade Protegida:</strong> Seu documento (CPF/CNPJ) é armazenado sob sigilo para conformidade jurídica e <strong>nunca será exibido publicamente</strong> nos anúncios.
                    </span>
                  </div>

                  {/* Termos e Declarações Legais Obrigatórias */}
                  <div className="space-y-2 pt-1">
                    {accountType === 'pf' && (
                      <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isLegalAge}
                          onChange={(e) => setIsLegalAge(e.target.checked)}
                          className="mt-0.5 rounded text-[#0056a4] focus:ring-[#0056a4]"
                        />
                        <span>
                          Declaro que possuo <strong>idade legal (maior de 18 anos)</strong> e plena capacidade civil.
                        </span>
                      </label>
                    )}

                    <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded text-[#0056a4] focus:ring-[#0056a4]"
                      />
                      <span>
                        Li e concordo com os{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsTermsModalOpen(true);
                          }}
                          className="text-[#0056a4] font-bold underline hover:text-[#004482]"
                        >
                          Termos de Uso e Política de Privacidade
                        </button>
                        , assumindo total responsabilidade pelas informações e anúncios que publicar.
                      </span>
                    </label>
                  </div>
                </>
              )}

              {/* MODO ESQUECEU A SENHA */}
              {mode === 'forgot' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {mode === 'login' && 'Entrar no Portal'}
                {mode === 'register' && 'Concluir Cadastro Seguro'}
                {mode === 'forgot' && 'Enviar Instruções'}
              </button>
            </form>

            {/* Atalho de Demonstração / Acesso Rápido */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
                Acesso Rápido para Testes
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin')}
                  className="flex-1 py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Login como Administrador (tomsilvaconsignado@gmail.com)"
                >
                  <Shield className="w-3.5 h-3.5 text-red-600" />
                  Editor / Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('reader')}
                  className="flex-1 py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Login como Leitor (leitor@folhadaregiao.com.br)"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Leitor Comum
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Leitura dos Termos */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => setTermsAccepted(true)}
      />
    </>
  );
};
