import React from 'react';

export const TopBar: React.FC = () => {
  return (
    <div className="w-full bg-gray-900 text-white py-1 md:py-1.5 overflow-hidden">
      <div className="relative w-full overflow-hidden">
        <div className="animate-marquee items-center gap-4 md:gap-8 text-[9px] md:text-xs font-bold tracking-widest uppercase py-0.5">
          {/* Bloco 1 */}
          <div className="flex items-center gap-4 md:gap-8 shrink-0">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-emerald-400">💵</span>
                <span>Dólar:</span>
                <span className="text-emerald-400">R$ 5,48</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span>💶</span>
                <span>Euro:</span>
                <span className="text-emerald-400">R$ 6,02</span>
              </div>
            </div>
            <div className="hidden md:flex w-px h-3 bg-gray-700 mx-2 shrink-0"></div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-yellow-400 text-base">🌤️</span>
              <span>Estância:</span>
              <span className="text-yellow-400">28°C (Ensolarado)</span>
            </div>
            <span className="text-gray-600 px-2">•</span>
          </div>

          {/* Bloco 2 (duplicado para efeito contínuo de marquee infinito) */}
          <div className="flex items-center gap-4 md:gap-8 shrink-0" aria-hidden="true">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-emerald-400">💵</span>
                <span>Dólar:</span>
                <span className="text-emerald-400">R$ 5,48</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span>💶</span>
                <span>Euro:</span>
                <span className="text-emerald-400">R$ 6,02</span>
              </div>
            </div>
            <div className="hidden md:flex w-px h-3 bg-gray-700 mx-2 shrink-0"></div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-yellow-400 text-base">🌤️</span>
              <span>Estância:</span>
              <span className="text-yellow-400">28°C (Ensolarado)</span>
            </div>
            <span className="text-gray-600 px-2">•</span>
          </div>

          {/* Bloco 3 */}
          <div className="flex items-center gap-4 md:gap-8 shrink-0" aria-hidden="true">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-emerald-400">💵</span>
                <span>Dólar:</span>
                <span className="text-emerald-400">R$ 5,48</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span>💶</span>
                <span>Euro:</span>
                <span className="text-emerald-400">R$ 6,02</span>
              </div>
            </div>
            <div className="hidden md:flex w-px h-3 bg-gray-700 mx-2 shrink-0"></div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-yellow-400 text-base">🌤️</span>
              <span>Estância:</span>
              <span className="text-yellow-400">28°C (Ensolarado)</span>
            </div>
            <span className="text-gray-600 px-2">•</span>
          </div>
        </div>
      </div>
    </div>
  );
};
