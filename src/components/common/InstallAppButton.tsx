import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, MoreVertical, Monitor, Smartphone, RefreshCw } from 'lucide-react';
import { useInstallApp, InstallPlatform, waitForInstallPrompt } from '../../lib/pwa';
import { getAssetUrl } from '../../lib/assets';

interface InstallAppButtonProps {
  // 'menu': botão largo no menu do celular/tablet • 'compact': link discreto na barra do computador
  variant: 'menu' | 'compact';
  onAfterClick?: () => void;
}

const Step: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <li className="flex items-start gap-3">
    <span className="w-6 h-6 shrink-0 rounded-full bg-[#0056a4] text-white text-xs font-black flex items-center justify-center">{n}</span>
    <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
  </li>
);

const InstallInstructions: React.FC<{ platform: InstallPlatform }> = ({ platform }) => {
  if (platform === 'ios') {
    return (
      <ol className="space-y-3">
        <Step n={1}>Toque no botão <strong>Compartilhar</strong> <Share className="w-4 h-4 inline -mt-1 text-[#0056a4]" /> na barra do navegador (embaixo no iPhone, em cima no iPad).</Step>
        <Step n={2}>Role a lista e toque em <strong>Adicionar à Tela de Início</strong> <PlusSquare className="w-4 h-4 inline -mt-1 text-[#0056a4]" />.</Step>
        <Step n={3}>Confirme em <strong>Adicionar</strong>. O ícone da Folha da Região aparece junto com os seus aplicativos.</Step>
      </ol>
    );
  }
  if (platform === 'android') {
    return (
      <ol className="space-y-3">
        <Step n={1}>Toque no menu do navegador <MoreVertical className="w-4 h-4 inline -mt-1 text-[#0056a4]" /> (os três pontinhos).</Step>
        <Step n={2}>Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</Step>
        <Step n={3}>Confirme em <strong>Instalar</strong>. O ícone aparece na tela do celular.</Step>
      </ol>
    );
  }
  if (platform === 'desktop-chrome') {
    return (
      <ol className="space-y-3">
        <Step n={1}>Clique no ícone de instalar <Monitor className="w-4 h-4 inline -mt-1 text-[#0056a4]" /> no canto direito da barra de endereços, ou abra o menu <MoreVertical className="w-4 h-4 inline -mt-1 text-[#0056a4]" /> do navegador.</Step>
        <Step n={2}>Escolha <strong>Instalar Folha da Região</strong> (no Edge: <strong>Aplicativos › Instalar este site como aplicativo</strong>).</Step>
        <Step n={3}>Confirme em <strong>Instalar</strong>. O portal abre em uma janela própria e ganha atalho no computador.</Step>
      </ol>
    );
  }
  if (platform === 'mac-safari') {
    return (
      <ol className="space-y-3">
        <Step n={1}>No menu do Safari, clique em <strong>Arquivo</strong>.</Step>
        <Step n={2}>Escolha <strong>Adicionar ao Dock</strong> e confirme em <strong>Adicionar</strong>.</Step>
      </ol>
    );
  }
  return (
    <p className="text-sm text-gray-700 leading-relaxed">
      Este navegador não permite instalar sites como aplicativo. Abra <strong>www.folhadaregiaonline.com.br</strong> no
      <strong> Google Chrome</strong> ou no <strong>Microsoft Edge</strong> e toque em <strong>Instalar aplicativo</strong> no menu.
    </p>
  );
};

// Navegadores que instalam direto pela janela nativa (Chrome, Edge, Samsung Internet, Opera)
const supportsNativeInstall = (): boolean =>
  typeof window !== 'undefined' && 'onbeforeinstallprompt' in window;

// Tempo máximo esperando o Chrome liberar a instalação antes de mostrar o passo a passo
const WAIT_FOR_PROMPT_MS = 35000;

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ variant, onAfterClick }) => {
  const { visible, canPromptNatively, platform, promptInstall } = useInstallApp();
  // waiting: aguardando o Chrome liberar • ready: "Instalar agora" • help: passo a passo
  const [mode, setMode] = useState<'closed' | 'waiting' | 'ready' | 'help'>('closed');

  // Enquanto a janela de espera está aberta, troca para "Instalar agora" assim que liberar
  useEffect(() => {
    if (mode !== 'waiting') return;
    let cancelled = false;
    waitForInstallPrompt(WAIT_FOR_PROMPT_MS).then((ok) => {
      if (!cancelled) setMode(ok ? 'ready' : 'help');
    });
    return () => { cancelled = true; };
  }, [mode]);

  if (!visible) return null;

  const handleClick = async () => {
    onAfterClick?.();
    if (canPromptNatively && await promptInstall()) return;
    // Android e Chrome/Edge no computador instalam direto: espera a liberação em vez de orientar
    if (supportsNativeInstall() && platform !== 'ios') {
      setMode('waiting');
      return;
    }
    setMode('help');
  };

  const handleInstallNow = async () => {
    const prompted = await promptInstall();
    setMode(prompted ? 'closed' : 'help');
  };

  const closeModal = () => setMode('closed');

  return (
    <>
      {variant === 'menu' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full py-2.5 px-3 bg-[#0056a4] hover:bg-[#004482] text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Instalar aplicativo
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          title="Instalar a Folha da Região como aplicativo no computador"
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#0056a4] hover:underline cursor-pointer"
        >
          <Download className="w-3 h-3" />
          Instalar app
        </button>
      )}

      {mode !== 'closed' && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Como instalar o aplicativo Folha da Região"
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={getAssetUrl('icons/icon-192.png')} alt="" className="w-12 h-12 rounded-xl border border-gray-100 shadow-xs" />
                <div>
                  <h3 className="font-black text-base text-gray-900 leading-tight">Instale a Folha da Região</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    {platform === 'desktop-chrome' || platform === 'mac-safari' || platform === 'unsupported'
                      ? <Monitor className="w-3.5 h-3.5" />
                      : <Smartphone className="w-3.5 h-3.5" />}
                    Notícias e classificados com um toque, direto da sua tela.
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            {mode === 'waiting' && (
              <div className="flex flex-col items-center text-center gap-3 py-2" aria-live="polite">
                <RefreshCw className="w-7 h-7 text-[#0056a4] animate-spin" />
                <p className="text-sm font-bold text-gray-800">Preparando a instalação...</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  O navegador libera a instalação depois de alguns segundos no portal. Pode continuar com esta janela aberta: o botão <strong>Instalar agora</strong> aparece aqui assim que estiver pronto.
                </p>
              </div>
            )}

            {mode === 'ready' && (
              <div className="space-y-3" aria-live="polite">
                <p className="text-sm text-gray-700 text-center">Tudo pronto! Toque no botão abaixo e confirme para colocar o ícone da Folha da Região na sua tela.</p>
                <button
                  type="button"
                  onClick={handleInstallNow}
                  className="w-full py-3.5 bg-[#0056a4] hover:bg-[#004482] text-white text-sm font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  autoFocus
                >
                  <Download className="w-5 h-5" />
                  Instalar agora
                </button>
              </div>
            )}

            {mode === 'help' && (
              <>
                {supportsNativeInstall() && platform !== 'ios' && (
                  <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
                    O navegador não liberou a instalação automática. Se o aplicativo já estiver instalado, procure o ícone da Folha da Região na sua tela. Se não, instale pelo menu:
                  </p>
                )}
                <InstallInstructions platform={platform} />
              </>
            )}

            <button
              type="button"
              onClick={closeModal}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
            >
              {mode === 'help' ? 'Entendi' : 'Agora não'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
