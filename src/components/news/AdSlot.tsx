import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, ExternalLink } from 'lucide-react';
import { AdItem, AdPlacement, AdFormat, PlacementSetting, FormatCarouselSetting, isExtraSidebarSquare } from '../../types/database';
import { adsService } from '../../lib/supabase';

interface AdSlotProps {
  placement?: AdPlacement;
  format?: AdFormat;
  ad?: AdItem;
  ads?: AdItem[];
  className?: string;
  defaultAspectRatio?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({
  placement: propPlacement,
  format: propFormat,
  ad: propSingleAd,
  ads: propAdsList,
  className = '',
  defaultAspectRatio
}) => {
  const placement: AdPlacement | undefined = 
    propPlacement || 
    propSingleAd?.placement || 
    (propAdsList && propAdsList.length > 0 ? propAdsList[0].placement : undefined);

  // Configuração por espaço (header, feed, footer, sidebar, sidebar_300x900, article)
  const [placementSettings, setPlacementSettings] = useState<PlacementSetting>(() => {
    if (placement) {
      return adsService.getPlacementSettings()[placement];
    }
    return { placement: 'header', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '728x90' };
  });

  const preferredFormatForPlacement = placement ? placementSettings?.preferredFormat : undefined;

  // Determina o formato efetivo com suporte a 728x90, 970x90, 300x300, 300x900
  const determinedFormat: AdFormat = 
    propFormat || 
    preferredFormatForPlacement ||
    propSingleAd?.adFormat ||
    (propAdsList && propAdsList.length > 0 ? propAdsList[0].adFormat : undefined) ||
    (placement === 'sidebar_300x900' ? '300x900' :
     placement === 'sidebar_300x600' ? '300x900' :
     placement === 'sidebar' ? '300x300' :
     placement === 'article' ? '300x300' :
     placement === 'header' ? '728x90' :
     placement === 'feed' ? '728x90' :
     placement === 'footer' ? '728x90' : '300x300');

  // Configuração independente de temporizador e modo (por formato se 300x300/300x900, ou por placement)
  const [formatSettings, setFormatSettings] = useState<FormatCarouselSetting>(() => {
    const fKey = (determinedFormat === '300x900' || determinedFormat === '300x600') ? '300x900' : '300x300';
    return adsService.getFormatSettings()[fKey] || { format: '300x300', durationSeconds: 5, isPaused: false, mode: 'carousel' };
  });

  // Os formatos laterais seguem o temporizador do formato, exceto os painéis 300x300 extras,
  // que têm temporizador e pausa próprios no espaço
  const isFormatBased = (determinedFormat === '300x300' || determinedFormat === '300x900' || determinedFormat === '300x600') && !isExtraSidebarSquare(placement);

  // Lista de anúncios
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
  const [mediaError, setMediaError] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza se os props mudarem
  useEffect(() => {
    if (propAdsList && propAdsList.length > 0) {
      setSlotAds(propAdsList);
    } else if (propSingleAd) {
      setSlotAds([propSingleAd]);
    }
  }, [propAdsList, propSingleAd]);

  // Listener para eventos de atualização de anúncios e formatos
  useEffect(() => {
    const handleAdsUpdated = async (e: Event) => {
      const customEvent = e as CustomEvent<{ placement?: AdPlacement; format?: AdFormat }>;
      const eventDetail = customEvent.detail;

      const fKey = (determinedFormat === '300x900' || determinedFormat === '300x600') ? '300x900' : '300x300';
      if (!eventDetail?.format || eventDetail.format === determinedFormat || eventDetail.format === fKey) {
        const allFormatSettings = adsService.getFormatSettings();
        setFormatSettings(allFormatSettings[fKey]);
      }

      if (placement && (!eventDetail?.placement || eventDetail.placement === placement)) {
        const allPlacementSettings = adsService.getPlacementSettings();
        setPlacementSettings(allPlacementSettings[placement]);
      }

      // Se não recebeu lista fixa por prop, recarrega
      if (!propSingleAd && (!propAdsList || propAdsList.length === 0)) {
        if (placement) {
          const fetched = await adsService.getAdsByPlacement(placement);
          setSlotAds(fetched);
        } else if (determinedFormat) {
          const fetched = await adsService.getAdsByFormat(determinedFormat);
          setSlotAds(fetched);
        }
      }
    };

    window.addEventListener('folha_ads_updated', handleAdsUpdated);
    return () => window.removeEventListener('folha_ads_updated', handleAdsUpdated);
  }, [placement, determinedFormat, propSingleAd, propAdsList]);

  // Se nenhum anúncio foi passado por prop, busca inicialmente
  useEffect(() => {
    if (!propSingleAd && (!propAdsList || propAdsList.length === 0)) {
      if (placement) {
        adsService.getAdsByPlacement(placement).then(fetched => {
          setSlotAds(fetched);
        });
      } else if (determinedFormat) {
        adsService.getAdsByFormat(determinedFormat).then(fetched => {
          setSlotAds(fetched);
        });
      }
    }
  }, [placement, determinedFormat, propSingleAd, propAdsList]);

  // Filtra anúncios elegíveis (ativos e período de vigência válido)
  const now = new Date();
  const activeAds = slotAds.filter(item => {
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
      end.setHours(23, 59, 59, 999);
      if (end < now) return false;
    }

    return true;
  });

