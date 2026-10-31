import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  Newspaper, Upload, FileText, Save, Loader2, Pencil, Trash2, Eye, EyeOff, X, AlertCircle, CheckCircle2, PlusCircle
} from 'lucide-react';
import { PrintEdition } from '../../types/database';
import {
  printEditionsService, PrintEditionInput, PRINT_PDF_MAX_BYTES, MONTH_NAMES, toRoman,
  formatPrintEditionLabel, formatFileSize
} from '../../lib/supabase';

const PrintEditionViewer = React.lazy(() => import('../print/PrintEditionViewer'));

// Sugere a próxima edição a partir da última cadastrada (mesmo ano do jornal, número + 1, mês seguinte)
const suggestNext = (editions: PrintEdition[]): PrintEditionInput => {
  const now = new Date();
  const last = [...editions].sort((a, b) => b.editionNumber - a.editionNumber)[0];
  if (!last) {
    return { volumeYear: 1, editionNumber: 1, editionMonth: now.getMonth() + 1, editionYear: now.getFullYear(), headline: '', published: true };
  }
  const nextMonth = last.editionMonth === 12 ? 1 : last.editionMonth + 1;
  return {
    volumeYear: last.volumeYear,
    editionNumber: last.editionNumber + 1,
    editionMonth: nextMonth,
    editionYear: last.editionMonth === 12 ? last.editionYear + 1 : last.editionYear,
    headline: '',
    published: true
  };
};

const inputClass = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none';
const labelClass = 'block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5';

