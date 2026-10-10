import React, { useState, useEffect } from 'react';
import { 
  Database, Github, Check, Copy, Shield, Settings, 
  Save, AlertCircle, CheckCircle2, Sliders, Tag, Mail, Phone, MapPin 
} from 'lucide-react';
import { ClassifiedsSettings } from '../../types/database';
import { 
  getSupabaseConfig, saveSupabaseConfig, 
  isSupabaseConfigured, classifiedsService 
} from '../../lib/supabase';

export const AdminSettings: React.FC = () => {
  const currentConfig = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(currentConfig.url);
  const [sbKey, setSbKey] = useState(currentConfig.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);

  // Regras dos Classificados
  const [settings, setSettings] = useState<ClassifiedsSettings>({
    requireApproval: true,
    defaultValidityDays: 30
  });

  // Expediente do portal
  const [contactEmail, setContactEmail] = useState('tomsilvaconsignado@gmail.com');
  const [contactPhone, setContactPhone] = useState('(79) 99977-6199');
  const [address, setAddress] = useState('Rua Divaldo Carvalho Costa, 304 B, Estância - SE');

  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    classifiedsService.getSettings().then(setSettings);
  }, []);

  const handleSaveClassifiedsSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await classifiedsService.updateSettings(settings);
    setNotice('Configurações dos classificados salvas com sucesso!');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(sbUrl, sbKey);
    setNotice('Configuração do Supabase salva com sucesso!');
    setTimeout(() => setNotice(null), 3000);
  };

  const copyToClipboard = (text: string, type: 'sql' | 'git') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } else {
      setCopiedGit(true);
      setTimeout(() => setCopiedGit(false), 3000);
    }
  };

  const sqlCode = `-- SQL DO PORTAL FOLHA DA REGIÃO
CREATE TABLE IF NOT EXISTS public.articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  video_url TEXT,
  is_video BOOLEAN DEFAULT false,
  is_hero BOOLEAN DEFAULT false,
  is_secondary BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  author TEXT DEFAULT 'Redação Folha da Região',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  link_url TEXT NOT NULL,
  media_url TEXT NOT NULL,
  placement TEXT,
  aspect_ratio TEXT DEFAULT '728 / 90',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

  const gitCommands = `# Sincronização com o repositório GitHub do portal:
git add .
git commit -m "feat: Painel administrativo otimizado e módulo de classificados seguro"
git push -u origin main`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Topo */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
          Configurações do Portal
        </h2>
        <p className="text-xs text-gray-500">
          Ajuste as regras de moderação, informações de contato e credenciais técnicas de integração.
        </p>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{notice}</span>
        </div>
      )}

      {/* BLOCO 1: REGRAS DOS CLASSIFICADOS */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
        <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
          <Tag className="w-5 h-5 text-[#0056a4]" />
          <div>
            <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
              Regras do Módulo de Classificados
            </h3>
            <p className="text-xs text-gray-400">
              Defina como novos anúncios públicos são publicados e quanto tempo permanecem no ar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveClassifiedsSettings} className="space-y-5">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                className="mt-1 rounded text-[#0056a4] focus:ring-[#0056a4]"
              />
              <div>
                <span className="font-bold text-xs text-gray-900 block">
                  Exigir aprovação prévia do administrador antes da publicação
                </span>
                <span className="text-xs text-gray-500 leading-relaxed block mt-0.5">
                  Quando ativado, todo anúncio criado pelo público fica com situação "Pendente" até ser revisado e aprovado no painel. Recomendado para prevenir fraudes.
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Validade padrão dos anúncios (em dias)
              </label>
              <select
                value={settings.defaultValidityDays}
                onChange={(e) => setSettings({ ...settings, defaultValidityDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 cursor-pointer"
              >
                <option value={15}>15 dias</option>
                <option value={30}>30 dias (Padrão recomendado)</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Regras de Classificados
          </button>
        </form>
      </div>

      {/* BLOCO 2: INFORMAÇÕES DE EXPEDIENTE E REDAÇÃO */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
        <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-[#0056a4]" />
          <div>
            <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
              Informações Oficiais do Portal
            </h3>
            <p className="text-xs text-gray-400">
              Canais oficiais para contato de leitores, anunciantes e autoridades.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              E-mail da Redação / Comercial
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              WhatsApp da Redação
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Endereço da Sede Administrativa
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* BLOCO 3: INTEGRAÇÃO SUPABASE & GITHUB */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
        <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
          <Database className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
              Integração Supabase (Banco de Dados em Nuvem)
            </h3>
            <p className="text-xs text-gray-400">
              Status atual: <strong>{isSupabaseConfigured() ? 'Conectado à Nuvem' : 'Modo Banco Local Ativo'}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSupabase} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Supabase Anon Key
              </label>
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Chaves do Supabase
            </button>
          </div>
        </form>

        {/* Cópia dos scripts */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-gray-800">Script SQL do Banco:</span>
              <button
                onClick={() => copyToClipboard(sqlCode, 'sql')}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-[11px] font-bold text-gray-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Copiado!' : 'Copiar SQL'}
              </button>
            </div>
            <pre className="text-[10px] bg-gray-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto max-h-24">
              {sqlCode}
            </pre>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-gray-800">Comandos Git:</span>
              <button
                onClick={() => copyToClipboard(gitCommands, 'git')}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-[11px] font-bold text-gray-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedGit ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedGit ? 'Copiado!' : 'Copiar Git'}
              </button>
            </div>
            <pre className="text-[10px] bg-gray-900 text-blue-300 p-2.5 rounded-lg overflow-x-auto max-h-24">
              {gitCommands}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
