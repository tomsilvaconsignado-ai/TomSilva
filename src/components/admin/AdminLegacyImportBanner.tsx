import React, { useEffect, useState } from 'react';
import { DatabaseZap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { legacyContentService, LegacyImportResult } from '../../lib/supabase';

interface AdminLegacyImportBannerProps {
  onImported: () => void;
}

// Aviso exibido ao administrador enquanto o banco estiver vazio ou existir conteúdo
// da versão anterior (gravado só neste navegador) que ainda não foi para o Supabase.
export const AdminLegacyImportBanner: React.FC<AdminLegacyImportBannerProps> = ({ onImported }) => {
  const [visible, setVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<LegacyImportResult | null>(null);

  useEffect(() => {
    let mounted = true;
    const hasLegacy = legacyContentService.hasLegacyData();
    legacyContentService.isDatabaseEmpty().then(isEmpty => {
      if (mounted) setVisible(hasLegacy || isEmpty);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!visible && !result) return null;

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await legacyContentService.importToSupabase();
      setResult(res);
      onImported();
    } catch (err: any) {
      setResult({ articles: 0, ads: 0, settings: 0, errors: [err?.message || 'Falha ao importar o conteúdo.'] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
          <DatabaseZap className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-sm uppercase text-amber-900 tracking-wide">
            Gravar conteúdo no banco de dados
          </h3>
          {!result ? (
            <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
              Na versão anterior, as notícias, banners e configurações editados no painel ficavam salvos apenas neste navegador
              e não apareciam para os leitores. Clique em importar para gravar no Supabase as matérias e banners iniciais e
              tudo o que foi editado aqui. Registros que já existem no banco não são alterados.
            </p>
          ) : result.errors.length === 0 ? (
            <p className="text-xs text-emerald-800 leading-relaxed flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              Importação concluída: {result.articles} matéria(s), {result.ads} banner(s) e {result.settings} configuração(ões) gravados no banco.
            </p>
          ) : (
            <div className="text-xs text-red-800 leading-relaxed space-y-1">
              <p className="flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                Importação parcial: {result.articles} matéria(s), {result.ads} banner(s) e {result.settings} configuração(ões) gravados.
                {' '}{result.errors.length} item(ns) falharam (o conteúdo local foi mantido para nova tentativa):
              </p>
              <ul className="list-disc pl-6 max-h-28 overflow-y-auto">
                {result.errors.slice(0, 10).map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {(!result || result.errors.length > 0) && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
          {importing ? 'Importando...' : result ? 'Tentar novamente' : 'Importar conteúdo'}
        </button>
      )}
    </div>
  );
};
