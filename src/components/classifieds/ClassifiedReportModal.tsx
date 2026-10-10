import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert, Send } from 'lucide-react';
import { ClassifiedItem } from '../../types/database';
import { classifiedsService } from '../../lib/supabase';

interface ClassifiedReportModalProps {
  classified: ClassifiedItem;
  isOpen: boolean;
  onClose: () => void;
}

export const ClassifiedReportModal: React.FC<ClassifiedReportModalProps> = ({
  classified,
  isOpen,
  onClose
}) => {
  const [reason, setReason] = useState<'fraude' | 'produto_proibido' | 'dados_falsos' | 'conteudo_ofensivo' | 'outro'>('fraude');
  const [details, setDetails] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;

    setLoading(true);
    await classifiedsService.createReport({
      classifiedId: classified.id,
      classifiedTitle: classified.title,
      reporterName: reporterName.trim() || undefined,
      reporterEmail: reporterEmail.trim() || undefined,
      reason,
      details: details.trim()
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-red-600">
          <ShieldAlert className="w-5 h-5" />
          <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
            Denunciar Anúncio
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Você está denunciando o anúncio: <strong className="text-gray-800">"{classified.title}"</strong> (Código: {classified.code}).
        </p>

        {success ? (
          <div className="p-6 text-center space-y-3 bg-green-50 rounded-xl border border-green-200">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <h4 className="font-black text-sm text-green-900 uppercase">Denúncia Enviada</h4>
            <p className="text-xs text-green-700 leading-relaxed">
              Obrigado por ajudar a manter o portal seguro. Nossa equipe irá analisar as informações com prioridade.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Motivo da Denúncia
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
              >
                <option value="fraude">Tentativa de golpe ou fraude financeira</option>
                <option value="produto_proibido">Produto ilegal ou proibido</option>
                <option value="dados_falsos">Informações ou fotos falsas / enganosas</option>
                <option value="conteudo_ofensivo">Conteúdo ofensivo, ilegal ou discriminatório</option>
                <option value="outro">Outro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Detalhes da Denúncia
              </label>
              <textarea
                required
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Descreva o que ocorreu ou o motivo da sua suspeita..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Seu Nome (Opcional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Nome"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Seu E-mail (Opcional)
                </label>
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="E-mail"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !details.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider text-xs rounded-lg transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? 'Enviando...' : 'Enviar Denúncia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
