import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Shield } from 'lucide-react';
import { newsletterService } from '../../lib/supabase';

interface FooterProps {
  onOpenInstitutional: (page: 'sobre-nos' | 'expediente' | 'privacidade' | 'anuncie-conosco') => void;
  onOpenAdmin: () => void;
  onGoHome: () => void;
  onOpenClassifieds?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenInstitutional,
  onOpenAdmin,
  onGoHome,
  onOpenClassifieds
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 mb-16">
          {/* Coluna 1: Sobre */}
          <div className="space-y-6">
            <button onClick={onGoHome} className="inline-block group text-left cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-black tracking-tighter text-[#0056a4] uppercase font-sans">
                  FOLHA <span className="text-gray-900">DA REGIÃO</span>
                </span>
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded">
                  ONLINE
                </span>
              </div>
              <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase group-hover:text-[#0056a4] transition-colors">
                A NOTÍCIA ONDE VOCÊ ESTIVER
              </p>
            </button>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              O portal Folha da Região é comprometido com a verdade e a informação de qualidade para todo o estado de Sergipe.
            </p>
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

          {/* Coluna 3: Contato */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 border-l-4 border-[#0056a4] pl-3">
              Contato
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <Mail className="w-4 h-4 text-[#0056a4] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">E-mail</p>
                  <a href="mailto:itallomarketing@gmail.com" className="text-gray-900 font-bold text-sm hover:underline">
                    itallomarketing@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <Phone className="w-4 h-4 text-[#0056a4] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Telefone</p>
                  <a href="tel:79999776199" className="text-gray-900 font-bold text-sm hover:underline">
                    (79) 99977-6199
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="w-4 h-4 text-green-500 mt-0.5 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">WhatsApp</p>
                  <a href="https://wa.me/557999910495" target="_blank" rel="noopener noreferrer" className="text-gray-900 font-bold text-sm hover:underline">
                    (79) 99910-495
                  </a>
                </div>
              </li>
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
                  <a href="https://www.instagram.com/folhadaregiaose" target="_blank" rel="noopener noreferrer" className="text-gray-900 font-bold text-sm hover:underline">
                    @folhadaregiaose
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <MapPin className="w-4 h-4 text-[#0056a4] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Endereço</p>
                  <p className="text-gray-900 font-bold text-sm leading-tight">
                    Rua Divaldo Carvalho Costa, 304 B 1º Andar Estância SE
                  </p>
                </div>
              </li>
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

        {/* Rodapé Bottom */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
            © {new Date().getFullYear()} Folha da Região Sergipe. Todos os direitos reservados.
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
