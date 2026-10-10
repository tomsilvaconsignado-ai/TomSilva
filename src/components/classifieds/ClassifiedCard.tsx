import React from 'react';
import { MapPin, Calendar, Tag, Briefcase, Camera } from 'lucide-react';
import { ClassifiedItem } from '../../types/database';
import { formatRelativeTime } from '../news/ArticleCard';

interface ClassifiedCardProps {
  classified: ClassifiedItem;
  onSelect: (classified: ClassifiedItem) => void;
}

export const formatPrice = (classified: ClassifiedItem): string => {
  if (classified.priceType === 'free') return 'Gratuito';
  if (classified.priceType === 'negotiable') return 'A combinar';
  if (classified.price !== undefined && classified.price !== null) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2
    }).format(classified.price);
  }
  return 'A combinar';
};

export const getTypeLabel = (type: string): { label: string; color: string } => {
  switch (type) {
    case 'vendo':
      return { label: 'Vendo', color: 'bg-emerald-600 text-white' };
    case 'compro':
      return { label: 'Compro', color: 'bg-blue-600 text-white' };
    case 'alugo':
      return { label: 'Alugo', color: 'bg-purple-600 text-white' };
    case 'ofereco_servico':
      return { label: 'Serviço', color: 'bg-amber-600 text-white' };
    case 'ofereco_vaga':
      return { label: 'Vaga de Emprego', color: 'bg-red-600 text-white' };
    case 'procuro_emprego':
      return { label: 'Procuro Trabalho', color: 'bg-indigo-600 text-white' };
    default:
      return { label: 'Anúncio', color: 'bg-gray-700 text-white' };
  }
};

export const ClassifiedCard: React.FC<ClassifiedCardProps> = ({ classified, onSelect }) => {
  const typeInfo = getTypeLabel(classified.type);
  const isJob = classified.section === 'vagas_emprego' || classified.section === 'procuro_emprego';
  const mainImage = classified.images && classified.images.length > 0 
    ? classified.images[0] 
    : 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop';

  return (
    <div
      onClick={() => onSelect(classified)}
      className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#0056a4]/30 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Imagem com Badges */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={mainImage}
          alt={classified.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />

        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-xs text-white">
            {classified.category}
          </span>
        </div>

        {/* Quantidade de fotos */}
        {classified.images && classified.images.length > 1 && (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 z-10">
            <Camera className="w-3 h-3" />
            {classified.images.length} fotos
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col flex-1">
        {/* Preço ou Cargo */}
        {isJob ? (
          <div className="mb-1">
            <p className="text-base font-black text-[#0056a4] flex items-center gap-1">
              <Briefcase className="w-4 h-4 shrink-0" />
              {classified.jobRole || classified.title}
            </p>
            {classified.contractType && (
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {classified.contractType} {classified.workload ? `• ${classified.workload}` : ''}
              </span>
            )}
          </div>
        ) : (
          <p className="text-lg font-black text-[#0056a4] tracking-tight mb-1">
            {formatPrice(classified)}
          </p>
        )}

        {/* Título */}
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#0056a4] transition-colors line-clamp-2 leading-snug">
          {classified.title}
        </h3>

        {/* Anunciante */}
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
          Por: <strong className="text-gray-700">{classified.advertiserName}</strong>
        </p>

        {/* Localização e Data */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <span className="flex items-center gap-1 text-gray-600 truncate max-w-[140px]">
            <MapPin className="w-3 h-3 text-[#0056a4] shrink-0" />
            {classified.city} - {classified.state}
          </span>

          <span className="flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" />
            {formatRelativeTime(classified.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
