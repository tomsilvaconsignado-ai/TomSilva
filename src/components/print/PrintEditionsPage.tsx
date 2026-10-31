import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Newspaper, Eye, Download, Lock, Loader2, AlertCircle, UserPlus, LogIn, CalendarDays } from 'lucide-react';
import { PrintEdition, UserProfile } from '../../types/database';
import { printEditionsService, formatPrintEditionLabel, formatFileSize, MONTH_NAMES, toRoman } from '../../lib/supabase';

// O leitor de PDF (pdf.js) só é baixado quando alguém abre uma edição
const PrintEditionViewer = React.lazy(() => import('./PrintEditionViewer'));

interface PrintEditionsPageProps {
  currentUser: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

type PendingAction = { edition: PrintEdition; action: 'view' | 'download' };

// Baixa pelo link temporário com nome de arquivo legível (o Storage responde como anexo)
const triggerDownload = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export const PrintEditionsPage: React.FC<PrintEditionsPageProps> = ({ currentUser, onOpenAuth }) => {
  const [editions, setEditions] = useState<PrintEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | 'todos'>('todos');
  const [viewing, setViewing] = useState<PrintEdition | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    printEditionsService.getEditions()
      .then(list => { if (active) { setEditions(list.filter(e => e.published)); setLoadError(null); } })
      .catch((err: any) => { if (active) setLoadError(err?.message || 'Não foi possível carregar as edições.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleDownload = async (edition: PrintEdition) => {
    setActionError(null);
    setDownloadingId(edition.id);
    try {
      triggerDownload(await printEditionsService.getEditionUrl(edition, true));
    } catch (err: any) {
      setActionError(err?.message || 'Não foi possível baixar a edição.');
    } finally {
      setDownloadingId(null);
    }
  };

  const runAction = (edition: PrintEdition, action: 'view' | 'download') => {
    if (!currentUser) {
      setPending({ edition, action });
      onOpenAuth('login');
      return;
    }
    if (action === 'view') {
      setActionError(null);
      setViewing(edition);
    } else {
      handleDownload(edition);
    }
  };

  // Depois do login, continua o que o leitor tinha pedido
  useEffect(() => {
    if (currentUser && pending) {
      const { edition, action } = pending;
      setPending(null);
      runAction(edition, action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const years = useMemo(
    () => Array.from(new Set(editions.map(e => e.editionYear))).sort((a, b) => b - a),
    [editions]
  );
  const filtered = yearFilter === 'todos' ? editions : editions.filter(e => e.editionYear === yearFilter);
  const [latest, ...previous] = filtered;

  const renderActions = (edition: PrintEdition, large = false) => {
    const locked = !currentUser;
    const isDownloading = downloadingId === edition.id;
    const size = large ? 'px-5 py-3 text-xs' : 'px-3 py-2 text-[11px]';
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => runAction(edition, 'view')}
          className={`${size} bg-[#0056a4] hover:bg-[#004482] text-white rounded-xl font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs`}
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          Visualizar
        </button>
        <button
          onClick={() => runAction(edition, 'download')}
          disabled={isDownloading}
          className={`${size} bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-900 border border-gray-300 rounded-xl font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors`}
        >
          {isDownloading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : locked ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          Baixar PDF
          {edition.fileSize ? <span className="font-bold text-gray-500 normal-case tracking-normal">({formatFileSize(edition.fileSize)})</span> : null}
        </button>
      </div>
    );
  };

  // Cartão no estilo de primeira página de jornal
  const renderFrontPage = (edition: PrintEdition, large = false) => (
    <div className={`bg-[#fbfaf6] border border-gray-300 rounded-sm shadow-sm ${large ? 'p-5 sm:p-8' : 'p-4'} font-serif`}>
      <div className="border-b-4 border-double border-gray-900 pb-2 text-center">
        <p className={`${large ? 'text-3xl sm:text-5xl' : 'text-xl'} font-black tracking-tight text-gray-900 leading-none`}>
          Folha da Região
        </p>
      </div>
      <div className="flex justify-between gap-2 border-b border-gray-900 py-1 font-sans text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-700">
        <span>Ano {toRoman(edition.volumeYear)}</span>
        <span>Nº {edition.editionNumber}</span>
        <span>{MONTH_NAMES[edition.editionMonth - 1]} de {edition.editionYear}</span>
      </div>
      <h3 className={`${large ? 'text-2xl sm:text-4xl mt-5' : 'text-base mt-3 line-clamp-3'} font-black text-gray-900 leading-tight`}>
        {edition.headline}
      </h3>
      {large && (
        <div className="mt-5 grid grid-cols-3 gap-3" aria-hidden="true">
          {[0, 1, 2].map(col => (
            <div key={col} className="space-y-1.5">
              {[0, 1, 2, 3, 4].map(line => (
                <div key={line} className={`h-1.5 rounded bg-gray-300/70 ${line === 4 ? 'w-2/3' : 'w-full'}`} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Cabeçalho da seção */}
      <div className="mb-6 pb-4 border-b border-gray-200 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-sm">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Mídia Impressa</h1>
            <p className="text-xs text-gray-500">
              A edição mensal da Folha da Região em PDF: visualize aqui no portal ou baixe no seu aparelho.
            </p>
          </div>
        </div>

        {years.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {(['todos', ...years] as (number | 'todos')[]).map(y => (
              <button
                key={y}
                onClick={() => setYearFilter(y)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${
                  yearFilter === y ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {y === 'todos' ? 'Todas' : <><CalendarDays className="w-3.5 h-3.5" />{y}</>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aviso de área exclusiva para visitantes */}
      {!currentUser && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-gray-900">Área exclusiva para leitores cadastrados</p>
              <p className="text-xs text-gray-600">
                O cadastro no portal é gratuito. Entre na sua conta para visualizar e baixar as edições impressas.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> Entrar
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Cadastre-se
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {actionError}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
          <div className="lg:col-span-7 h-80 bg-gray-200 rounded-2xl" />
          <div className="lg:col-span-5 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-800">{loadError}</p>
        </div>
      ) : !latest ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-black text-gray-900 uppercase tracking-wider">Nenhuma edição disponível ainda</p>
          <p className="text-xs text-gray-500 mt-1">A próxima edição impressa da Folha da Região chega em breve.</p>
        </div>
      ) : (
        <>
          {/* Edição mais recente em destaque */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-10">
            <div className="lg:col-span-7">{renderFrontPage(latest, true)}</div>
            <div className="lg:col-span-5 space-y-4">
              <span className="inline-block px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest">
                {yearFilter === 'todos' ? 'Edição mais recente' : `Edição mais recente de ${yearFilter}`}
              </span>
              <p className="text-xs font-black uppercase tracking-widest text-red-700">{formatPrintEditionLabel(latest)}</p>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Manchete principal</p>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{latest.headline}</h2>
              </div>
              {renderActions(latest, true)}
            </div>
          </section>

          {/* Edições anteriores */}
          {previous.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Edições anteriores
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {previous.map(edition => (
                  <article key={edition.id} className="bg-white border border-gray-200 rounded-2xl p-3 space-y-3 shadow-xs">
                    {renderFrontPage(edition)}
                    {renderActions(edition)}
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {viewing && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[120] bg-gray-900/95 flex items-center justify-center text-white">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          }
        >
          <PrintEditionViewer
            edition={viewing}
            onClose={() => setViewing(null)}
            onDownload={handleDownload}
            downloading={downloadingId === viewing.id}
          />
        </Suspense>
      )}
    </div>
  );
};
