import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck, Award, Users, ExternalLink } from 'lucide-react';
import { portalSettingsService } from '../../lib/supabase';
import { PortalSettings } from '../../types/database';

interface InstitutionalPageProps {
  page: 'sobre-nos' | 'expediente' | 'privacidade' | 'anuncie-conosco';
  onBack: () => void;
}

export const InstitutionalPage: React.FC<InstitutionalPageProps> = ({ page, onBack }) => {
  const [settings, setSettings] = useState<PortalSettings>(() => portalSettingsService.getSettingsSync());
  const [adForm, setAdForm] = useState({
    company: '',
    contactName: '',
    phone: '',
    email: '',
    placement: 'header',
    message: ''
  });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(portalSettingsService.getSettingsSync());
    };
    window.addEventListener('folha_portal_settings_updated', handleUpdate);
    return () => window.removeEventListener('folha_portal_settings_updated', handleUpdate);
  }, []);

  const handleAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 6000);
    setAdForm({
      company: '',
      contactName: '',
      phone: '',
      email: '',
      placement: 'header',
      message: ''
    });
  };

  const sobre = settings.institutionalPages.sobreNos;
  const exped = settings.institutionalPages.expediente;
  const priv = settings.institutionalPages.privacidade;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-600 hover:text-[#0056a4] transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à Página Inicial
      </button>

      {/* 1. SOBRE NÓS */}
      {page === 'sobre-nos' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-8 bg-[#0056a4] rounded"></span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
              {sobre.title || `Sobre a ${settings.officialName}`}
            </h1>
          </div>
          <p className="text-base text-gray-700 leading-relaxed font-medium">
            {sobre.leadParagraph}
          </p>

          {sobre.historyParagraphs && sobre.historyParagraphs.length > 0 && (
            <div className="space-y-3 pt-2 text-sm text-gray-600 leading-relaxed">
              {sobre.historyParagraphs.map((par, i) => (
                <p key={i}>{par}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              <Award className="w-8 h-8 text-[#0056a4] mb-3" />
              <h3 className="font-black text-sm uppercase text-gray-900 mb-2">Missão</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {sobre.mission}
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mb-3" />
              <h3 className="font-black text-sm uppercase text-gray-900 mb-2">Valores</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {sobre.values}
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              <Users className="w-8 h-8 text-amber-500 mb-3" />
              <h3 className="font-black text-sm uppercase text-gray-900 mb-2">Alcance</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {sobre.coverage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXPEDIENTE */}
      {page === 'expediente' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-8 bg-[#0056a4] rounded"></span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
              Expediente
            </h1>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Estrutura editorial e administrativa da {settings.officialName} {settings.logoBadgeText ? `(${settings.logoBadgeText})` : ''} - Sergipe.
          </p>

          <div className="space-y-4 pt-4 border-t border-gray-100 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">
                  {exped.directorRole || 'Direção Geral & Editor-Chefe'}
                </p>
                <p className="font-bold text-gray-900 text-base mt-1">
                  {exped.directorName || 'Ítallo Nascimento'}
                </p>
                <p className="text-xs text-gray-500">
                  {exped.directorEmail || settings.contactEmail}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">
                  {exped.commercialDept || 'Departamento Comercial & Marketing'}
                </p>
                <p className="font-bold text-gray-900 text-base mt-1">
                  {settings.officialName}
                </p>
                <p className="text-xs text-gray-500">
                  {exped.commercialContact || settings.contactPhone || settings.whatsappNumber}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">Sede Administrativa</p>
                <p className="font-bold text-gray-900 text-base mt-1">
                  {settings.city} - {settings.state}
                </p>
                <p className="text-xs text-gray-500">
                  {exped.administrativeHeadquarters || settings.commercialAddress}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">Redação & Correspondentes</p>
                <p className="font-bold text-gray-900 text-base mt-1">
                  {exped.newsroomLocations || 'Aracaju, Estância, Lagarto e Itabaiana'}
                </p>
                <p className="text-xs text-gray-500">
                  {exped.coverageHours || 'Cobertura estadual 24 horas'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. POLÍTICA DE PRIVACIDADE */}
      {page === 'privacidade' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-8 bg-[#0056a4] rounded"></span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
              Política de Privacidade
            </h1>
          </div>

          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              {priv.introText}
            </p>
            <h3 className="font-black text-gray-900 text-base uppercase">1. Coleta de Dados</h3>
            <p>
              {priv.dataCollectionText}
            </p>
            <h3 className="font-black text-gray-900 text-base uppercase">2. Segurança e Criptografia</h3>
            <p>
              {priv.securityText}
            </p>
            <h3 className="font-black text-gray-900 text-base uppercase">3. Cookies e Métricas</h3>
            <p>
              {priv.cookiesText}
            </p>
            <h3 className="font-black text-gray-900 text-base uppercase">4. Direitos do Titular</h3>
            <p>
              {priv.userRightsText}
            </p>
            {priv.dpoContact && (
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 mt-4">
                <p className="text-xs font-black uppercase text-[#0056a4]">Encarregado de Proteção de Dados (DPO)</p>
                <p className="text-xs text-gray-700 mt-1">
                  Para solicitações relativas à privacidade, contate:{' '}
                  <a href={`mailto:${priv.dpoContact}`} className="font-bold text-[#0056a4] hover:underline">
                    {priv.dpoContact}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ANUNCIE CONOSCO */}
      {page === 'anuncie-conosco' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-3 h-8 bg-red-600 rounded"></span>
              <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
                Anuncie na {settings.officialName}
              </h1>
            </div>
            <p className="text-sm text-gray-600">
              Coloque sua marca em evidência para milhares de leitores qualificados em todo o estado de {settings.state === 'SE' ? 'Sergipe' : settings.state}.
            </p>
          </div>

          {sent && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Proposta recebida com sucesso!</p>
                <p className="text-xs">Nossa equipe comercial entrará em contato em breve pelo telefone/WhatsApp informado.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleAdSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome da Empresa / Marca
                </label>
                <input
                  type="text"
                  required
                  value={adForm.company}
                  onChange={(e) => setAdForm({ ...adForm, company: e.target.value })}
                  placeholder={`Ex: Auto Peças ${settings.city}`}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  required
                  value={adForm.contactName}
                  onChange={(e) => setAdForm({ ...adForm, contactName: e.target.value })}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={adForm.phone}
                    onChange={(e) => setAdForm({ ...adForm, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={adForm.email}
                    onChange={(e) => setAdForm({ ...adForm, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Formato Desejado
                </label>
                <select
                  value={adForm.placement}
                  onChange={(e) => setAdForm({ ...adForm, placement: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                >
                  <option value="header">Super Banner Topo (728x90)</option>
                  <option value="sidebar">Quadrado Barra Lateral (300x250 / 300x600)</option>
                  <option value="in_content">Banner Entre Notícias (728x90)</option>
                  <option value="classifieds">Destaque nos Classificados</option>
                  <option value="custom">Campanha Personalizada / Publieditorial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Mensagem / Objetivo da Campanha
                </label>
                <textarea
                  rows={4}
                  value={adForm.message}
                  onChange={(e) => setAdForm({ ...adForm, message: e.target.value })}
                  placeholder="Conte-nos brevemente o objetivo da campanha ou tire suas dúvidas..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Enviar Solicitação Comercial
              </button>
            </form>

            <div className="space-y-6 bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-100 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-black text-sm uppercase text-gray-900 tracking-wider">
                  Canais Diretos de Atendimento Comercial
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Para propostas sob medida, planos mensais ou patrocínios especiais, nossa equipe atende diretamente:
                </p>

                <div className="space-y-3 pt-2">
                  {settings.contactEmail && (
                    <div className="flex items-center gap-3 text-xs">
                      <Mail className="w-4 h-4 text-[#0056a4] shrink-0" />
                      <span className="font-bold text-gray-800">{settings.contactEmail}</span>
                    </div>
                  )}
                  {settings.contactPhone && (
                    <div className="flex items-center gap-3 text-xs">
                      <Phone className="w-4 h-4 text-[#0056a4] shrink-0" />
                      <span className="font-bold text-gray-800">{settings.contactPhone}</span>
                    </div>
                  )}
                  {settings.whatsappNumber && (
                    <div className="flex items-center gap-3 text-xs">
                      <div className="w-4 h-4 text-green-600 shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
                        </svg>
                      </div>
                      <a 
                        href={settings.whatsappLink || `https://wa.me/55${settings.whatsappNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-green-700 hover:underline flex items-center gap-1"
                      >
                        {settings.whatsappNumber} (WhatsApp)
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {settings.commercialAddress && (
                    <div className="flex items-start gap-3 text-xs">
                      <MapPin className="w-4 h-4 text-[#0056a4] mt-0.5 shrink-0" />
                      <span className="text-gray-700">
                        {settings.commercialAddress}, {settings.city} - {settings.state}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-gray-200/80">
                <p className="text-[10px] font-black uppercase text-gray-400">Público Qualificado</p>
                <p className="text-xs text-gray-700 mt-1 font-medium">
                  Audiência diária em todos os 75 municípios de Sergipe com lealdade de leitura e alta taxa de engajamento regional.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
