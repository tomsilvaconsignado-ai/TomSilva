import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Shield, Clock } from 'lucide-react';
import { newsletterService, portalSettingsService } from '../../lib/supabase';
import { PortalSettings, AdItem } from '../../types/database';
import { getAssetUrl } from '../../lib/assets';
import { AdSlot } from '../news/AdSlot';

interface FooterProps {
  onOpenInstitutional: (page: 'sobre-nos' | 'expediente' | 'privacidade' | 'anuncie-conosco') => void;
  onOpenAdmin: () => void;
  onGoHome: () => void;
  onOpenClassifieds?: () => void;
  footerAds?: AdItem[];
}

export const Footer: React.FC<FooterProps> = ({
  onOpenInstitutional,
  onOpenAdmin,
  onGoHome,
  onOpenClassifieds,
  footerAds
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PortalSettings>(() => portalSettingsService.getSettingsSync());

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(portalSettingsService.getSettingsSync());
    };
    window.addEventListener('folha_portal_settings_updated', handleUpdate);
    return () => window.removeEventListener('folha_portal_settings_updated', handleUpdate);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setLoading(true);
    await newsletterService.subscribe(email);
    setLoading(false);
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  // Formatação segura de telefone para link tel:
  const phoneTelLink = settings.contactPhone ? `tel:${settings.contactPhone.replace(/\D/g, '')}` : '';

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 mb-16">
          {/* Coluna 1: Sobre & Identidade Oficial */}
          <div className="space-y-6">
            <button onClick={onGoHome} className="inline-block group text-left cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={getAssetUrl(settings.customLogoUrl || 'vetor.svg')}
                  alt={settings.officialName || 'Folha da Região'}
                  className="h-10 w-auto max-w-[220px] object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const fallbackUrl = getAssetUrl('vetor.svg');
                    if (target.src !== fallbackUrl) {
                      target.src = fallbackUrl;
                    }
                  }}
                />
              </div>
              <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase group-hover:text-[#0056a4] transition-colors">
                {settings.tagline}
              </p>
            </button>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              {settings.footerPresentation || settings.shortInstitutionalText}
            </p>
            {settings.responsibleCompany && (
              <p className="text-[11px] text-gray-400 font-medium">
                {settings.responsibleCompany}
              </p>
            )}
          </div>

          {/* Coluna 2: Institucional */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 border-l-4 border-[#0056a4] pl-3">
              Institucional
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => onOpenInstitutional('sobre-nos')}
                  className="text-gray-500 hover:text-[#0056a4] text-sm font-bold transition-colors cursor-pointer"
                >
                  Sobre Nós
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenInstitutional('expediente')}
                  className="text-gray-500 hover:text-[#0056a4] text-sm font-bold transition-colors cursor-pointer"
                >
                  Expediente
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenInstitutional('privacidade')}
                  className="text-gray-500 hover:text-[#0056a4] text-sm font-bold transition-colors cursor-pointer"
                >
                  Privacidade
                </button>
              </li>
              {onOpenClassifieds && (
                <li>
                  <button
                    onClick={onOpenClassifieds}
                    className="text-amber-600 hover:text-amber-700 text-sm font-black transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Classificados</span>
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded uppercase">
                      NOVO
                    </span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => onOpenInstitutional('anuncie-conosco')}
                  className="text-gray-500 hover:text-[#0056a4] text-sm font-bold transition-colors cursor-pointer"
                >
                  Anuncie Conosco
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Contato & Canais */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 border-l-4 border-[#0056a4] pl-3">
              Contato
            </h4>
            <ul className="space-y-4">
              {/* E-mail */}
              {settings.showContactEmail && settings.contactEmail && (
                <li className="flex items-start gap-3 group">
                  <Mail className="w-4 h-4 text-[#0056a4] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">E-mail</p>
                    <a href={`mailto:${settings.contactEmail}`} className="text-gray-900 font-bold text-sm hover:underline">
                      {settings.contactEmail}
                    </a>
                  </div>
                </li>
              )}

              {/* Telefone */}
              {settings.showContactPhone && settings.contactPhone && (
                <li className="flex items-start gap-3 group">
                  <Phone className="w-4 h-4 text-[#0056a4] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Telefone</p>
                    <a href={phoneTelLink} className="text-gray-900 font-bold text-sm hover:underline">
                      {settings.contactPhone}
                    </a>
                  </div>
                </li>
              )}

              {/* WhatsApp com sincronização de link wa.me */}
              {settings.showWhatsapp && settings.whatsappNumber && (
                <li className="flex items-start gap-3 group">
                  <div className="w-4 h-4 text-green-500 mt-0.5 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">WhatsApp</p>
                    <a 
                      href={settings.whatsappLink || `https://wa.me/55${settings.whatsappNumber.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-900 font-bold text-sm hover:underline"
                    >
                      {settings.whatsappNumber}
                    </a>
                  </div>
                </li>
              )}

              {/* Instagram */}
              {settings.showInstagram && settings.instagramUrl && (
                <li className="flex items-start gap-3 group">
                  <div className="w-4 h-4 text-pink-600 mt-0.5 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Instagram</p>
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-bold text-sm hover:underline">
                      @{settings.instagramUrl.split('.com/')[1]?.replace(/\/$/, '') || 'folhadaregiaose'}
                    </a>
                  </div>
                </li>
              )}

              {/* Endereço */}
              {settings.showCommercialAddress && settings.commercialAddress && (
                <li className="flex items-start gap-3 group">
                  <MapPin className="w-4 h-4 text-[#0056a4] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Endereço</p>
                    <p className="text-gray-900 font-bold text-sm leading-tight">
                      {settings.commercialAddress} {settings.city && `- ${settings.city}`} {settings.state && settings.state}
                    </p>
                  </div>
                </li>
              )}

              {/* Horário */}
              {settings.showOpeningHours && settings.openingHours && (
                <li className="flex items-start gap-3 group">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Atendimento</p>
                    <p className="text-gray-700 font-medium text-xs">
                      {settings.openingHours}
                    </p>
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* Coluna 4: Newsletter */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 border-l-4 border-[#0056a4] pl-3">
              Newsletter
            </h4>
            <p className="text-gray-500 text-sm font-medium">
              Receba as principais notícias do dia no seu e-mail.
            </p>
            {subscribed ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Obrigado por se inscrever!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#0056a4]/10 outline-none font-medium"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#0056a4] text-white p-2.5 rounded-lg hover:bg-[#004482] transition-all shadow-md cursor-pointer disabled:opacity-50"
                  aria-label="Inscrever-se"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Publicidade de Rodapé (Posicionada imediatamente acima da área de direitos reservados e acesso administrativo) */}
        <div className="py-6 border-t border-gray-100 flex justify-center w-full overflow-hidden">
          <AdSlot placement="footer" ads={footerAds} />
        </div>

        {/* Rodapé Bottom */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
            © {settings.referenceYear || new Date().getFullYear()} {settings.copyrightText || `${settings.officialName}. Todos os direitos reservados.`}
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={onOpenAdmin}
              className="text-gray-400 hover:text-gray-900 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3 h-3 text-[#0056a4]" />
              Área Administrativa
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
