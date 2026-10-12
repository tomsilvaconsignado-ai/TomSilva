import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Send, CheckCircle2, Clock, Trash2, 
  ExternalLink, ArrowRight, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { OutboxEmail } from '../../types/database';
import { emailService } from '../../lib/emailService';

interface EmailOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenActionUrl: (url: string) => void;
}

export const EmailOutboxModal: React.FC<EmailOutboxModalProps> = ({
  isOpen,
  onClose,
  onOpenActionUrl
}) => {
  const [emails, setEmails] = useState<OutboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(null);

  const loadEmails = () => {
    const list = emailService.getOutbox();
    setEmails(list);
    if (list.length > 0 && !selectedEmail) {
      setSelectedEmail(list[0]);
    } else if (list.length === 0) {
      setSelectedEmail(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => loadEmails();
    window.addEventListener('folha_outbox_updated', handleUpdate);
    return () => window.removeEventListener('folha_outbox_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm('Deseja limpar todos os e-mails registrados na caixa de saída virtual?')) {
      emailService.clearOutbox();
      setEmails([]);
      setSelectedEmail(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Visualizador */}
        <div className="bg-gray-950 text-white px-5 py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0056a4] text-white flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-tight">
                  Caixa de E-mails Transacionais
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {emails.length} Enviado(s)
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Visualizador de e-mails de confirmação e redefinição de senha da Folha da Região.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {emails.length > 0 && (
              <button
                onClick={handleClear}
                className="px-2.5 py-1 text-gray-400 hover:text-red-400 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                title="Limpar Histórico"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-full cursor-pointer hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layout Dividido: Lista à Esquerda e Prévia do E-mail à Direita */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Coluna 1: Lista de E-mails */}
          <div className="w-full md:w-80 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-200 bg-gray-100/70 text-[11px] font-black uppercase tracking-wider text-gray-500">
              Mensagens Enviadas
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
              {emails.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <Mail className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs font-medium">Nenhum e-mail disparado ainda.</p>
                  <p className="text-[10px]">Cadastre uma nova conta ou solicite recuperação de senha para testar.</p>
                </div>
              ) : (
                emails.map((item) => {
                  const isSelected = selectedEmail?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedEmail(item)}
                      className={`w-full text-left p-3.5 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-white shadow-xs border-l-4 border-[#0056a4]' 
                          : 'hover:bg-gray-100/70 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          item.type === 'email_confirmation' 
                            ? 'bg-blue-100 text-[#0056a4]'
                            : item.type === 'password_reset'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.type === 'email_confirmation' && 'Confirmação'}
                          {item.type === 'password_reset' && 'Redefinição'}
                          {item.type === 'password_changed' && 'Segurança'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(item.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {item.subject}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        Para: <strong>{item.to}</strong>
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna 2: Prévia e Ação do E-mail Selecionado */}
          <div className="flex-1 flex flex-col bg-gray-100 min-h-0 overflow-hidden">
            {selectedEmail ? (
              <>
                {/* Meta Header da Mensagem */}
                <div className="bg-white p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-gray-900">
                      {selectedEmail.subject}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Destinatário: <strong className="text-gray-900">{selectedEmail.recipientName}</strong> &lt;{selectedEmail.to}&gt;
                    </p>
                  </div>

                  {selectedEmail.actionUrl && (
                    <button
                      onClick={() => onOpenActionUrl(selectedEmail.actionUrl!)}
                      className="px-4 py-2 bg-[#0056a4] hover:bg-[#004482] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>Simular Clique no Botão</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Renderização do HTML do E-mail */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <iframe
                      title="Prévia do E-mail"
                      srcDoc={selectedEmail.bodyHtml}
                      className="w-full h-[520px] border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-gray-400">
                <p className="text-xs">Selecione uma mensagem para visualizar o conteúdo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
