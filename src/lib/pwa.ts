import { useEffect, useState } from 'react';

// ==========================================
// INSTALAÇÃO DO APLICATIVO (PWA)
// Chrome, Edge e Android oferecem a janela nativa de instalação (evento beforeinstallprompt).
// iPhone/iPad e alguns navegadores não têm essa janela: o botão mostra o passo a passo.
// ==========================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform =
  | 'ios'             // iPhone / iPad (Safari, Chrome ou outro navegador)
  | 'android'         // Android sem a janela nativa (ex.: Samsung Internet, Firefox)
  | 'desktop-chrome'  // Chrome / Edge no computador sem a janela nativa disponível
  | 'mac-safari'      // Safari no Mac (Arquivo > Adicionar ao Dock)
  | 'unsupported';    // ex.: Firefox no computador

const INSTALLED_EVENT = 'folha_pwa_installed';
const PROMPT_EVENT = 'folha_pwa_prompt_ready';

let deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  // Captura cedo (antes do React montar) para não perder o evento
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(PROMPT_EVENT));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(INSTALLED_EVENT));
  });
}

export const isRunningInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as any).standalone === true
  );
};

export const detectInstallPlatform = (): InstallPlatform => {
  if (typeof navigator === 'undefined') return 'unsupported';
  const ua = navigator.userAgent;
  // iPadOS se identifica como Mac; o toque denuncia que é iPad
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  const isFirefox = /Firefox\//i.test(ua);
  const isChromium = /Chrome\/|Chromium\/|Edg\//i.test(ua);
  if (/Macintosh/i.test(ua) && !isChromium && !isFirefox && /Safari\//i.test(ua)) return 'mac-safari';
  if (isChromium && !isFirefox) return 'desktop-chrome';
  return 'unsupported';
};

// Registra o service worker (necessário para a instalação no Chrome e no Edge)
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;
  const base = (import.meta as any).env?.BASE_URL || '/';
  const swUrl = base === './' || base === '.' ? new URL('sw.js', window.location.origin + '/').href : `${base.replace(/\/?$/, '/')}sw.js`;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl).catch((err) => console.warn('Service worker não registrado:', err));
  });
};

/**
 * Estado do botão "Instalar aplicativo".
 * - visible: false quando o portal já está aberto como aplicativo instalado
 * - canPromptNatively: há janela nativa de instalação disponível
 */
export const useInstallApp = () => {
  const [installed, setInstalled] = useState<boolean>(() => isRunningInstalled());
  const [canPromptNatively, setCanPromptNatively] = useState<boolean>(() => deferredPrompt !== null);
  const platform = detectInstallPlatform();

  useEffect(() => {
    const onReady = () => setCanPromptNatively(deferredPrompt !== null);
    const onInstalled = () => { setInstalled(true); setCanPromptNatively(false); };
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayChange = () => setInstalled(isRunningInstalled());
    window.addEventListener(PROMPT_EVENT, onReady);
    window.addEventListener(INSTALLED_EVENT, onInstalled);
    media?.addEventListener?.('change', onDisplayChange);
    return () => {
      window.removeEventListener(PROMPT_EVENT, onReady);
      window.removeEventListener(INSTALLED_EVENT, onInstalled);
      media?.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  // Abre a janela nativa; devolve false se ela não estiver disponível (mostrar instruções)
  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    const event = deferredPrompt;
    deferredPrompt = null;
    setCanPromptNatively(false);
    await event.prompt();
    const choice = await event.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    if (choice.outcome === 'accepted') setInstalled(true);
    return true;
  };

  return { visible: !installed, canPromptNatively, platform, promptInstall };
};
