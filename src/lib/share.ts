import { useCallback, useEffect, useState } from 'react';

/**
 * Trava de compartilhamento: só libera o link quando a prévia vai sair completa
 * (foto da publicação + título + link do portal).
 *
 * O WhatsApp e o Facebook montam a prévia lendo a página estática do link, gerada no deploy
 * (scripts/prerender.ts). Antes do deploy o GitHub Pages responde 404 e a prévia sai genérica,
 * sem foto nem título; depois de uma edição a página mostra o título antigo até o próximo deploy.
 * Por isso a página publicada é conferida antes de liberar o compartilhamento.
 */

export type PreviewStatus = 'checking' | 'ready' | 'pending';

const DEFAULT_PREVIEW_IMAGE = '/og-image.png';

const normalize = (text: string = ''): string => text.replace(/\s+/g, ' ').trim();

// Foto própria da publicação: precisa existir e não pode estar embutida (data:), pois o WhatsApp baixa por HTTP
export const hasShareablePhoto = (url?: string | null): boolean =>
  Boolean(url && url.trim() && !url.trim().startsWith('data:'));

// Confere se a página do link já tem o título atual e uma foto própria nos metadados Open Graph
export const checkPreviewPage = async (url: string, expectedTitle: string): Promise<boolean> => {
  try {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) return false;
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    return normalize(ogTitle) === normalize(expectedTitle) && Boolean(ogImage) && !ogImage.endsWith(DEFAULT_PREVIEW_IMAGE);
  } catch {
    return false;
  }
};

export const usePreviewStatus = (url: string, expectedTitle: string, enabled: boolean) => {
  const [status, setStatus] = useState<PreviewStatus>('checking');

  const recheck = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      setStatus('pending');
      return false;
    }
    setStatus('checking');
    const ready = await checkPreviewPage(url, expectedTitle);
    setStatus(ready ? 'ready' : 'pending');
    return ready;
  }, [url, expectedTitle, enabled]);

  useEffect(() => {
    recheck();
  }, [recheck]);

  return { status, recheck };
};

export const PREVIEW_PENDING_MESSAGE =
  'A prévia desta publicação (foto, título e link do portal) ainda está sendo gerada. ' +
  'O compartilhamento é liberado assim que ela ficar pronta; tente novamente em alguns minutos.';
