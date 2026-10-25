import React from 'react';

// Esqueleto da página inicial exibido enquanto as notícias atuais chegam do banco,
// no lugar de mostrar por um instante a cópia antiga embutida no site.
const Block: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-200/80 rounded-xl ${className}`} />
);

export const HomeSkeleton: React.FC = () => (
  <div className="container mx-auto px-4 py-6 animate-pulse" aria-busy="true" aria-label="Carregando as notícias mais recentes">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-8">
        {/* Manchete principal */}
        <Block className="w-full h-[260px] md:h-[360px]" />

        {/* Destaques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <Block className="w-full h-44 rounded-none" />
              <div className="p-5 space-y-3">
                <Block className="h-3 w-20" />
                <Block className="h-4 w-full" />
                <Block className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        {/* Últimas notícias */}
        <div className="space-y-5">
          <Block className="h-5 w-48" />
          {[0, 1, 2].map(i => (
            <div key={i} className="flex gap-4">
              <Block className="w-28 h-20 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Block className="h-3 w-16" />
                <Block className="h-4 w-full" />
                <Block className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coluna lateral */}
      <aside className="lg:col-span-4 space-y-8 flex flex-col items-center lg:items-stretch">
        <Block className="w-full max-w-[300px] h-[300px] mx-auto" />
        <div className="w-full bg-white p-6 rounded-xl border border-gray-100 space-y-4">
          <Block className="h-4 w-28" />
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Block className="h-3 w-full" />
              <Block className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  </div>
);
