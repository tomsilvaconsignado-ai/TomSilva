import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, Loader2, AlertCircle, ExternalLink, Newspaper } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
// Build "legacy": inclui os polyfills para celulares e navegadores mais antigos
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { PrintEdition } from '../../types/database';
import { printEditionsService, formatPrintEditionLabel } from '../../lib/supabase';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3];
// iOS recusa canvas acima de ~16 milhões de pixels
const MAX_CANVAS_PIXELS = 14_000_000;

interface PdfPageProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  defaultRatio: number;
}

// Cada página só é desenhada quando está perto da tela e é apagada quando se afasta,
// para que edições com muitas páginas não esgotem a memória do celular
const PdfPage: React.FC<PdfPageProps> = ({ doc, pageNumber, width, defaultRatio }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(pageNumber <= 2);
  const [ratio, setRatio] = useState(defaultRatio);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: '1200px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!near) {
      canvas.width = 0;
      canvas.height = 0;
      setRendered(false);
      return;
    }

    let task: RenderTask | null = null;
    let cancelled = false;
    doc.getPage(pageNumber).then(page => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const pageRatio = base.height / base.width;
      setRatio(pageRatio);

      const cssHeight = width * pageRatio;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width * cssHeight * dpr * dpr > MAX_CANVAS_PIXELS) {
        dpr = Math.sqrt(MAX_CANVAS_PIXELS / (width * cssHeight));
      }
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvasContext: ctx, viewport });
      task.promise.then(
        () => { if (!cancelled) setRendered(true); },
        () => { /* renderização cancelada ao rolar ou mudar o zoom */ }
      );
    }).catch(() => {});

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, width, near]);

  return (
    <div
      ref={wrapRef}
      data-page={pageNumber}
      className="relative bg-white shadow-lg mx-auto"
      style={{ width, height: width * ratio }}
    >
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className="block" style={{ width, height: width * ratio }} />
    </div>
  );
};

interface PrintEditionViewerProps {
  edition: PrintEdition;
  onClose: () => void;
  onDownload: (edition: PrintEdition) => void;
  downloading?: boolean;
}

export const PrintEditionViewer: React.FC<PrintEditionViewerProps> = ({ edition, onClose, onDownload, downloading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [defaultRatio, setDefaultRatio] = useState(1.414);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 800));
  const [zoomIndex, setZoomIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Carrega o PDF por link temporário (o RLS do Storage só libera para conta ativa)
  useEffect(() => {
    let destroyed = false;
    let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;
    setDoc(null);
    setError(null);
    setProgress(0);

    printEditionsService.getEditionUrl(edition).then(async url => {
      if (destroyed) return;
      setFileUrl(url);
      loadingTask = pdfjs.getDocument({ url });
      loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (total) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
      };
      const pdf = await loadingTask.promise;
      const first = await pdf.getPage(1);
      const vp = first.getViewport({ scale: 1 });
      if (destroyed) return;
      setDefaultRatio(vp.height / vp.width);
      setDoc(pdf);
    }).catch((err: any) => {
      if (destroyed) return;
      setError(err?.message && !String(err.message).includes('Worker')
        ? err.message
        : 'Não foi possível exibir a edição neste aparelho.');
    });

    return () => {
      destroyed = true;
      loadingTask?.destroy();
    };
  }, [edition]);

  // Largura útil para "ajustar à tela"
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Esc fecha; a página de fundo não rola enquanto o leitor está aberto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const middle = el.getBoundingClientRect().top + el.clientHeight / 2;
    const pages = el.querySelectorAll<HTMLElement>('[data-page]');
    for (const p of Array.from(pages)) {
      const rect = p.getBoundingClientRect();
      if (rect.bottom >= middle) {
        setCurrentPage(Number(p.dataset.page));
        break;
      }
    }
  }, []);

  const fitWidth = Math.max(240, Math.min(containerWidth - 24, 1100));
  const pageWidth = Math.round(fitWidth * ZOOM_LEVELS[zoomIndex]);

  return (
    <div className="fixed inset-0 z-[120] bg-gray-900/95 flex flex-col" role="dialog" aria-modal="true" aria-label={`Edição impressa ${formatPrintEditionLabel(edition)}`}>
      {/* Cabeçalho: identificação da edição e manchete */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 flex items-start gap-3">
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-red-600 text-white items-center justify-center shrink-0 mt-0.5">
            <Newspaper className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-red-700">
              {formatPrintEditionLabel(edition)}
            </p>
            <h2 className="text-sm sm:text-base font-black text-gray-900 leading-snug line-clamp-2">
              {edition.headline}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onDownload(edition)}
              disabled={downloading}
              className="px-3 py-2 bg-[#0056a4] hover:bg-[#004482] disabled:opacity-60 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Baixar o PDF no aparelho"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer transition-colors"
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Páginas */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto py-4 px-3">
        {error ? (
          <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl p-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-sm font-bold text-gray-900">{error}</p>
            <p className="text-xs text-gray-500">Você ainda pode baixar o PDF ou abri-lo no leitor do próprio aparelho.</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                onClick={() => onDownload(edition)}
                className="px-4 py-2 bg-[#0056a4] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Baixar PDF
              </button>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir no aparelho
                </a>
              )}
            </div>
          </div>
        ) : !doc ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest">
              Carregando a edição{progress > 0 ? ` · ${progress}%` : '...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" style={{ width: pageWidth, margin: '0 auto' }}>
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i + 1} doc={doc} pageNumber={i + 1} width={pageWidth} defaultRatio={defaultRatio} />
            ))}
          </div>
        )}
      </div>

      {/* Barra de página e zoom */}
      {doc && !error && (
        <div className="bg-gray-900 border-t border-gray-800 text-white">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
              Página {currentPage} de {doc.numPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomIndex(i => Math.max(0, i - 1))}
                disabled={zoomIndex === 0}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 cursor-pointer"
                title="Diminuir zoom"
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-black w-12 text-center">{Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%</span>
              <button
                onClick={() => setZoomIndex(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 cursor-pointer"
                title="Aumentar zoom"
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintEditionViewer;
