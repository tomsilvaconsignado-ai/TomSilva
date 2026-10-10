import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck, Award, Users } from 'lucide-react';

interface InstitutionalPageProps {
  page: 'sobre-nos' | 'expediente' | 'privacidade' | 'anuncie-conosco';
  onBack: () => void;
}

export const InstitutionalPage: React.FC<InstitutionalPageProps> = ({ page, onBack }) => {
  const [adForm, setAdForm] = useState({
    company: '',
    contactName: '',
    phone: '',
    email: '',
    placement: 'header',
    message: ''
  });
  const [sent, setSent] = useState(false);

  const handleAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 6000);
    setAdForm({
      company: '',
      contactName: '',
      phone: '',
      email: '',
      placement: 'header',
      message: ''
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-600 hover:text-[#0056a4] transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar à Página Inicial
      </button>

      {/* 1. SOBRE NÓS */}
      {page === 'sobre-nos' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-8 bg-[#0056a4] rounded"></span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
              Sobre a Folha da Região
            </h1>
          </div>
          <p className="text-base text-gray-700 leading-relaxed">
            A <strong>Folha da Região</strong> consolidou-se como a principal referência jornalística de Estância e de todo o estado de Sergipe. Nascido com o propósito de levar informação ágil, ética e com apuração rigorosa, nosso portal conecta os cidadãos aos acontecimentos que moldam a sociedade.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              <Award className="w-8 h-8 text-[#0056a4] mb-3" />
              <h3 className="font-black text-sm uppercase text-gray-900 mb-2">Missão</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Informar com imparcialidade, verdade e independência, promovendo o debate construtivo e o desenvolvimento regional.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mb-3" />
              <h3 className="font-black text-sm uppercase text-gray-900 mb-2">Valores</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Compromisso com o leitor, checagem de fatos, respeito à diversidade e valorização da cultura sergipana.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              <Users className="w-8 h-8 text-amber-500 mb-3" />
              <h3 className="font-black text-sm uppercase text-gray-900 mb-2">Alcance</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Presente diariamente nos 75 municípios de Sergipe e com audiência em todo o território nacional.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXPEDIENTE */}
      {page === 'expediente' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-8 bg-[#0056a4] rounded"></span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
              Expediente
            </h1>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Estrutura editorial e administrativa da Folha da Região Online Sergipe.
          </p>

          <div className="space-y-4 pt-4 border-t border-gray-100 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">Direção Geral & Editor-Chefe</p>
                <p className="font-bold text-gray-900 text-base mt-1">Ítallo Nascimento</p>
                <p className="text-xs text-gray-500">itallomarketing@gmail.com</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">Departamento Comercial & Marketing</p>
                <p className="font-bold text-gray-900 text-base mt-1">Equipe Folha da Região</p>
                <p className="text-xs text-gray-500">(79) 99977-6199</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">Sede Administrativa</p>
                <p className="font-bold text-gray-900 text-base mt-1">Estância - Sergipe</p>
                <p className="text-xs text-gray-500">Rua Divaldo Carvalho Costa, 304 B, 1º Andar</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-black uppercase text-gray-400">Redação & Correspondentes</p>
                <p className="font-bold text-gray-900 text-base mt-1">Aracaju, Estância, Lagarto e Itabaiana</p>
                <p className="text-xs text-gray-500">Cobertura estadual 24 horas</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. POLÍTICA DE PRIVACIDADE */}
      {page === 'privacidade' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-8 bg-[#0056a4] rounded"></span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
              Política de Privacidade
            </h1>
          </div>

          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              A <strong>Folha da Região Online</strong> respeita a privacidade de seus leitores e usuários e cumpre as disposições da Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
            </p>
            <h3 className="font-black text-gray-900 text-base uppercase">1. Coleta de Dados</h3>
            <p>
              Coletamos informações cadastrais básicas (nome e e-mail) exclusivamente quando fornecidas voluntariamente para fins de autenticação, comentários em notícias ou subscrição da newsletter.
            </p>
            <h3 className="font-black text-gray-900 text-base uppercase">2. Segurança e Supabase</h3>
            <p>
              Os dados de usuários e credenciais são gerenciados com criptografia de ponta a ponta através da infraestrutura de autenticação do Supabase, garantindo que suas senhas nunca sejam armazenadas em texto plano.
            </p>
            <h3 className="font-black text-gray-900 text-base uppercase">3. Cookies e Métricas</h3>
            <p>
              Utilizamos cookies para métricas de visualização e preferências de leitura (como tamanho de texto e sessão).
            </p>
          </div>
        </div>
      )}

      {/* 4. ANUNCIE CONOSCO */}
      {page === 'anuncie-conosco' && (
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-3 h-8 bg-red-600 rounded"></span>
              <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
                Anuncie na Folha da Região
              </h1>
            </div>
            <p className="text-sm text-gray-600">
              Coloque sua marca em evidência para milhares de leitores qualificados em todo o estado de Sergipe.
            </p>
          </div>

          {sent && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Proposta recebida com sucesso!</p>
                <p className="text-xs">Nossa equipe comercial entrará em contato em breve pelo telefone/WhatsApp informado.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleAdSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome da Empresa / Marca
                </label>
                <input
                  type="text"
                  required
                  value={adForm.company}
                  onChange={(e) => setAdForm({ ...adForm, company: e.target.value })}
                  placeholder="Ex: Auto Peças Estância"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  required
                  value={adForm.contactName}
                  onChange={(e) => setAdForm({ ...adForm, contactName: e.target.value })}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={adForm.phone}
                    onChange={(e) => setAdForm({ ...adForm, phone: e.target.value })}
                    placeholder="(79) 99999-9999"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    E-mail Comercial
                  </label>
                  <input
                    type="email"
                    required
                    value={adForm.email}
                    onChange={(e) => setAdForm({ ...adForm, email: e.target.value })}
                    placeholder="comercial@empresa.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Formato Desejado
                </label>
                <select
                  value={adForm.placement}
                  onChange={(e) => setAdForm({ ...adForm, placement: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10"
                >
                  <option value="header">Super Banner Topo (728x90) - Máxima Visibilidade</option>
                  <option value="sidebar">Banner Lateral / Vídeo Feed (Quadrado 1:1 ou Vertical 1:2)</option>
                  <option value="feed">Vídeo Intercalado no Feed de Notícias (16:9)</option>
                  <option value="article">Publieditorial / Matéria Patrocinada Exclusiva</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Mensagem Adicional
                </label>
                <textarea
                  rows={3}
                  value={adForm.message}
                  onChange={(e) => setAdForm({ ...adForm, message: e.target.value })}
                  placeholder="Conte um pouco sobre seus objetivos de campanha..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Solicitar Proposta Comercial
              </button>
            </form>

            {/* Informações de Contato Direto */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">
              <h3 className="font-black text-sm uppercase text-gray-900 border-l-4 border-[#0056a4] pl-3">
                Atendimento Imediato
              </h3>

              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#0056a4] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase text-gray-400">Comercial</p>
                    <p className="font-bold text-base text-gray-900">(79) 99977-6199</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#0056a4] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase text-gray-400">E-mail</p>
                    <p className="font-bold text-base text-gray-900">itallomarketing@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#0056a4] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase text-gray-400">Sede</p>
                    <p className="text-xs text-gray-600">Rua Divaldo Carvalho Costa, 304 B 1º Andar Estância SE</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-[#0056a4]">
                💡 <strong>Dica Comercial:</strong> Anúncios em vídeo vertical e gifs animados no feed alcançam em média 3.8x mais interações de clientes na região sul de Sergipe.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
