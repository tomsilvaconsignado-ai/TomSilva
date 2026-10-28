import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, MapPin, Calendar, Share2, AlertTriangle, ShieldCheck, 
  Check, Phone, MessageCircle, Briefcase, Clock, FileText, ChevronLeft, ChevronRight, Eye 
} from 'lucide-react';
import { ClassifiedItem } from '../../types/database';
import { classifiedsService } from '../../lib/supabase';
import { formatPrice, getTypeLabel } from './ClassifiedCard';
import { formatRelativeTime } from '../news/ArticleCard';
import { ClassifiedReportModal } from './ClassifiedReportModal';
import { getClassifiedShareData, getClassifiedCanonicalUrl } from '../../lib/seo';
import { hasShareablePhoto, usePreviewStatus, PREVIEW_PENDING_MESSAGE } from '../../lib/share';

interface ClassifiedDetailProps {
  classified: ClassifiedItem;
  onBack: () => void;
}

export const ClassifiedDetail: React.FC<ClassifiedDetailProps> = ({ classified, onBack }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    classifiedsService.incrementViews(classified.id);
  }, [classified.id]);

  const images = classified.images && classified.images.length > 0 
    ? classified.images 
    : ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'];

  const typeInfo = getTypeLabel(classified.type);
  const isJob = classified.section === 'vagas_emprego' || classified.section === 'procuro_emprego';

  // Sanitização do número de WhatsApp (somente dígitos)
  const cleanPhone = classified.phone.replace(/\D/g, '');
  const internationalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  
  const whatsappMessage = encodeURIComponent(
    `Olá, vi seu anúncio no Portal Folha da Região: "${classified.title}" (Código: ${classified.code}). Ainda está disponível?`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${internationalPhone}&text=${whatsappMessage}`;

  // Compartilha o link permanente do anúncio (/classificado/slug). O WhatsApp e o Facebook leem
  // a página desse link e mostram a primeira foto, o título e o nome "Folha da Região".
  // Só compartilha anúncio publicado e válido, com foto e título, cuja página do link já mostra a prévia completa
  const isLive = classified.status === 'published' && new Date(classified.expiresAt) > new Date();
  const shareBlockReason =
    !isLive ? 'Só anúncios publicados e dentro da validade podem ser compartilhados.'
    : !classified.title?.trim() ? 'O anúncio precisa de um título para ser compartilhado.'
    : !(classified.images || []).some(hasShareablePhoto) ? 'Adicione ao menos uma foto ao anúncio para poder compartilhá-lo.'
    : null;
  const preview = usePreviewStatus(
    getClassifiedCanonicalUrl(classified.slug || classified.id),
    classified.title || '',
    !shareBlockReason
  );

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'copy') => {
    if (shareBlockReason) {
      alert(shareBlockReason);
      return;
    }
    if (preview.status !== 'ready') {
      // Confere de novo: o deploy pode ter terminado desde a abertura do anúncio
      if (!(await preview.recheck())) {
        alert(PREVIEW_PENDING_MESSAGE);
        return;
      }
    }

    const share = getClassifiedShareData(classified);

    if (platform === 'whatsapp') {
      window.open(share.whatsappUrl, '_blank');
      return;
    }
    if (platform === 'facebook') {
      window.open(share.facebookUrl, '_blank');
      return;
    }

    let ok = false;
    try {
      await navigator.clipboard.writeText(share.canonicalUrl);
      ok = true;
    } catch {
      // Navegadores sem acesso à área de transferência: cópia pelo método antigo
      const field = document.createElement('textarea');
      field.value = share.canonicalUrl;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      document.body.removeChild(field);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else {
      window.prompt('Copie o link do anúncio:', share.canonicalUrl);
    }
  };

  const formattedDate = new Date(classified.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-in fade-in duration-300">
      {/* Botão Voltar */}
      <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-600 hover:text-[#0056a4] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Classificados
        </button>

        <span className="text-[11px] font-bold text-gray-400">
          Código do Anúncio: <strong className="text-gray-900 font-mono">#{classified.code}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA: Galeria de Fotos e Detalhes (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Galeria de até 3 fotos */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="relative aspect-[4/3] bg-gray-900 overflow-hidden group">
              <img
                src={images[activeImageIndex]}
                alt={classified.title}
                className="w-full h-full object-contain md:object-cover"
              />

              {/* Botões de Navegação se tiver mais de 1 foto */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded bg-black/70 text-white text-xs font-bold">
                    {activeImageIndex + 1} de {images.length} fotos
                  </span>
                </>
              )}
            </div>

            {/* Miniaturas */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx ? 'border-[#0056a4] ring-2 ring-[#0056a4]/20' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Descrição Completa */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight text-gray-900 border-l-4 border-[#0056a4] pl-3">
              Descrição do Anúncio
            </h3>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">
              {classified.description}
            </p>
          </div>

          {/* Seção Específica para Vagas / Emprego */}
          {isJob && (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-black uppercase tracking-tight text-gray-900 border-l-4 border-red-600 pl-3">
                Informações da Oportunidade
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {classified.jobRole && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Cargo / Função</span>
                    <strong className="text-gray-900 text-sm">{classified.jobRole}</strong>
                  </div>
                )}
                {classified.jobArea && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Área Profissional</span>
                    <strong className="text-gray-900 text-sm">{classified.jobArea}</strong>
                  </div>
                )}
                {classified.contractType && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Contratação</span>
                    <strong className="text-gray-900 text-sm">{classified.contractType}</strong>
                  </div>
                )}
                {classified.workload && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Jornada</span>
                    <strong className="text-gray-900 text-sm">{classified.workload}</strong>
                  </div>
                )}
              </div>

              {classified.experience && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Experiência Exigida:</span>
                  <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg leading-relaxed">{classified.experience}</p>
                </div>
              )}

              {classified.requirements && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Requisitos da Vaga:</span>
                  <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg leading-relaxed">{classified.requirements}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: Preço, Contato WhatsApp, Anunciante e Segurança (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Principal de Preço e Ação */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            {/* Badges de Categoria e Modalidade */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-800">
                {classified.category}
              </span>
            </div>

            {/* Título do Anúncio */}
            <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-snug tracking-tight">
              {classified.title}
            </h1>

            {/* Preço ou Valor */}
            <div className="py-3 border-y border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                {isJob ? 'Remuneração / Proposta' : 'Valor do Anúncio'}
              </span>
              <span className="text-3xl font-black text-[#0056a4] tracking-tight mt-0.5 block">
                {formatPrice(classified)}
              </span>
            </div>

            {/* Localização e Data */}
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0056a4]" />
                <span>{classified.city} - {classified.state}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0056a4]" />
                <span>Publicado em {formattedDate} ({formatRelativeTime(classified.createdAt)})</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0056a4]" />
                <span>{classified.viewsCount || 0} visualizações</span>
              </div>
            </div>

            {/* Bloco do Anunciante */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Anunciado por</p>
              <p className="font-bold text-gray-900 text-sm">{classified.advertiserName}</p>
              <p className="text-xs text-gray-500 font-mono">Contato: {classified.phone}</p>
            </div>

            {/* Botão Oficial do WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              Chamar no WhatsApp
            </a>

            {/* Compartilhamento */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#0056a4]" /> Compartilhar:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="px-2.5 py-1 bg-green-50 text-green-700 rounded font-bold hover:bg-green-100 transition-colors cursor-pointer text-xs"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded font-bold hover:bg-blue-100 transition-colors cursor-pointer text-xs"
                >
                  Facebook
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  title="Copiar o link do anúncio para colar no WhatsApp, Facebook ou Instagram"
                  className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded font-bold hover:bg-gray-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-green-600" /> : null}
                  {copied ? 'Link copiado!' : 'Copiar link'}
                </button>
              </div>
            </div>
            {(shareBlockReason || preview.status === 'pending') && (
              <p className="text-[11px] text-amber-700 font-semibold">
                {shareBlockReason || 'Prévia com foto e título ainda em geração: o compartilhamento será liberado em alguns minutos.'}
              </p>
            )}

            {/* Botão de Denúncia */}
            <div className="pt-2 text-center border-t border-gray-100">
              <button
                onClick={() => setIsReportOpen(true)}
                className="text-[11px] font-bold text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1 mx-auto cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Denunciar anúncio suspeito ou abusivo
              </button>
            </div>
          </div>

          {/* Dicas de Segurança e Prevenção de Golpes */}
          <div className="bg-amber-50/70 p-6 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Dicas de Segurança Folha da Região
            </div>
            <ul className="text-xs text-amber-900 space-y-1.5 list-disc pl-4 leading-relaxed font-medium">
              <li><strong>Nunca faça pagamentos ou transferências antecipadas</strong> sem antes ver o produto ou assinar contrato formal.</li>
              <li>Prefira marcar encontros em <strong>locais públicos e movimentados</strong> durante o dia.</li>
              <li>Desconfie de valores excessivamente abaixo do valor de mercado.</li>
              <li>Para vagas de emprego: empresas sérias <strong>nunca cobram taxas</strong> para processos seletivos.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Denúncia */}
      <ClassifiedReportModal
        classified={classified}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
