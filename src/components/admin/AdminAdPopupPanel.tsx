// Painel da janela de anúncio (pop-up): liga/desliga, frequência e quais anúncios participam.
// Por padrão todos os anúncios no ar participam; aqui o administrador tira os que não quer.
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Megaphone, Save } from 'lucide-react';
import { AdItem, AdPopupSettings } from '../../types/database';
import { adsService } from '../../lib/supabase';
import { AdPopupCard, anuncioNoAr } from '../news/AdPopup';

export const AdminAdPopupPanel: React.FC<{ ads: AdItem[] }> = ({ ads }) => {
  const [config, setConfig] = useState<AdPopupSettings>(() => adsService.getPopupSettings());
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [previa, setPrevia] = useState<AdItem | null>(null);

  useEffect(() => {
    const reler = () => setConfig(adsService.getPopupSettings());
    window.addEventListener('folha_ads_updated', reler);
    return () => window.removeEventListener('folha_ads_updated', reler);
  }, []);

  // um item por criativo (o mesmo anúncio pode estar em vários espaços)
  const noAr = useMemo(() => {
    const vistos = new Set<string>();
    return ads.filter(a => {
      if (!anuncioNoAr(a) || vistos.has(a.mediaUrl)) return false;
      vistos.add(a.mediaUrl);
      return true;
    });
  }, [ads]);
  const participando = noAr.filter(a => !config.excludedIds.includes(a.id)).length;

  const salvar = async (update: Partial<AdPopupSettings>) => {
    const novo = { ...config, ...update };
    setConfig(novo);
    setSalvando(true);
    setAviso(null);
    try {
      await adsService.savePopupSettings(novo);
      setAviso({ ok: true, texto: 'Janela de anúncio atualizada no portal.' });
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível salvar.' });
    } finally {
      setSalvando(false);
    }
  };

  const alternar = (id: string) => {
    const fora = config.excludedIds.includes(id);
    salvar({ excludedIds: fora ? config.excludedIds.filter(x => x !== id) : [...config.excludedIds, id] });
  };

  const numero = (campo: 'initialDelaySeconds' | 'intervalMinutes' | 'maxPerVisit', min: number, max: number) => (
    <input
      type="number"
      min={min}
      max={max}
      value={config[campo]}
      onChange={e => setConfig({ ...config, [campo]: Math.min(max, Math.max(min, Number(e.target.value) || min)) })}
      className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:border-marca focus:outline-none"
    />
  );

  return (
    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-5" aria-labelledby="janela-anuncio">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-blue-50 text-marca flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5" /></span>
          <div>
            <h3 id="janela-anuncio" className="font-black text-base text-gray-900 uppercase tracking-tight">Janela de anúncio (pop-up)</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
              Os anúncios no ar saltam na tela de tempos em tempos, um de cada vez, com botão de fechar e de abrir o anunciante. Nunca aparece no painel, enquanto o leitor digita ou com outra janela aberta.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => salvar({ enabled: !config.enabled })}
          disabled={salvando}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition ${config.enabled ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          <span className={`relative h-5 w-9 rounded-full ${config.enabled ? 'bg-white/30' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${config.enabled ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
          {config.enabled ? 'Ligada' : 'Desligada'}
        </button>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${config.enabled ? '' : 'opacity-50'}`}>
        <label className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
          <span className="block text-[11px] font-black uppercase tracking-wider text-gray-600">Primeira janela após</span>
          <span className="flex items-center gap-2">{numero('initialDelaySeconds', 5, 600)}<span className="text-xs text-gray-500">segundos no portal</span></span>
        </label>
        <label className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
          <span className="block text-[11px] font-black uppercase tracking-wider text-gray-600">Intervalo entre janelas</span>
          <span className="flex items-center gap-2">{numero('intervalMinutes', 1, 120)}<span className="text-xs text-gray-500">minutos</span></span>
        </label>
        <label className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
          <span className="block text-[11px] font-black uppercase tracking-wider text-gray-600">Máximo por visita</span>
          <span className="flex items-center gap-2">{numero('maxPerVisit', 1, 20)}<span className="text-xs text-gray-500">janelas</span></span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => salvar({})}
          disabled={salvando}
          className="px-5 py-2.5 bg-marca hover:bg-marca-escuro text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {salvando ? 'Salvando…' : 'Salvar frequência'}
        </button>
        {aviso && (
          <span className={`text-xs font-bold flex items-center gap-1.5 ${aviso.ok ? 'text-emerald-700' : 'text-red-700'}`} role="status">
            {aviso.ok && <CheckCircle2 className="w-4 h-4" />} {aviso.texto}
          </span>
        )}
      </div>

      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-gray-600 mb-2">
          Anúncios na janela · {participando} de {noAr.length} no ar
        </p>
        {noAr.length === 0 ? (
          <p className="text-xs text-gray-500 p-4 rounded-xl bg-gray-50">Nenhum anúncio no ar no momento. Assim que um anúncio for publicado, ele entra na janela automaticamente.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {noAr.map(ad => {
              const dentro = !config.excludedIds.includes(ad.id);
              return (
                <li key={ad.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${dentro ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white'}`}>
                  <span className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {ad.mediaType === 'video' ? (
                      <video src={`${ad.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <img src={ad.mediaUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-gray-900 truncate">{ad.title}</span>
                    <span className="block text-[11px] text-gray-500 truncate">{ad.sponsorName}</span>
                  </span>
                  <button type="button" onClick={() => setPrevia(ad)} className="p-2 rounded-lg text-gray-500 hover:text-marca hover:bg-white cursor-pointer" aria-label={`Ver como fica a janela de ${ad.title}`} title="Ver prévia">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dentro}
                    aria-label={`${ad.title} na janela de anúncio`}
                    onClick={() => alternar(ad.id)}
                    disabled={salvando}
                    className={`relative h-6 w-11 rounded-full shrink-0 cursor-pointer transition ${dentro ? 'bg-emerald-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${dentro ? 'left-6' : 'left-1'}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {previa && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPrevia(null)} role="dialog" aria-modal="true" aria-label="Prévia da janela de anúncio">
          <AdPopupCard ad={previa} onClose={() => setPrevia(null)} />
        </div>
      )}
    </section>
  );
};
