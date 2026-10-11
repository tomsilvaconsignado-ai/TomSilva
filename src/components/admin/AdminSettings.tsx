import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Phone, Mail, FileText, Globe, Share2, 
  Save, RotateCcw, CheckCircle2, AlertCircle, Eye, 
  MapPin, Clock, MessageSquare, Shield, Sliders, ExternalLink,
  Info, Sparkles, ChevronRight, Check, Upload, Image as ImageIcon, Trash2,
  Link as LinkIcon
} from 'lucide-react';
import { PortalSettings } from '../../types/database';
import { portalSettingsService } from '../../lib/supabase';
import { getAssetUrl } from '../../lib/assets';

type SettingsSection = 
  | 'identity'        // Identidade e Slogan
  | 'contacts'        // Contatos do Portal
  | 'footer'          // Informações Institucionais do Rodapé
  | 'social'          // Redes Sociais
  | 'institutional';  // Páginas Institucionais

export const AdminSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('identity');
  const [settings, setSettings] = useState<PortalSettings>(() => portalSettingsService.getSettingsSync());
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeInstSubTab, setActiveInstSubTab] = useState<'sobreNos' | 'expediente' | 'privacidade'>('sobreNos');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega configurações
  useEffect(() => {
    portalSettingsService.getSettings().then(setSettings);
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // Upload da Logomarca Oficial
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Selecione um arquivo de imagem válido (PNG, JPG, SVG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('A imagem deve ter no máximo 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setSettings(prev => ({ ...prev, customLogoUrl: base64Data }));
      showNotification('Logomarca carregada com sucesso! Clique em "Salvar Alterações" para gravar.', 'success');
    };
    reader.onerror = () => {
      showNotification('Erro ao processar imagem.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomLogo = () => {
    setSettings(prev => ({ ...prev, customLogoUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLogoUrlInput('');
    showNotification('Logomarca oficial (/vetor.svg) restaurada.', 'success');
  };

  // Aplica URL de imagem ou link do GitHub (incluindo tratamento para links do GitHub e identificadores de anexos)
  const handleApplyLogoUrl = () => {
    if (!logoUrlInput.trim()) {
      showNotification('Informe uma URL de imagem válida ou link do GitHub.', 'error');
      return;
    }
    let cleanUrl = logoUrlInput.trim();

    // Se o usuário colou apenas o hash (ex: SHA commit ou asset ID de 40 caracteres hex)
    if (/^[a-f0-9]{40}$/i.test(cleanUrl)) {
      cleanUrl = `https://github.com/user-attachments/assets/${cleanUrl}`;
    }

    // Conversão automática de links do visualizador do GitHub para raw
    if (cleanUrl.includes('github.com') && cleanUrl.includes('/blob/')) {
      cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    } else if (cleanUrl.includes('github.com') && !cleanUrl.includes('raw.githubusercontent.com') && !cleanUrl.includes('/assets/')) {
      if (!cleanUrl.includes('raw=true')) {
        cleanUrl += cleanUrl.includes('?') ? '&raw=true' : '?raw=true';
      }
    }
    setSettings(prev => ({ ...prev, customLogoUrl: cleanUrl }));
    showNotification('URL da logomarca aplicada! Clique em "Salvar Alterações" para confirmar ou envie o arquivo diretamente.', 'success');
  };

  // Atualiza número do WhatsApp e formata o link dinamicamente
  const handleWhatsappChange = (value: string) => {
    // Limpa caracteres especiais para compor link wa.me
    const digitsOnly = value.replace(/\D/g, '');
    let fullDigits = digitsOnly;
    if (digitsOnly.length > 0 && !digitsOnly.startsWith('55')) {
      fullDigits = '55' + digitsOnly;
    }
    const generatedLink = fullDigits ? `https://wa.me/${fullDigits}` : '';

    setSettings(prev => ({
      ...prev,
      whatsappNumber: value,
      whatsappLink: generatedLink
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      // Validação de e-mail se fornecido
      if (settings.contactEmail && !settings.contactEmail.includes('@')) {
        showNotification('Por favor, informe um endereço de e-mail institucional válido.', 'error');
        setIsSaving(false);
        return;
      }

      await portalSettingsService.saveSettings(settings);
      showNotification('Configurações do portal salvas e sincronizadas com sucesso!');
    } catch (err: any) {
      showNotification('Erro ao salvar configurações: ' + (err?.message || 'Falha desconhecida'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Tem certeza de que deseja restaurar os textos e contatos para o padrão original da Folha da Região?')) {
      const def = await portalSettingsService.resetToDefaults();
      setSettings(def);
      showNotification('Configurações redefinidas para os valores padrão com sucesso!');
    }
  };

  // Seções da aba
  const sectionsList: { id: SettingsSection; label: string; icon: any; hint: string }[] = [
    { 
      id: 'identity', 
      label: 'Identidade e Slogan', 
      icon: Sparkles, 
      hint: 'Nome do portal, slogan e frases de destaque' 
    },
    { 
      id: 'contacts', 
      label: 'Contatos', 
      icon: Phone, 
      hint: 'Telefone, WhatsApp, e-mail e endereço' 
    },
    { 
      id: 'footer', 
      label: 'Rodapé', 
      icon: Building2, 
      hint: 'Textos de encerramento, direitos e empresa' 
    },
    { 
      id: 'social', 
      label: 'Redes Sociais', 
      icon: Share2, 
      hint: 'Links do Facebook, Instagram e canais' 
    },
    { 
      id: 'institutional', 
      label: 'Páginas Institucionais', 
      icon: FileText, 
      hint: 'Textos de Sobre Nós, Expediente e Privacidade' 
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Topo do Módulo */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              Configurações do Portal
            </h2>
            <span className="px-2 py-0.5 bg-blue-50 text-[#0056a4] text-[10px] font-black uppercase tracking-wider rounded-md border border-blue-200">
              Personalização
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Administre os textos institucionais, slogan, dados de contato e informações do rodapé exibidos nas páginas públicas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Restaurar textos padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {notice && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs shadow-xs animate-in fade-in ${
          notice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-bold">{notice.message}</span>
        </div>
      )}

      {/* Navegação entre as seções temáticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {sectionsList.map((sec) => {
          const Icon = sec.icon;
          const isSelected = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#0056a4] text-white border-[#0056a4] shadow-md shadow-blue-500/10'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#0056a4]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <div>
                <p className={`font-black text-xs uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {sec.label}
                </p>
                <p className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                  {sec.hint}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* CONTEÚDO DA SEÇÃO ATIVA */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* =========================================================
            SEÇÃO 1: IDENTIDADE E SLOGAN
        ========================================================= */}
        {activeSection === 'identity' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#0056a4]">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
                  Identidade Visual e Slogan Principal
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Configure os títulos, slogan principal e mensagens de posicionamento que identificam o portal para o leitor.
              </p>
            </div>

            {/* Prévia ao vivo da Identidade e Logomarca */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#0056a4]" />
                  Prévia em Tempo Real (Cabeçalho Público)
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ao vivo
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getAssetUrl(settings.customLogoUrl || 'vetor.svg')}
                    alt={settings.officialName || 'Folha da Região'}
                    className="h-10 md:h-12 w-auto max-w-[260px] object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const fallback = getAssetUrl('vetor.svg');
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                  {settings.logoBadgeText && (
                    <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded">
                      {settings.logoBadgeText}
                    </span>
                  )}
                </div>
                <div className="text-center md:text-right">
                  <p className="text-[10px] font-black tracking-[0.22em] text-gray-400 uppercase">
                    {settings.tagline || 'A NOTÍCIA ONDE VOCÊ ESTIVER'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 italic">
                    "{settings.presentationPhrase}"
                  </p>
                </div>
              </div>
            </div>

            {/* Gerenciamento da Logomarca Oficial do Cabeçalho */}
            <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#0056a4]" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">
                    Logomarca Oficial do Cabeçalho
                  </h4>
                </div>
                <span className="text-[10px] text-blue-700 bg-blue-100/70 font-bold px-2 py-0.5 rounded-full">
                  {settings.customLogoUrl && settings.customLogoUrl !== '/vetor.svg' ? 'Logomarca Personalizada Ativa' : 'Logomarca Oficial Ativa (/vetor.svg)'}
                </span>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                A imagem da logomarca substitui o texto tradicional no topo do site tanto em computadores quanto em celulares, mantendo as cores originais, nitidez e o link direto para a página inicial.
              </p>

              {/* Duas Formas de Inserir a Imagem: Arquivo Direto ou Link do GitHub */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoFileUpload}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    id="logo-upload-input"
                  />
                  <label
                    htmlFor="logo-upload-input"
                    className="px-4 py-2.5 bg-[#0056a4] hover:bg-[#004382] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Enviar Arquivo do Computador/Celular
                  </label>

                  {settings.customLogoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomLogo}
                      className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Restaurar Logomarca Oficial Padrão
                    </button>
                  )}
                </div>

                {/* Opção para anexar link direto do GitHub ou URL de imagem */}
                <div className="pt-2 border-t border-blue-100/80">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3 text-[#0056a4]" />
                    Ou informe o link da imagem anexada no GitHub / URL da Web:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      type="url"
                      value={logoUrlInput}
                      onChange={(e) => setLogoUrlInput(e.target.value)}
                      placeholder="Ex: https://raw.githubusercontent.com/usuario/repo/main/logo.png ou link do GitHub"
                      className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLogoUrl}
                      className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Aplicar Link
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Links do tipo <code className="bg-white/60 px-1 py-0.5 rounded text-gray-600">github.com/.../blob/...</code> são convertidos automaticamente para exibição direta.
                  </p>
                </div>
              </div>

              <span className="text-[10px] text-gray-400 block pt-1">
                Formatos recomendados: PNG transparente, SVG ou JPEG de alta resolução (máx. 5MB). A imagem é redimensionada proporcionalmente sem distorções.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome Oficial do Portal
                </label>
                <input
                  type="text"
                  required
                  value={settings.officialName}
                  onChange={(e) => setSettings({ ...settings, officialName: e.target.value })}
                  placeholder="Ex: Folha da Região"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Aparece no topo da página, no logotipo textual, rodapé e nos e-mails do sistema.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Selo da Marca (Badge)
                </label>
                <input
                  type="text"
                  value={settings.logoBadgeText}
                  onChange={(e) => setSettings({ ...settings, logoBadgeText: e.target.value })}
                  placeholder="Ex: ONLINE"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase text-red-600 focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Pequeno selo em destaque ao lado da logomarca (Ex: ONLINE, SERGIPE, DIGITAL).
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Slogan Principal do Portal
                </label>
                <input
                  type="text"
                  required
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  placeholder="Ex: A NOTÍCIA ONDE VOCÊ ESTIVER"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider text-gray-900 focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Subtítulo exibido logo abaixo do logotipo no cabeçalho e também no rodapé do portal.
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Frase de Apresentação
                </label>
                <input
                  type="text"
                  value={settings.presentationPhrase}
                  onChange={(e) => setSettings({ ...settings, presentationPhrase: e.target.value })}
                  placeholder="Ex: Jornalismo independente, ágil e com credibilidade em Sergipe"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Utilizada na introdução de páginas públicas, newsletters e meta tags de compartilhamento.
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Texto Institucional Curto
                </label>
                <textarea
                  rows={3}
                  value={settings.shortInstitutionalText}
                  onChange={(e) => setSettings({ ...settings, shortInstitutionalText: e.target.value })}
                  placeholder="Ex: O portal Folha da Região é comprometido com a verdade e a informação de qualidade..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none resize-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Exibido na primeira coluna do rodapé e na página de apresentação resumida.
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Descrição Geral do Portal (SEO / Identificação)
                </label>
                <input
                  type="text"
                  value={settings.portalDescription}
                  onChange={(e) => setSettings({ ...settings, portalDescription: e.target.value })}
                  placeholder="Ex: Portal de notícias e classificados de Estância e de todo o estado de Sergipe."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Descrição oficial para mecanismos de busca e cartões sociais de compartilhamento.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SEÇÃO 2: CONTATOS DO PORTAL
        ========================================================= */}
        {activeSection === 'contacts' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#0056a4]">
                <Phone className="w-5 h-5" />
                <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
                  Contatos e Canais de Atendimento
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Configure os canais pelos quais leitores e anunciantes podem entrar em contato com o portal.
              </p>
            </div>

            <div className="space-y-6">
              {/* Telefone Fixo / Geral */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#0056a4]" />
                    <span className="font-bold text-xs text-gray-900">Telefone Institucional</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={settings.showContactPhone}
                      onChange={(e) => setSettings({ ...settings, showContactPhone: e.target.checked })}
                      className="rounded text-[#0056a4] focus:ring-[#0056a4]"
                    />
                    <span className="text-gray-600">Exibir publicamente no site</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  placeholder="(79) 99977-6199"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none"
                />
                <span className="text-[10px] text-gray-400 block">
                  Onde aparece: Lista de contatos no rodapé e na página de Expediente.
                </span>
              </div>

              {/* WhatsApp com sincronização de link */}
              <div className="p-4 bg-green-50/60 rounded-xl border border-green-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 text-green-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
                      </svg>
                    </div>
                    <span className="font-bold text-xs text-green-950">WhatsApp da Redação e Comercial</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={settings.showWhatsapp}
                      onChange={(e) => setSettings({ ...settings, showWhatsapp: e.target.checked })}
                      className="rounded text-green-600 focus:ring-green-600"
                    />
                    <span className="text-green-900">Exibir publicamente no site</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-green-900 mb-1">
                      Número Visível (com DDD)
                    </label>
                    <input
                      type="text"
                      value={settings.whatsappNumber}
                      onChange={(e) => handleWhatsappChange(e.target.value)}
                      placeholder="(79) 99977-6199"
                      className="w-full px-3.5 py-2 bg-white border border-green-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-green-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-green-900 mb-1 flex items-center gap-1">
                      Link de Destino Gerado Automaticamente
                      <ExternalLink className="w-3 h-3 text-green-700" />
                    </label>
                    <input
                      type="text"
                      value={settings.whatsappLink}
                      onChange={(e) => setSettings({ ...settings, whatsappLink: e.target.value })}
                      placeholder="https://wa.me/5579999776199"
                      className="w-full px-3.5 py-2 bg-white border border-green-200 rounded-xl text-xs font-mono text-green-800 outline-none"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-green-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Ao alterar o número acima, o link de abertura do WhatsApp (wa.me) é gerado e atualizado de forma sincronizada, evitando divergências entre texto e link.
                </p>
              </div>

              {/* E-mail Institucional */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#0056a4]" />
                    <span className="font-bold text-xs text-gray-900">E-mail Institucional</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={settings.showContactEmail}
                      onChange={(e) => setSettings({ ...settings, showContactEmail: e.target.checked })}
                      className="rounded text-[#0056a4] focus:ring-[#0056a4]"
                    />
                    <span className="text-gray-600">Exibir publicamente no site</span>
                  </label>
                </div>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="itallomarketing@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0056a4]/10 focus:border-[#0056a4] outline-none"
                />
                <span className="text-[10px] text-gray-400 block">
                  Onde aparece: Rodapé, página de Expediente e formulário comercial de Anuncie Conosco.
                </span>
              </div>

              {/* Endereço Comercial e Horário */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#0056a4]" />
                    <span className="font-bold text-xs text-gray-900">Endereço Comercial e Sede</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={settings.showCommercialAddress}
                      onChange={(e) => setSettings({ ...settings, showCommercialAddress: e.target.checked })}
                      className="rounded text-[#0056a4] focus:ring-[#0056a4]"
                    />
                    <span className="text-gray-600">Exibir publicamente no site</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Logradouro e Número
                    </label>
                    <input
                      type="text"
                      value={settings.commercialAddress}
                      onChange={(e) => setSettings({ ...settings, commercialAddress: e.target.value })}
                      placeholder="Rua Divaldo Carvalho Costa, 304 B, 1º Andar"
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Cidade / UF
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settings.city}
                        onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                        placeholder="Estância"
                        className="w-2/3 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                      />
                      <input
                        type="text"
                        value={settings.state}
                        onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                        placeholder="SE"
                        className="w-1/3 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <Clock className="w-3.5 h-3.5 text-[#0056a4]" />
                      <span>Horário de Atendimento</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={settings.showOpeningHours}
                        onChange={(e) => setSettings({ ...settings, showOpeningHours: e.target.checked })}
                        className="rounded text-[#0056a4] focus:ring-[#0056a4]"
                      />
                      <span className="text-gray-500">Exibir</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.openingHours}
                    onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                    placeholder="Segunda a Sexta, das 08h às 18h"
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SEÇÃO 3: INFORMAÇÕES INSTITUCIONAIS DO RODAPÉ
        ========================================================= */}
        {activeSection === 'footer' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#0056a4]">
                <Building2 className="w-5 h-5" />
                <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
                  Informações Institucionais do Rodapé
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Personalize os textos institucionais que aparecem na parte inferior do portal em todas as páginas públicas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Apresentação Institucional (Coluna 1 do Rodapé)
                </label>
                <textarea
                  rows={3}
                  value={settings.footerPresentation}
                  onChange={(e) => setSettings({ ...settings, footerPresentation: e.target.value })}
                  placeholder="Ex: O portal Folha da Região é comprometido com a verdade e a informação de qualidade..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none outline-none focus:border-[#0056a4]"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Texto curto explicativo posicionado logo abaixo do logotipo na primeira coluna do rodapé.
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Texto sobre a Cobertura do Portal
                </label>
                <input
                  type="text"
                  value={settings.footerAboutText}
                  onChange={(e) => setSettings({ ...settings, footerAboutText: e.target.value })}
                  placeholder="Ex: Cobertura em tempo real dos 75 municípios sergipanos..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-[#0056a4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Texto de Direitos Autorais (Copyright)
                </label>
                <input
                  type="text"
                  value={settings.copyrightText}
                  onChange={(e) => setSettings({ ...settings, copyrightText: e.target.value })}
                  placeholder="Ex: Folha da Região Sergipe. Todos os direitos reservados."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-[#0056a4]"
                />
                <span className="text-[10px] text-gray-400 block mt-1">
                  Aparece no rodapé inferior antecedido pelo símbolo de copyright.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ano de Referência do Copyright
                </label>
                <input
                  type="text"
                  value={settings.referenceYear}
                  onChange={(e) => setSettings({ ...settings, referenceYear: e.target.value })}
                  placeholder="Ex: 2026"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-center outline-none focus:border-[#0056a4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome da Empresa Responsável / Razão Social
                </label>
                <input
                  type="text"
                  value={settings.responsibleCompany}
                  onChange={(e) => setSettings({ ...settings, responsibleCompany: e.target.value })}
                  placeholder="Ex: Folha da Região Comunicação & Publicidade LTDA"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-[#0056a4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Informação Adicional do Rodapé
                </label>
                <input
                  type="text"
                  value={settings.additionalFooterInfo}
                  onChange={(e) => setSettings({ ...settings, additionalFooterInfo: e.target.value })}
                  placeholder="Ex: Fundado em Estância - Sergipe"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-[#0056a4]"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SEÇÃO 4: REDES SOCIAIS
        ========================================================= */}
        {activeSection === 'social' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#0056a4]">
                <Share2 className="w-5 h-5" />
                <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
                  Redes Sociais Oficiais
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Configure os perfis nas redes sociais exibidos no cabeçalho e rodapé do portal.
              </p>
            </div>

            <div className="space-y-4">
              {/* Instagram */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-9 h-9 rounded-lg bg-pink-600 text-white flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xs text-gray-900">Instagram Oficial</p>
                    <p className="text-[10px] text-gray-400">Exibido no topo e nos contatos do rodapé</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-lg">
                  <input
                    type="url"
                    value={settings.instagramUrl}
                    onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                    placeholder="https://www.instagram.com/folhadaregiaose"
                    className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.showInstagram}
                      onChange={(e) => setSettings({ ...settings, showInstagram: e.target.checked })}
                      className="rounded text-[#0056a4]"
                    />
                    <span className="text-gray-600 text-[11px]">Exibir</span>
                  </label>
                </div>
              </div>

              {/* Facebook */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xs text-gray-900">Facebook Oficial</p>
                    <p className="text-[10px] text-gray-400">Página oficial de notícias</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-lg">
                  <input
                    type="url"
                    value={settings.facebookUrl}
                    onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                    placeholder="https://www.facebook.com/folhadaregiaose"
                    className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.showFacebook}
                      onChange={(e) => setSettings({ ...settings, showFacebook: e.target.checked })}
                      className="rounded text-[#0056a4]"
                    />
                    <span className="text-gray-600 text-[11px]">Exibir</span>
                  </label>
                </div>
              </div>

              {/* YouTube */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xs text-gray-900">Canal no YouTube</p>
                    <p className="text-[10px] text-gray-400">Vídeos e transmissões</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-lg">
                  <input
                    type="url"
                    value={settings.youtubeUrl || ''}
                    onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/@folhadaregiaose"
                    className="flex-1 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.showYoutube)}
                      onChange={(e) => setSettings({ ...settings, showYoutube: e.target.checked })}
                      className="rounded text-[#0056a4]"
                    />
                    <span className="text-gray-600 text-[11px]">Exibir</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SEÇÃO 5: PÁGINAS INSTITUCIONAIS EDITÁVEIS
        ========================================================= */}
        {activeSection === 'institutional' && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#0056a4]">
                <FileText className="w-5 h-5" />
                <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
                  Páginas Institucionais do Portal
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Edite os textos completos das páginas acessíveis no menu do rodapé: Sobre Nós, Expediente e Privacidade.
              </p>
            </div>

            {/* Sub-navegação entre páginas */}
            <div className="flex gap-2 border-b border-gray-100 pb-3">
              <button
                type="button"
                onClick={() => setActiveInstSubTab('sobreNos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeInstSubTab === 'sobreNos'
                    ? 'bg-[#0056a4] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                1. Sobre Nós
              </button>
              <button
                type="button"
                onClick={() => setActiveInstSubTab('expediente')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeInstSubTab === 'expediente'
                    ? 'bg-[#0056a4] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2. Expediente
              </button>
              <button
                type="button"
                onClick={() => setActiveInstSubTab('privacidade')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeInstSubTab === 'privacidade'
                    ? 'bg-[#0056a4] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                3. Política de Privacidade
              </button>
            </div>

            {/* Sub-aba 1: Sobre Nós */}
            {activeInstSubTab === 'sobreNos' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Título da Página
                  </label>
                  <input
                    type="text"
                    value={settings.institutionalPages.sobreNos.title}
                    onChange={(e) => setSettings({
                      ...settings,
                      institutionalPages: {
                        ...settings.institutionalPages,
                        sobreNos: {
                          ...settings.institutionalPages.sobreNos,
                          title: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Parágrafo de Destaque (Apresentação Inicial)
                  </label>
                  <textarea
                    rows={4}
                    value={settings.institutionalPages.sobreNos.leadParagraph}
                    onChange={(e) => setSettings({
                      ...settings,
                      institutionalPages: {
                        ...settings.institutionalPages,
                        sobreNos: {
                          ...settings.institutionalPages.sobreNos,
                          leadParagraph: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0056a4] uppercase mb-1">
                      Missão
                    </label>
                    <textarea
                      rows={3}
                      value={settings.institutionalPages.sobreNos.mission}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          sobreNos: {
                            ...settings.institutionalPages.sobreNos,
                            mission: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">
                      Valores
                    </label>
                    <textarea
                      rows={3}
                      value={settings.institutionalPages.sobreNos.values}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          sobreNos: {
                            ...settings.institutionalPages.sobreNos,
                            values: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-600 uppercase mb-1">
                      Alcance e Abrangência
                    </label>
                    <textarea
                      rows={3}
                      value={settings.institutionalPages.sobreNos.coverage}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          sobreNos: {
                            ...settings.institutionalPages.sobreNos,
                            coverage: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sub-aba 2: Expediente */}
            {activeInstSubTab === 'expediente' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nome do Diretor Geral / Editor-Chefe
                    </label>
                    <input
                      type="text"
                      value={settings.institutionalPages.expediente.directorName}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          expediente: {
                            ...settings.institutionalPages.expediente,
                            directorName: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      value={settings.institutionalPages.expediente.directorRole}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          expediente: {
                            ...settings.institutionalPages.expediente,
                            directorRole: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      E-mail da Direção
                    </label>
                    <input
                      type="email"
                      value={settings.institutionalPages.expediente.directorEmail}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          expediente: {
                            ...settings.institutionalPages.expediente,
                            directorEmail: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Contato do Departamento Comercial
                    </label>
                    <input
                      type="text"
                      value={settings.institutionalPages.expediente.commercialContact}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          expediente: {
                            ...settings.institutionalPages.expediente,
                            commercialContact: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Locais de Correspondentes & Redação
                    </label>
                    <input
                      type="text"
                      value={settings.institutionalPages.expediente.newsroomLocations}
                      onChange={(e) => setSettings({
                        ...settings,
                        institutionalPages: {
                          ...settings.institutionalPages,
                          expediente: {
                            ...settings.institutionalPages.expediente,
                            newsroomLocations: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sub-aba 3: Privacidade */}
            {activeInstSubTab === 'privacidade' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Declaração Inicial (Conformidade com a LGPD)
                  </label>
                  <textarea
                    rows={3}
                    value={settings.institutionalPages.privacidade.introText}
                    onChange={(e) => setSettings({
                      ...settings,
                      institutionalPages: {
                        ...settings.institutionalPages,
                        privacidade: {
                          ...settings.institutionalPages.privacidade,
                          introText: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Coleta de Dados e Finalidade
                  </label>
                  <textarea
                    rows={3}
                    value={settings.institutionalPages.privacidade.dataCollectionText}
                    onChange={(e) => setSettings({
                      ...settings,
                      institutionalPages: {
                        ...settings.institutionalPages,
                        privacidade: {
                          ...settings.institutionalPages.privacidade,
                          dataCollectionText: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Segurança e Proteção das Credenciais
                  </label>
                  <textarea
                    rows={3}
                    value={settings.institutionalPages.privacidade.securityText}
                    onChange={(e) => setSettings({
                      ...settings,
                      institutionalPages: {
                        ...settings.institutionalPages,
                        privacidade: {
                          ...settings.institutionalPages.privacidade,
                          securityText: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Contato do Encarregado de Dados (DPO / Privacidade)
                  </label>
                  <input
                    type="email"
                    value={settings.institutionalPages.privacidade.dpoContact}
                    onChange={(e) => setSettings({
                      ...settings,
                      institutionalPages: {
                        ...settings.institutionalPages,
                        privacidade: {
                          ...settings.institutionalPages.privacidade,
                          dpoContact: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botão de salvar no rodapé da página */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cancelar / Restaurar Padrões
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Gravando Alterações...' : 'Salvar Todas as Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
};
