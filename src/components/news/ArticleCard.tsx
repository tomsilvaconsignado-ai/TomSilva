import React from 'react';
import { Play } from 'lucide-react';
import { Article } from '../../types/database';
import { ViewCounter } from './ViewCounter';

interface ArticleCardProps {
  article: Article;
  variant?: 'hero' | 'secondary' | 'feed' | 'compact';
  onSelectArticle: (article: Article) => void;
}

// Formatação amigável de tempo em português
export const formatRelativeTime = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'há poucos minutos';
  if (diffHours === 1) return 'há cerca de 1 hora';
  if (diffHours < 24) return `há cerca de ${diffHours} horas`;
  if (diffDays === 1) return 'há 1 dia';
  return `há ${diffDays} dias`;
};

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  variant = 'feed',
  onSelectArticle
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelectArticle(article);
  };

  // 1. VARIANTE HERO (Destaque Principal)
  if (variant === 'hero') {
    return (
      <article className="card-shadow">
        <a
          href={`/noticia/${article.slug}`}
          onClick={handleClick}
          className="group relative block w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-xl bg-gray-100 shadow-2xl cursor-pointer"
        >
          <img
            alt={article.title}
            loading="lazy"
            src={article.imageUrl}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-12">
            <div className="max-w-4xl w-full">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-block px-3 py-1 bg-[#0056a4] text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-lg">
                  {article.category}
                </span>
                {article.isVideo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-md">
                    <Play className="w-3 h-3 fill-current" /> Vídeo
                  </span>
                )}
              </div>
              <h2 className="text-hero font-black text-white group-hover:text-blue-300 transition-colors tracking-tighter mb-4 line-clamp-3">
                {article.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-[0.15em] md:tracking-[0.2em]">
                <span>{formatRelativeTime(article.createdAt)}</span>
                <div className="w-8 h-px bg-white/20"></div>
                <ViewCounter views={article.viewsCount} />
                <span className="text-blue-400 group-hover:translate-x-1 transition-transform ml-auto font-black">
                  Leia Mais →
                </span>
              </div>
            </div>
          </div>
        </a>
      </article>
    );
  }

  // 2. VARIANTE SECONDARY (Grid 2 colunas)
  if (variant === 'secondary') {
    return (
      <article className="h-full">
        <a
          href={`/noticia/${article.slug}`}
          onClick={handleClick}
          className="group flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-[#0056a4]/20 transition-all duration-300 cursor-pointer"
        >
          <div className="relative aspect-video overflow-hidden bg-gray-100">
            <img
              alt={article.title}
              loading="lazy"
              src={article.imageUrl}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {article.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[#0056a4]/90 flex items-center justify-center text-white shadow-2xl scale-90 group-hover:scale-100 transition-all duration-500">
                  <Play className="w-7 h-7 fill-current ml-1" />
                </div>
              </div>
            )}
          </div>
          <div className="p-4 md:p-5 flex flex-col flex-1">
            <div className="flex justify-between items-start mb-2 md:mb-3">
              <span className="text-[#0056a4] text-[10px] font-black uppercase tracking-widest border-b-2 border-[#0056a4]/20 pb-0.5">
                {article.category}
              </span>
              {article.isVideo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-sm">
                  <Play className="w-2.5 h-2.5 fill-current" /> Vídeo
                </span>
              )}
            </div>
            <h3 className="text-base md:text-lg font-black text-gray-900 leading-[1.2] group-hover:text-[#0056a4] transition-colors line-clamp-2 tracking-tight">
              {article.title}
            </h3>
            {article.subtitle && (
              <p className="mt-2 text-gray-500 text-xs line-clamp-2 leading-relaxed font-medium">
                {article.subtitle}
              </p>
            )}
            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  {formatRelativeTime(article.createdAt)}
                </span>
                <ViewCounter views={article.viewsCount} />
              </div>
              <span className="text-[#0056a4] text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                Ler agora →
              </span>
            </div>
          </div>
        </a>
      </article>
    );
  }

  // 3. VARIANTE FEED (Lista de últimas notícias)
  if (variant === 'feed') {
    return (
      <article>
        <a
          href={`/noticia/${article.slug}`}
          onClick={handleClick}
          className="group flex gap-4 md:gap-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors px-2 rounded-lg cursor-pointer"
        >
          <div className="relative w-28 md:w-32 h-20 md:h-24 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
            <img
              alt={article.title}
              loading="lazy"
              src={article.imageUrl}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {article.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[#0056a4] text-[10px] font-black uppercase tracking-widest">
                {article.category}
              </span>
            </div>
            <h4 className="text-sm md:text-base font-bold text-gray-900 leading-tight group-hover:text-[#0056a4] transition-colors line-clamp-2">
              {article.title}
            </h4>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {formatRelativeTime(article.createdAt)}
              </span>
              <ViewCounter views={article.viewsCount} />
            </div>
          </div>
        </a>
      </article>
    );
  }

  // 4. VARIANTE COMPACT (Mais lidas da Sidebar)
  return (
    <article>
      <a
        href={`/noticia/${article.slug}`}
        onClick={handleClick}
        className="group py-3 border-b border-gray-50 last:border-0 block hover:pl-2 transition-all cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 bg-[#0056a4] rounded-full mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-black text-gray-900 group-hover:text-[#0056a4] transition-colors leading-snug tracking-tight line-clamp-2">
              {article.title}
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">
                {formatRelativeTime(article.createdAt)}
              </span>
              <ViewCounter views={article.viewsCount} />
            </div>
          </div>
        </div>
      </a>
    </article>
  );
};