export const AdminPrintEditionsTab: React.FC = () => {
  const [editions, setEditions] = useState<PrintEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PrintEdition | null>(null);
  const [form, setForm] = useState<PrintEditionInput>(() => suggestNext([]));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<PrintEdition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async (resetForm = false) => {
    setLoading(true);
    try {
      const list = await printEditionsService.getEditions();
      setEditions(list);
      setLoadError(null);
      if (resetForm) setForm(suggestNext(list));
    } catch (err: any) {
      setLoadError(err?.message || 'Não foi possível carregar as edições.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(true); }, []);

  const resetForm = (list = editions) => {
    setEditing(null);
    setForm(suggestNext(list));
    setFile(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (edition: PrintEdition) => {
    setEditing(edition);
    setForm({
      volumeYear: edition.volumeYear,
      editionNumber: edition.editionNumber,
      editionMonth: edition.editionMonth,
      editionYear: edition.editionYear,
      headline: edition.headline,
      published: edition.published
    });
    setFile(null);
    setFormError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFormError(null);
    if (selected && !(/\.pdf$/i.test(selected.name) || selected.type === 'application/pdf')) {
      setFormError('Selecione um arquivo PDF.');
      e.target.value = '';
      return;
    }
    if (selected && selected.size > PRINT_PDF_MAX_BYTES) {
      setFormError(`O PDF tem ${formatFileSize(selected.size)} e o limite é 50 MB. Exporte com compressão para web e tente de novo.`);
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      const saved = await printEditionsService.saveEdition(form, file, editing);
      const list = await printEditionsService.getEditions();
      setEditions(list);
      setSuccess(`${editing ? 'Edição atualizada' : 'Edição publicada'}: ${formatPrintEditionLabel(saved)}${saved.published ? '' : ' (oculta para os leitores)'}.`);
      resetForm(list);
    } catch (err: any) {
      setFormError(err?.message || 'Não foi possível salvar a edição.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (edition: PrintEdition) => {
    if (!window.confirm(`Excluir definitivamente a edição ${formatPrintEditionLabel(edition)}? O PDF também será apagado.`)) return;
    try {
      await printEditionsService.deleteEdition(edition);
      if (editing?.id === edition.id) resetForm();
      await load();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível excluir a edição.');
    }
  };

  const togglePublished = async (edition: PrintEdition) => {
    try {
      await printEditionsService.saveEdition({ ...edition, published: !edition.published }, null, edition);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível alterar a visibilidade da edição.');
    }
  };

  const setField = <K extends keyof PrintEditionInput>(key: K, value: PrintEditionInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const roman = toRoman(form.volumeYear);

  return (
    <div className="container mx-auto px-4 pb-10 grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Formulário de envio */}
      <form onSubmit={handleSubmit} className="xl:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4 h-fit">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
            {editing ? <Pencil className="w-4 h-4 text-red-600" /> : <PlusCircle className="w-4 h-4 text-red-600" />}
            {editing ? `Editar edição Nº ${editing.editionNumber}` : 'Nova edição impressa'}
          </h3>
          {editing && (
            <button type="button" onClick={() => resetForm()} className="text-[11px] font-black uppercase text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="pe-volume">Ano do jornal</label>
            <input
              id="pe-volume"
              type="number"
              min={1}
              max={3999}
              required
              value={form.volumeYear || ''}
              onChange={e => setField('volumeYear', Number(e.target.value))}
              className={inputClass}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Aparece como <strong className="text-gray-900">Ano {roman || '—'}</strong>
            </p>
          </div>
          <div>
            <label className={labelClass} htmlFor="pe-number">Número da edição</label>
            <input
              id="pe-number"
              type="number"
              min={1}
              required
              value={form.editionNumber || ''}
              onChange={e => setField('editionNumber', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="pe-month">Mês da edição</label>
            <select
              id="pe-month"
              value={form.editionMonth}
              onChange={e => setField('editionMonth', Number(e.target.value))}
              className={`${inputClass} cursor-pointer`}
            >
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="pe-year">Ano de circulação</label>
            <input
              id="pe-year"
              type="number"
              min={1900}
              max={2200}
              required
              value={form.editionYear || ''}
              onChange={e => setField('editionYear', Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="pe-headline">Título da pauta principal (manchete)</label>
          <textarea
            id="pe-headline"
            required
            minLength={3}
            maxLength={300}
            rows={3}
            value={form.headline}
            onChange={e => setField('headline', e.target.value)}
            placeholder="Ex.: Estância recebe investimento recorde para a orla"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <span className={labelClass}>Arquivo PDF da edição</span>
          <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 hover:border-[#0056a4] rounded-xl cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              {file ? <FileText className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <div className="min-w-0 text-xs">
              {file ? (
                <>
                  <p className="font-bold text-gray-900 truncate">{file.name}</p>
                  <p className="text-gray-500">{formatFileSize(file.size)}</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-900">
                    {editing ? 'Trocar o PDF (opcional)' : 'Selecionar o PDF do computador'}
                  </p>
                  <p className="text-gray-500">
                    {editing ? `Atual: ${formatFileSize(editing.fileSize) || 'PDF enviado'}` : 'Somente PDF, até 50 MB'}
                  </p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleFile} className="hidden" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.published}
            onChange={e => setField('published', e.target.checked)}
            className="w-4 h-4 accent-[#0056a4]"
          />
          Visível para os leitores cadastrados
        </label>

        {/* Prévia do que o leitor verá */}
        <div className="bg-[#fbfaf6] border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">O leitor verá</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-red-700">{formatPrintEditionLabel(form)}</p>
          <p className="text-sm font-black text-gray-900 leading-snug font-serif">{form.headline || 'Título da manchete principal'}</p>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-3 py-2.5 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {formError}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-2.5 text-xs font-bold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving
            ? (file ? `Enviando PDF (${formatFileSize(file.size)})...` : 'Salvando...')
            : editing ? 'Salvar alterações' : 'Publicar edição'}
        </button>
      </form>

      {/* Edições cadastradas */}
      <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden h-fit">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-red-600" /> Edições cadastradas
          </h3>
          <span className="text-[11px] font-bold text-gray-400">{editions.length} edição(ões)</span>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : loadError ? (
          <div className="p-8 text-center text-sm font-bold text-red-700 flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8" /> {loadError}
          </div>
        ) : editions.length === 0 ? (
          <div className="p-10 text-center text-gray-400 space-y-2">
            <Newspaper className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-bold text-gray-600">Nenhuma edição cadastrada.</p>
            <p className="text-xs">Envie o PDF da primeira edição pelo formulário.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {editions.map(edition => (
              <li key={edition.id} className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 ${editing?.id === edition.id ? 'bg-red-50/50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-700">{formatPrintEditionLabel(edition)}</p>
                    {!edition.published && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-gray-200 text-gray-600">Oculta</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{edition.headline}</p>
                  <p className="text-[11px] text-gray-400">{formatFileSize(edition.fileSize)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setPreviewing(edition)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer" title="Visualizar PDF">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => togglePublished(edition)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer" title={edition.published ? 'Ocultar dos leitores' : 'Mostrar aos leitores'}>
                    {edition.published ? <EyeOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </button>
                  <button onClick={() => startEdit(edition)} className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 cursor-pointer" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(edition)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {previewing && (
        <Suspense fallback={null}>
          <PrintEditionViewer
            edition={previewing}
            onClose={() => setPreviewing(null)}
            onDownload={async (edition) => {
              try {
                window.open(await printEditionsService.getEditionUrl(edition, true), '_self');
              } catch (err: any) {
                alert(err?.message || 'Não foi possível baixar a edição.');
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