  // Se houver anúncios específicos do formato preferido no espaço (ex: 970x90 ou 728x90), prioriza-os
  const formatSpecificAds = (preferredFormatForPlacement && (placement === 'header' || placement === 'feed' || placement === 'footer'))
    ? activeAds.filter(a => a.adFormat === preferredFormatForPlacement || (preferredFormatForPlacement === '970x90' ? a.aspectRatio === '970 / 90' : a.aspectRatio === '728 / 90'))
    : [];

  const eligibleAds = (formatSpecificAds.length > 0 ? formatSpecificAds : activeAds)
    .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));

  const totalEligible = eligibleAds.length;

  // Ajusta o índice se a lista diminuir
  useEffect(() => {
    if (currentIndex >= totalEligible && totalEligible > 0) {
      setCurrentIndex(0);
    }
  }, [totalEligible, currentIndex]);

  const currentAd = eligibleAds[currentIndex] || eligibleAds[0];

  // Reseta estado de erro ao trocar de slide
  useEffect(() => {
    setMediaError(false);
  }, [currentAd?.id]);

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

  // Temporizador de rotação automática independente
  useEffect(() => {
    // Determina modo e pausa baseado no formato ou placement
    const isCarouselMode = isFormatBased
      ? formatSettings.mode === 'carousel'
      : placementSettings.mode === 'carousel';

    const isPausedByAdmin = isFormatBased
      ? formatSettings.isPaused 
      : placementSettings.isPaused;

    const canRotate = isCarouselMode && !isPausedByAdmin && totalEligible > 1 && !isHovered && !isFocused;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!canRotate || !currentAd) return;

    // Intervalo independente: lê o temporizador configurado no formato ou no espaço pelo admin
    const defaultSec = (determinedFormat === '300x900' || determinedFormat === '300x600') ? 8 : 5;
    const formatDurationSec = isFormatBased
      ? (formatSettings.durationSeconds || defaultSec)
      : (placementSettings.defaultDurationSeconds || 5);

    // Duração final (respeita configuração individual do anúncio se explicitamente configurada, ou o tempo do formato/espaço)
    const durationSec = currentAd.durationSeconds || formatDurationSec;
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
    determinedFormat,
    isFormatBased,
    formatSettings.mode,
    formatSettings.isPaused,
    formatSettings.durationSeconds,
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

  if (!currentAd) {
    return null;
  }

  const isCarouselActive = (
    isFormatBased
      ? formatSettings.mode === 'carousel'
      : placementSettings.mode === 'carousel'
  ) && totalEligible > 1;

  // Dimensões estritas e aspect-ratio adaptativo e responsivo
  let containerDimensionsStyle: React.CSSProperties = {};
  let aspectRatioClass = 'aspect-[16/9]';
  let slotMaxWidth = '100%';

  if (determinedFormat === '970x90') {
    slotMaxWidth = '970px';
    containerDimensionsStyle = { width: '100%', maxWidth: '970px', aspectRatio: '970 / 90' };
    aspectRatioClass = 'aspect-[970/90]';
  } else if (determinedFormat === '728x90') {
    slotMaxWidth = '728px';
    containerDimensionsStyle = { width: '100%', maxWidth: '728px', aspectRatio: '728 / 90' };
    aspectRatioClass = 'aspect-[728/90]';
  } else if (determinedFormat === '300x900') {
    slotMaxWidth = '300px';
    containerDimensionsStyle = { width: '100%', maxWidth: '300px', height: '900px', aspectRatio: '1 / 3' };
    aspectRatioClass = 'aspect-[1/3]';
  } else if (determinedFormat === '300x600') {
    slotMaxWidth = '300px';
    containerDimensionsStyle = { width: '100%', maxWidth: '300px', height: '600px', aspectRatio: '1 / 2' };
    aspectRatioClass = 'aspect-[1/2]';
  } else if (determinedFormat === '300x300') {
    slotMaxWidth = '300px';
    containerDimensionsStyle = { width: '100%', maxWidth: '300px', height: '300px', aspectRatio: '1 / 1' };
    aspectRatioClass = 'aspect-square';
  } else if (currentAd.aspectRatio) {
    const cleanRatio = currentAd.aspectRatio.replace(/\s+/g, '');
    if (cleanRatio === '970/90') {
      slotMaxWidth = '970px';
      containerDimensionsStyle = { width: '100%', maxWidth: '970px', aspectRatio: '970 / 90' };
      aspectRatioClass = 'aspect-[970/90]';
    } else if (cleanRatio === '728/90') {
      slotMaxWidth = '728px';
      containerDimensionsStyle = { width: '100%', maxWidth: '728px', aspectRatio: '728 / 90' };
      aspectRatioClass = 'aspect-[728/90]';
    } else if (cleanRatio === '1/3') {
      slotMaxWidth = '300px';
      containerDimensionsStyle = { width: '100%', maxWidth: '300px', height: '900px', aspectRatio: '1 / 3' };
      aspectRatioClass = 'aspect-[1/3]';
    } else if (cleanRatio === '1/2') {
      slotMaxWidth = '300px';
      containerDimensionsStyle = { width: '100%', maxWidth: '300px', height: '600px', aspectRatio: '1 / 2' };
      aspectRatioClass = 'aspect-[1/2]';
    } else if (cleanRatio === '1/1') {
      slotMaxWidth = '300px';
      containerDimensionsStyle = { width: '100%', maxWidth: '300px', height: '300px', aspectRatio: '1 / 1' };
      aspectRatioClass = 'aspect-square';
    }
  }

  const formatLabel = 
    determinedFormat === '970x90' ? 'Publicidade 970×90' :
    determinedFormat === '728x90' ? 'Publicidade 728×90' :
    determinedFormat === '300x900' ? 'Publicidade 300×900' :
    determinedFormat === '300x600' ? 'Publicidade 300×600' :
    determinedFormat === '300x300' ? 'Publicidade 300×300' : 'Publicidade';

  return (
    <div
      role={isCarouselActive ? 'region' : undefined}
      aria-roledescription={isCarouselActive ? 'carousel' : undefined}
      aria-label={isCarouselActive ? `Carrossel ${formatLabel} (${totalEligible} patrocinadores)` : `Publicidade ${currentAd.sponsorName}`}
      className={`group/ad relative select-none mx-auto w-full ${className}`}
      style={{ maxWidth: slotMaxWidth }}
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
      <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-400 truncate max-w-[200px]">
          Publicidade • {currentAd.sponsorName}
        </span>

        {isCarouselActive && (
          <div className="flex items-center gap-1.5 text-[8px] text-gray-400 font-bold shrink-0">
            {isHovered ? (
              <span className="text-[#0056a4] flex items-center gap-0.5 text-[7.5px] uppercase font-black tracking-wider">
                <Pause className="w-2.5 h-2.5 inline" /> Pausado
              </span>
            ) : (
              <span className="text-gray-400 tracking-wider font-mono">
                {currentIndex + 1}/{totalEligible}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Container do Slide com Dimensões Exatas e Transição Suave */}
      <div 
        className="relative overflow-hidden rounded-xl bg-gray-100 border border-gray-200/80 shadow-xs transition-all hover:border-[#0056a4]/40 hover:shadow-md"
        style={determinedFormat ? containerDimensionsStyle : undefined}
      >
        <a
          href={currentAd.linkUrl}
          target={currentAd.openInNewTab ? '_blank' : undefined}
          rel="noopener noreferrer sponsored"
          onClick={() => {
            if (currentAd.id) {
              adsService.recordClick(currentAd.id);
            }
          }}
          className={`block w-full h-full transition-opacity duration-300 ease-in-out ${
            fadeState === 'fading' ? 'opacity-30 scale-[0.995]' : 'opacity-100 scale-100'
          }`}
          title={`Publicidade: ${currentAd.title} - ${currentAd.sponsorName}`}
          aria-label={`${currentAd.sponsorName} - ${currentAd.title}`}
        >
          <div
            className={`w-full h-full relative flex items-center justify-center bg-gray-900/5 overflow-hidden ${
              !determinedFormat ? aspectRatioClass : ''
            }`}
          >
            {mediaError ? (
              /* Fallback resiliente caso a mídia falhe */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-[#0056a4] text-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">
                  {formatLabel}
                </span>
                <h4 className="font-bold text-sm leading-snug mb-3 line-clamp-3">
                  {currentAd.title}
                </h4>
                <span className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                  Saiba mais <ExternalLink className="w-3 h-3" />
                </span>
                <span className="text-[9px] text-gray-300 mt-4 opacity-75">
                  {currentAd.sponsorName}
                </span>
              </div>
            ) : currentAd.mediaType === 'video' ? (
              <video
                key={currentAd.id}
                src={currentAd.mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setMediaError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                key={currentAd.id}
                src={currentAd.mediaUrl}
                alt={currentAd.altText || currentAd.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setMediaError(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/ad:scale-[1.01]"
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
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/ad:opacity-100 focus:opacity-100 transition-all cursor-pointer backdrop-blur-xs shadow-md z-10"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/ad:opacity-100 focus:opacity-100 transition-all cursor-pointer backdrop-blur-xs shadow-md z-10"
              aria-label="Próximo anúncio"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicadores de Slide (Dots interativos discretos) */}
            <div 
              className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs shadow-sm z-10"
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
