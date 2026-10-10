import React from 'react';
import { X, ShieldCheck, FileText, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="bg-gray-900 text-white p-5 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0056a4] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">
                Termos de Uso e Política de Privacidade
              </h3>
              <p className="text-[11px] text-gray-400">
                Folha da Região • Versão 2.1 (Em conformidade com a LGPD e Marco Civil)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700 leading-relaxed">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#0056a4] shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900 leading-relaxed">
              <strong>Proteção de Dados:</strong> Seus dados de identificação pessoal (como CPF e CNPJ) são coletados exclusivamente para fins de segurança, autenticidade e prevenção a fraudes. <strong>Eles nunca serão divulgados publicamente</strong> no portal ou nos anúncios.
            </p>
          </div>

          <section className="space-y-2">
            <h4 className="font-black text-sm uppercase text-gray-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0056a4]" />
              1. Finalidade e Aceitação dos Termos
            </h4>
            <p>
              Ao cadastrar-se no portal <strong>Folha da Região</strong> e utilizar os serviços de publicação de classificados, notícias, comentários e publicidade, você concorda expressa e integralmente com as disposições estabelecidas neste documento, em observância à Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), ao Marco Civil da Internet (Lei nº 12.965/2014) e ao Código de Defesa do Consumidor.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-black text-sm uppercase text-gray-900">
              2. Cadastro e Responsabilidade pelo Conteúdo
            </h4>
            <p>
              O usuário declara que todas as informações prestadas no cadastro e nos anúncios são verídicas, completas e atualizadas. O anunciante é o <strong>único e exclusivo responsável civil e criminalmente</strong> pela procedência, qualidade, entrega, legalidade e veracidade dos produtos, serviços, veículos, imóveis e vagas de emprego anunciados.
            </p>
            <p>
              A Folha da Região atua como veículo de comunicação e divulgação e não se responsabiliza por negociações diretas realizadas entre anunciantes e compradores.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-black text-sm uppercase text-gray-900">
              3. Vedações e Conteúdos Proibidos
            </h4>
            <p>É terminantemente proibido publicar anúncios, comentários ou matérias que contenham:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Produtos ilegais, roubados, contrabandeados, armas de fogo ou substâncias ilícitas;</li>
              <li>Cópias não autorizadas, pirataria ou infração a direitos autorais e marcas;</li>
              <li>Conteúdo discriminatório, ofensivo, calunioso, difamatório ou difusão de fake news;</li>
              <li>Vagas de emprego falsas, esquemas de pirâmide financeira ou promessas enganosas;</li>
              <li>Dados pessoais de terceiros sem a devida autorização expressa.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="font-black text-sm uppercase text-gray-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              4. Moderação, Denúncias e Suspensão de Contas
            </h4>
            <p>
              A administração do portal reserva-se o direito de <strong>recusar, editar, pausar ou excluir</strong> qualquer anúncio que viole as diretrizes editoriais ou a legislação vigente, bem como <strong>suspender ou banir definitivamente</strong> a conta de usuários reincidentes, sem prejuízo da comunicação às autoridades competentes em casos de fraude ou crime.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-black text-sm uppercase text-gray-900">
              5. Tratamento de Dados Pessoais (LGPD)
            </h4>
            <p>
              Em conformidade com a LGPD, seus dados cadastrais são tratados de forma confidencial e com medidas técnicas adequadas de segurança. O titular dos dados possui o direito de solicitar a atualização, retificação ou exclusão de seus dados mediante contato direto com a equipe de privacidade do portal.
            </p>
          </section>
        </div>

        {/* Rodapé com Ação */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-500">
            Última atualização: Outubro de 2026
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
            {onAccept && (
              <button
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-5 py-2 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Li e Aceito os Termos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
