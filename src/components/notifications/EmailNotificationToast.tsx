import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { OutboxEmail } from '../../types/database';
import { emailService } from '../../lib/emailService';

interface EmailNotificationToastProps {
  onOpenOutbox: () => void;
  onOpenActionUrl: (url: string) => void;
}

export const EmailNotificationToast: React.FC<EmailNotificationToastProps> = ({
  onOpenOutbox,
  onOpenActionUrl
}) => {
  const [latestEmail, setLatestEmail] = useState<OutboxEmail | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateCount = () => {
      const list = emailService.getOutbox();
      setTotalCount(list.length);
    };

    updateCount();

    const handleEmailSent = (e: any) => {
      const email: OutboxEmail = e.detail;
      if (email) {
        setLatestEmail(email);
        setIsVisible(true);
        updateCount();
      }
    };

    const handleOutboxUpdate = () => updateCount();

    window.addEventListener('folha_email_sent', handleEmailSent);
    window.addEventListener('folha_outbox_updated', handleOutboxUpdate);

    return () => {
      window.removeEventListener('folha_email_sent', handleEmailSent);
      window.removeEventListener('folha_outbox_updated', handleOutboxUpdate);
    };
  }, []);

  return (
    <>
      {/* Toast flutuante de notificação instantânea quando um e-mail é gerado */}
      {isVisible && latestEmail && (
        <div className="fixed bottom-5 left-5 z-[105] max-w-sm w-full bg-gray-950 text-white rounded-2xl shadow-2xl border border-gray-800 p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0056a4] text-white flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                  E-mail Transacional Enviado
                </span>
                <p className="text-xs font-bold text-gray-100 truncate max-w-[200px]">
                  {latestEmail.subject}
                </p>
                <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                  Para: {latestEmail.to}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white p-1 rounded-full cursor-pointer hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
            {latestEmail.actionUrl && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onOpenActionUrl(latestEmail.actionUrl!);
                }}
                className="flex-1 py-1.5 px-3 bg-[#0056a4] hover:bg-[#004482] text-white rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{latestEmail.actionLabel || 'Confirmar / Abrir'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                setIsVisible(false);
                onOpenOutbox();
              }}
              className="py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Ver E-mail
            </button>
          </div>
        </div>
      )}

      {/* Botão flutuante fixo no rodapé para abrir a caixa de mensagens a qualquer momento */}
      {totalCount > 0 && (
        <button
          onClick={onOpenOutbox}
          className="fixed bottom-5 right-5 z-[90] bg-gray-900 hover:bg-gray-800 text-white rounded-full px-4 py-2.5 shadow-xl border border-gray-700 flex items-center gap-2 text-xs font-bold cursor-pointer transition-all hover:scale-105"
          title="Ver e-mails transacionais enviados pelo portal"
        >
          <Mail className="w-4 h-4 text-[#0056a4]" />
          <span>E-mails</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#0056a4] text-white text-[10px] font-black">
            {totalCount}
          </span>
        </button>
      )}
    </>
  );
};
