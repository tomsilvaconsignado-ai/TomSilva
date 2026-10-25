import React, { useState } from 'react';
import { Download, X, Share, PlusSquare, MoreVertical, Monitor, Smartphone } from 'lucide-react';
import { useInstallApp, InstallPlatform } from '../../lib/pwa';
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

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ variant, onAfterClick }) => {
  const { visible, canPromptNatively, platform, promptInstall } = useInstallApp();
  const [helpOpen, setHelpOpen] = useState(false);

  if (!visible) return null;

  const handleClick = async () => {
    onAfterClick?.();
    const prompted = canPromptNatively ? await promptInstall() : false;
    if (!prompted) setHelpOpen(true);
  };

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

      {helpOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setHelpOpen(false)}
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
              <button type="button" onClick={() => setHelpOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <InstallInstructions platform={platform} />

            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
