import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { AdItem, AdPlacement, PlacementSetting } from '../../types/database';
import { adsService } from '../../lib/supabase';

interface AdSlotProps {
  placement?: AdPlacement;
  ad?: AdItem;
  ads?: AdItem[];
  className?: string;
  defaultAspectRatio?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({
  placement: propPlacement,
  ad: propSingleAd,
  ads: propAdsList,
  className = '',
  defaultAspectRatio
}) => {
  // Determina o espaço
  const placement: AdPlacement | undefined = 
    propPlacement || 
    propSingleAd?.placement || 
    (propAdsList && propAdsList.length > 0 ? propAdsList[0].placement : undefined);

  // Configuração do espaço (modo fixo vs carrossel)
  const [placementSettings, setPlacementSettings] = useState<PlacementSetting>(() => {
    if (placement) {
      return adsService.getPlacementSettings()[placement];
    }
    return { placement: 'header', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5 };
  });

  // Lista de anúncios locais carregados/sincronizados
  const [slotAds, setSlotAds] = useState<AdItem[]>(() => {
    if (propAdsList && propAdsList.length > 0) return propAdsList;
    if (propSingleAd) return [propSingleAd];
    return [];
  });

  // Índice do slide ativo
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [fadeState, setFadeState] = useState<'visible' | 'fading'>('visible');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza se os props mudarem
  useEffect(() => {
    if (propAdsList && propAdsList.length > 0) {
      setSlotAds(propAdsList);
    } else if (propSingleAd) {
      setSlotAds([propSingleAd]);
    }
  }, [propAdsList, propSingleAd]);

  // Listener para eventos de atualização de anúncios e espaços
  useEffect(() => {
    const handleAdsUpdated = async (e: Event) => {
      const customEvent = e as CustomEvent<{ placement?: AdPlacement }>;
      if (placement && (!customEvent.detail?.placement || customEvent.detail.placement === placement)) {
        const allSettings = adsService.getPlacementSettings();
        setPlacementSettings(allSettings[placement]);
        
        // Se não foi passado prop fixo, busca da fonte
        if (!propSingleAd && (!propAdsList || propAdsList.length === 0)) {
          const fetched = await adsService.getAdsByPlacement(placement);
          setSlotAds(fetched);
        }
      }
    };

    window.addEventListener('folha_ads_updated', handleAdsUpdated);
    return () => window.removeEventListener('folha_ads_updated', handleAdsUpdated);
  }, [placement, propSingleAd, propAdsList]);

  // Se nenhum anúncio foi passado por prop e temos um placement, busca inicialmente
  useEffect(() => {
    if (placement && !propSingleAd && (!propAdsList || propAdsList.length === 0)) {
      adsService.getAdsByPlacement(placement).then(fetched => {
        setSlotAds(fetched);
      });
    }
  }, [placement, propSingleAd, propAdsList]);

  // Filtra anúncios elegíveis (ativos, vigência de datas válida, limite de 3)
  const now = new Date();
  const eligibleAds = slotAds
    .filter(item => {
      // 1. Status ativo
      const isStatusActive = item.active && (item.status === 'active' || item.status === undefined);
      if (!isStatusActive) return false;

      // 2. Data de início
      if (item.startDate) {
        const start = new Date(item.startDate);
        if (start > now) return false;
      }

      // 3. Data de término
      if (item.endDate) {
        const end = new Date(item.endDate);
        // Ajusta para o final do dia
        end.setHours(23, 59, 59, 999);
        if (end < now) return false;
      }

      return true;
    })
    .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1))
    .slice(0, 3); // REGRA: Máximo de 3 anúncios por espaço

  const totalEligible = eligibleAds.length;

  // Ajusta o índice se a lista diminuir
  useEffect(() => {
    if (currentIndex >= totalEligible && totalEligible > 0) {
      setCurrentIndex(0);
    }
  }, [totalEligible, currentIndex]);

  const currentAd = eligibleAds[currentIndex] || eligibleAds[0];

  // Registra impressão quando o anúncio é exibido
  useEffect(() => {
    if (currentAd && currentAd.id) {
      adsService.recordImpression(currentAd.id);
    }
  }, [currentAd?.id]);

  // Função para avançar slide com transição suave
  const goToNextSlide = useCallback(() => {
    if (totalEligible <= 1) return;
    setFadeState('fading');
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % totalEligible);
      setFadeState('visible');
    }, 200);
  }, [totalEligible]);

  const goToPrevSlide = useCallback(() => {
    if (totalEligible <= 1) return;
    setFadeState('fading');
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + totalEligible) % totalEligible);
      setFadeState('visible');
    }, 200);
  }, [totalEligible]);

  const goToSlide = (idx: number) => {
    if (idx === currentIndex || idx < 0 || idx >= totalEligible) return;
    setFadeState('fading');
    setTimeout(() => {
      setCurrentIndex(idx);
      setFadeState('visible');
    }, 200);
  };

  // Temporizador de rotação automática
  useEffect(() => {
    // Se estiver no modo fixo, ou o carrossel estiver pausado no espaço, ou apenas 1 anúncio, ou interação do usuário
    const isCarouselMode = placementSettings.mode === 'carousel';
    const isPausedByAdmin = placementSettings.isPaused;
    const canRotate = isCarouselMode && !isPausedByAdmin && totalEligible > 1 && !isHovered && !isFocused;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!canRotate || !currentAd) return;

    // Duração individual configurada no anúncio (mínimo 2s, máximo 60s, padrão 5s)
    const durationSec = currentAd.durationSeconds || placementSettings.defaultDurationSeconds || 5;
    const durationMs = Math.max(2, Math.min(60, durationSec)) * 1000;

    timerRef.current = setTimeout(() => {
      goToNextSlide();
    }, durationMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    placementSettings.mode, 
    placementSettings.isPaused, 
    placementSettings.defaultDurationSeconds, 
    totalEligible, 
    currentIndex, 
    isHovered, 
    isFocused, 
    currentAd, 
    goToNextSlide
  ]);

  // Se não houver anúncio elegível ou o espaço estiver pausado sem anúncios
  if (!currentAd) {
    return null;
  }

  const isCarouselActive = placementSettings.mode === 'carousel' && totalEligible > 1;
  const aspectRatio = currentAd.aspectRatio 
    ? currentAd.aspectRatio.replace(/\s+/g, '') 
    : defaultAspectRatio || '16/9';

  return (
    <div
      role={isCarouselActive ? 'region' : undefined}
      aria-roledescription={isCarouselActive ? 'carousel' : undefined}
      aria-label={isCarouselActive ? `Carrossel de anúncios (${totalEligible} patrocinadores)` : `Publicidade ${currentAd.sponsorName}`}
      className={`group/ad relative w-full mx-auto select-none ${className}`}
      style={{ maxWidth: currentAd.maxWidth ? `${currentAd.maxWidth}px` : undefined }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={(e) => {
        if (!isCarouselActive) return;
        if (e.key === 'ArrowRight') goToNextSlide();
        if (e.key === 'ArrowLeft') goToPrevSlide();
      }}
      tabIndex={isCarouselActive ? 0 : undefined}
    >
      {/* Topo do anúncio: Identificação e Indicador discreto */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[7.5px] font-black uppercase tracking-[0.2em] text-gray-400">
          Publicidade • {currentAd.sponsorName}
        </span>

        {isCarouselActive && (
          <div className="flex items-center gap-1 text-[8px] text-gray-400 font-bold">
            {isHovered ? (
              <span className="text-[#0056a4] flex items-center gap-0.5 text-[7px] uppercase font-black tracking-wider">
                <Pause className="w-2.5 h-2.5 inline" /> Pausado
              </span>
            ) : (
              <span className="text-gray-400 tracking-wider">
                {currentIndex + 1}/{totalEligible}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Container do Slide com Transição Suave */}
      <div className="relative overflow-hidden rounded-lg bg-gray-100 border border-gray-200/60 transition-all hover:border-[#0056a4]/50 hover:shadow-md">
        <a
          href={currentAd.linkUrl}
          target={currentAd.openInNewTab ? '_blank' : undefined}
          rel="noopener noreferrer sponsored"
          onClick={() => {
            if (currentAd.id) {
              adsService.recordClick(currentAd.id);
            }
          }}
          className={`block w-full transition-opacity duration-300 ease-in-out ${
            fadeState === 'fading' ? 'opacity-30 scale-[0.995]' : 'opacity-100 scale-100'
          }`}
          title={`Publicidade: ${currentAd.title}`}
          aria-label={`${currentAd.sponsorName} - ${currentAd.title}`}
        >
          <div
            className="w-full relative flex items-center justify-center bg-gray-900/5"
            style={{
              aspectRatio: aspectRatio,
              display: 'block'
            }}
          >
            {currentAd.mediaType === 'video' ? (
              <video
                key={currentAd.id}
                src={currentAd.mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <img
                key={currentAd.id}
                src={currentAd.mediaUrl}
                alt={currentAd.altText || currentAd.title}
                loading="lazy"
                className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover/ad:scale-[1.01]"
              />
            )}
          </div>
        </a>

        {/* Controles de Navegação Anterior/Próximo (Aparecem no Hover do Carrossel) */}
        {isCarouselActive && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToPrevSlide();
              }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/ad:opacity-90 focus:opacity-100 transition-all cursor-pointer backdrop-blur-xs shadow-sm"
              aria-label="Anúncio anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToNextSlide();
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover/ad:opacity-90 focus:opacity-100 transition-all cursor-pointer backdrop-blur-xs shadow-sm"
              aria-label="Próximo anúncio"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicadores de Slide (Dots interativos discretos) */}
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-xs"
              role="tablist"
              aria-label="Navegação dos slides"
            >
              {eligibleAds.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={slide.id || idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Ir para anúncio ${idx + 1}: ${slide.sponsorName}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToSlide(idx);
                    }}
                    className={`transition-all rounded-full cursor-pointer ${
                      isActive 
                        ? 'w-4 h-1.5 bg-white shadow-xs' 
                        : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
