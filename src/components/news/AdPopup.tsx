// Janela de anúncio: salta na tela de tempos em tempos, revezando os anúncios publicados,
// com botão para fechar e botão para abrir o anunciante. Frequência, espera inicial,
// limite por visita e quais anúncios participam ficam no painel (Publicidade → Janela de anúncio).
// Nunca abre com outra janela aberta, enquanto a pessoa digita ou com o portal em segundo plano.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { AdItem, AdPopupSettings } from '../../types/database';
import { adsService } from '../../lib/supabase';

const QTD_KEY = 'folha_popup_anuncio_qtd';
const VEZ_KEY = 'folha_popup_anuncio_vez';

const lerNumero = (store: Storage, key: string) => {
  try {
    return Number(store.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
};
const gravarNumero = (store: Storage, key: string, v: number) => {
  try {
    store.setItem(key, String(v));
  } catch {
    /* navegador sem armazenamento */
  }
};
const digitando = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** Anúncio no ar agora: ativo, dentro do período e com imagem ou vídeo. */
export function anuncioNoAr(ad: AdItem, agora = new Date()): boolean {
  if (!ad.active || (ad.status !== undefined && ad.status !== 'active')) return false;
  if (!ad.mediaUrl) return false;
  if (ad.startDate && new Date(ad.startDate) > agora) return false;
  if (ad.endDate) {
    const fim = new Date(ad.endDate);
    fim.setHours(23, 59, 59, 999);
    if (fim < agora) return false;
  }
  return true;
}

/** Anúncios que participam da janela (sem repetir o mesmo anúncio usado em vários espaços). */
export function anunciosDaJanela(ads: AdItem[], config: AdPopupSettings): AdItem[] {
  const vistos = new Set<string>();
  return ads
    .filter(a => anuncioNoAr(a) && !config.excludedIds.includes(a.id))
    .filter(a => {
      const chave = a.mediaUrl;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
}

export const AdPopupCard: React.FC<{ ad: AdItem; onClose: () => void; onClickAd?: () => void }> = ({ ad, onClose, onClickAd }) => {
  const fecharRef = useRef<HTMLButtonElement>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    fecharRef.current?.focus();
  }, []);
  const largo = ad.adFormat === '728x90' || ad.adFormat === '970x90' || /^(728|970) ?\/ ?90$/.test(ad.aspectRatio ?? '');
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-300" onClick={e => e.stopPropagation()}>
      <button
        ref={fecharRef}
        type="button"
        onClick={onClose}
        aria-label="Fechar anúncio"
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/65 hover:bg-black text-white flex items-center justify-center border border-white/30 cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/65 text-[10px] font-black uppercase tracking-wider text-white">Publicidade</span>

      <a
        href={ad.linkUrl || undefined}
        target={ad.openInNewTab === false ? undefined : '_blank'}
        rel="noopener noreferrer sponsored"
        onClick={() => {
          adsService.recordClick(ad.id);
          onClickAd?.();
        }}
        className={`block bg-gray-900 ${largo ? 'pt-14 pb-4 px-3' : ''}`}
        aria-label={`Abrir anúncio: ${ad.sponsorName} - ${ad.title}`}
      >
        {falhou ? (
          <div className="aspect-square flex items-center justify-center p-8 text-center bg-gradient-to-br from-slate-900 to-marca text-white">
            <span className="font-black text-xl leading-snug">{ad.title}</span>
          </div>
        ) : ad.mediaType === 'video' ? (
          <video src={ad.mediaUrl} autoPlay loop muted playsInline onError={() => setFalhou(true)} className="w-full max-h-[60vh] object-contain bg-black" />
        ) : (
          <img
            src={ad.mediaUrl}
            alt={ad.altText || ad.title}
            referrerPolicy="no-referrer"
            onError={() => setFalhou(true)}
            className={`w-full object-contain ${largo ? 'rounded-lg' : 'max-h-[60vh]'}`}
          />
        )}
      </a>

      <div className="p-5 space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{ad.sponsorName}</p>
          <h2 className="text-lg font-black text-gray-900 leading-snug">{ad.title}</h2>
        </div>
        {ad.linkUrl && (
          <a
            href={ad.linkUrl}
            target={ad.openInNewTab === false ? undefined : '_blank'}
            rel="noopener noreferrer sponsored"
            onClick={() => {
              adsService.recordClick(ad.id);
              onClickAd?.();
            }}
            className="w-full py-3 rounded-2xl bg-marca hover:bg-marca-escuro text-white text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            Saiba mais <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <button type="button" onClick={onClose} className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 cursor-pointer transition-colors">
          Fechar
        </button>
      </div>
    </div>
  );
};

export const AdPopup: React.FC<{ ads: AdItem[]; disabled?: boolean }> = ({ ads, disabled }) => {
  const [config, setConfig] = useState<AdPopupSettings>(() => adsService.getPopupSettings());
  const [atual, setAtual] = useState<AdItem | null>(null);
  const inicio = useRef(Date.now());
  const ultimaFechada = useRef(0);
  const aberto = useRef(false);

  // o painel salva ou o banco carrega: relê a configuração
  useEffect(() => {
    const reler = () => setConfig(adsService.getPopupSettings());
    window.addEventListener('folha_ads_updated', reler);
    return () => window.removeEventListener('folha_ads_updated', reler);
  }, []);

  const elegiveis = useMemo(() => anunciosDaJanela(ads, config), [ads, config]);

  useEffect(() => {
    if (!config.enabled || disabled || elegiveis.length === 0) return;
    const relogio = window.setInterval(() => {
      if (aberto.current) return;
      if (lerNumero(sessionStorage, QTD_KEY) >= config.maxPerVisit) return;
      const agora = Date.now();
      if (agora - inicio.current < config.initialDelaySeconds * 1000) return;
      if (ultimaFechada.current && agora - ultimaFechada.current < config.intervalMinutes * 60_000) return;
      if (document.visibilityState !== 'visible' || digitando() || document.querySelector('[aria-modal="true"]')) return;
      // revezamento: cada janela mostra o próximo anúncio da lista (continua na próxima visita)
      const vez = lerNumero(localStorage, VEZ_KEY);
      const ad = elegiveis[vez % elegiveis.length];
      gravarNumero(localStorage, VEZ_KEY, vez + 1);
      gravarNumero(sessionStorage, QTD_KEY, lerNumero(sessionStorage, QTD_KEY) + 1);
      aberto.current = true;
      adsService.recordImpression(ad.id);
      setAtual(ad);
    }, 3000);
    return () => window.clearInterval(relogio);
  }, [config, disabled, elegiveis]);

  const fechar = () => {
    aberto.current = false;
    ultimaFechada.current = Date.now();
    setAtual(null);
  };

  useEffect(() => {
    if (!atual) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [atual]);

  if (!atual || disabled) return null;
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={fechar}
      role="dialog"
      aria-modal="true"
      aria-label={`Publicidade: ${atual.title}`}
    >
      <AdPopupCard ad={atual} onClose={fechar} onClickAd={fechar} />
    </div>
  );
};
