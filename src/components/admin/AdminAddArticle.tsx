import React, { useState, useRef } from 'react';
import { 
  Upload, Trash2, RefreshCw, Eye, CheckCircle2, AlertCircle, 
  FileText, ArrowLeft, Image as ImageIcon, Bold, Italic, 
  Heading2, List, Quote, Sparkles, Send, Save, Info
} from 'lucide-react';
import { Article, ArticleStatus, UserProfile } from '../../types/database';
import { newsService } from '../../lib/supabase';
import { INITIAL_CATEGORIES } from '../../data/initialData';

interface AdminAddArticleProps {
  currentUser: UserProfile;
  editingArticle?: Article | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminAddArticle: React.FC<AdminAddArticleProps> = ({
  currentUser,
  editingArticle,
  onSuccess,
  onCancel
}) => {
  // Categorias disponíveis do portal (excluindo 'Início' e 'Classificados')
  const availableCategories = INITIAL_CATEGORIES
    .filter(c => c.slug !== 'todos' && c.slug !== 'classificados')
    .map(c => c.name);

  // Estados dos campos
  const [title, setTitle] = useState(editingArticle?.title || '');
  const [subtitle, setSubtitle] = useState(editingArticle?.subtitle || '');
  const [category, setCategory] = useState(editingArticle?.category || availableCategories[0] || 'Política');
  const [imageUrl, setImageUrl] = useState(editingArticle?.imageUrl || '');
  const [content, setContent] = useState(
    editingArticle?.content || '<p>Escreva aqui o texto completo da matéria...</p>'
  );
  const [author, setAuthor] = useState(editingArticle?.author || currentUser.fullName || 'Redação Folha da Região');
  const [status, setStatus] = useState<ArticleStatus>(editingArticle?.status || 'published');
  
  // Destaques especiais
  const [isHero, setIsHero] = useState(Boolean(editingArticle?.isHero));
  const [isSecondary, setIsSecondary] = useState(Boolean(editingArticle?.isSecondary));
  const [isVideo, setIsVideo] = useState(Boolean(editingArticle?.isVideo));
  const [videoUrl, setVideoUrl] = useState(editingArticle?.videoUrl || '');

  // Estados de controle e feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageRatioNotice, setImageRatioNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Manipulação de Upload de Imagem local para Base64
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setImageRatioNotice(null);

    // Validação de formato (JPG, JPEG, PNG, WEBP)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato não aceito. Por favor, envie uma imagem nos formatos JPG, JPEG ou PNG.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validação de tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('O arquivo selecionado ultrapassa o limite de 5MB. Reduza o tamanho da imagem.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Leitura permanente Base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUrl(result);

      // Checa proporção aproximada da imagem (16:9 ideal)
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        // 16:9 é ~1.77
        if (ratio < 1.3) {
          setImageRatioNotice('Dica: Esta imagem é vertical ou quadrada. Imagens horizontais (proporção 16:9) têm melhor destaque no portal.');
        } else {
          setImageRatioNotice('Excelente! A imagem possui boa proporção horizontal para as manchetes.');
        }
      };
      img.src = result;
    };
    reader.onerror = () => {
      setError('Falha ao processar o arquivo de imagem.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImageRatioNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Ferramentas de formatação rápida do conteúdo
  const insertFormatting = (tagStart: string, tagEnd: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = tagStart + (selectedText || 'texto') + tagEnd;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagStart.length, start + tagStart.length + (selectedText.length || 5));
    }, 50);
  };

  // Salvar rascunho ou Publicar
  const handleSave = async (targetStatus: ArticleStatus) => {
    setError(null);
    setSuccessNotice(null);

    // Validações
    if (!title.trim()) {
      setError('O título da notícia é obrigatório.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!category.trim()) {
      setError('Selecione uma categoria para a notícia.');
      return;
    }
    if (!content.trim() || content === '<p></p>') {
      setError('O conteúdo da notícia não pode ficar vazio.');
      return;
    }
    if (!imageUrl.trim()) {
      setError('Envie a imagem principal da notícia para ilustrar a matéria.');
      return;
    }

    setLoading(true);

    try {
      const saved = await newsService.saveArticle({
        id: editingArticle?.id,
        title: title.trim(),
        subtitle: subtitle.trim(),
        slug: editingArticle?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        content: content.trim(),
        category,
        imageUrl: imageUrl.trim(),
        videoUrl: videoUrl.trim() || undefined,
        isVideo: isVideo || Boolean(videoUrl.trim()),
        isHero,
        isSecondary,
        author: author.trim() || 'Redação Folha da Região',
        status: targetStatus
      });

      setStatus(targetStatus);
      setSuccessNotice(
        targetStatus === 'published' 
          ? 'Notícia publicada com sucesso no portal!' 
          : 'Rascunho salvo com sucesso! Você pode continuar editando.'
      );

      // Aguarda 1s para o usuário visualizar o aviso e chama onSuccess
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar a notícia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Barra de Topo da Tela */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            title="Voltar à lista de notícias"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              {editingArticle ? 'Editar Notícia' : 'Adicionar Notícia'}
            </h2>
            <p className="text-xs text-gray-500">
              Preencha os campos abaixo de forma simples e intuitiva para publicar no portal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#0056a4]" />
            Visualizar Notícia
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-start gap-3 shadow-xs animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <strong className="font-bold">Atenção ao preencher:</strong>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-bold">{successNotice}</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSave('published'); }} className="space-y-6">
        {/* =======================================================
            ETAPA 1 — CONTEÚDO DA NOTÍCIA
        ======================================================= */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
            <span className="w-7 h-7 rounded-lg bg-[#0056a4] text-white flex items-center justify-center font-black text-xs">
              1
            </span>
            <div>
              <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
                Etapa 1 — Conteúdo da Notícia
              </h3>
              <p className="text-xs text-gray-400">
                Informações principais da matéria que serão apresentadas aos leitores.
              </p>
            </div>
          </div>

          {/* 1. Título da Notícia */}
          <div>
            <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
              1. Título da Notícia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite um título claro, chamativo e informativo"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Dica: Títulos com 60 a 90 caracteres costumam ter melhor leitura e engajamento.
            </p>
          </div>

          {/* 2. Subtítulo */}
          <div>
            <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
              2. Subtítulo (Linha Fina / Complemento)
            </label>
            <textarea
              rows={2}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Complemente o título com informações adicionais que contextualizam a matéria"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all resize-y"
            />
          </div>

          {/* 3. Categoria & Autor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                3. Categoria <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                A notícia será listada na editoria selecionada do portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-1.5">
                6. Autor ou Fonte da Informação
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: Redação Folha da Região / Agência Brasil"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Destaque Visual no Portal */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap gap-6 items-center">
            <span className="text-xs font-bold text-gray-700">Destaque na Página Inicial:</span>
            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isHero}
                onChange={(e) => {
                  setIsHero(e.target.checked);
                  if (e.target.checked) setIsSecondary(false);
                }}
                className="rounded text-[#0056a4] focus:ring-[#0056a4]"
              />
              <span>Manchete Principal (Super Destaque)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isSecondary}
                onChange={(e) => {
                  setIsSecondary(e.target.checked);
                  if (e.target.checked) setIsHero(false);
                }}
                className="rounded text-[#0056a4] focus:ring-[#0056a4]"
              />
              <span>Destaque Secundário (Topo Lateral)</span>
            </label>
          </div>

          {/* 5. Conteúdo da Notícia (Editor de Texto) */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider">
                5. Conteúdo da Notícia <span className="text-red-500">*</span>
              </label>
              {/* Barra de Formatação Rápida */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => insertFormatting('<p>', '</p>')}
                  className="px-2 py-1 hover:bg-white rounded text-[11px] font-bold text-gray-700 transition-colors"
                  title="Parágrafo"
                >
                  &para; Parágrafo
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<strong>', '</strong>')}
                  className="p-1 hover:bg-white rounded text-gray-700 transition-colors"
                  title="Negrito"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<em>', '</em>')}
                  className="p-1 hover:bg-white rounded text-gray-700 transition-colors"
                  title="Itálico"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<h3>', '</h3>')}
                  className="p-1 hover:bg-white rounded text-gray-700 transition-colors"
                  title="Subtítulo H3"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<blockquote>', '</blockquote>')}
                  className="p-1 hover:bg-white rounded text-gray-700 transition-colors"
                  title="Citação"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                  className="p-1 hover:bg-white rounded text-gray-700 transition-colors"
                  title="Lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              ref={contentTextareaRef}
              required
              rows={9}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite o texto da notícia. Você pode utilizar parágrafos simples ou formatação HTML básica."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm font-sans focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Vídeo opcional */}
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={isVideo}
                onChange={(e) => setIsVideo(e.target.checked)}
                className="rounded text-[#0056a4] focus:ring-[#0056a4]"
              />
              <span>Esta notícia possui vídeo incorporado (YouTube / MP4)</span>
            </label>
            {isVideo && (
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
              />
            )}
          </div>
        </div>

        {/* =======================================================
            ETAPA 2 — IMAGEM DA NOTÍCIA
        ======================================================= */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
            <span className="w-7 h-7 rounded-lg bg-[#0056a4] text-white flex items-center justify-center font-black text-xs">
              2
            </span>
            <div>
              <h3 className="font-black text-base text-gray-900 uppercase tracking-tight">
                Etapa 2 — Imagem da Notícia
              </h3>
              <p className="text-xs text-gray-400">
                Selecione a fotografia principal que ilustrará a matéria na capa e no artigo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Campo e Ações de Imagem (7 colunas) */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 tracking-wider mb-2">
                  4. Enviar Imagem do seu Computador ou Celular <span className="text-red-500">*</span>
                </label>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    id="article-image-upload"
                  />
                  <label
                    htmlFor="article-image-upload"
                    className="px-5 py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Selecionar Imagem do Computador
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remover Imagem
                    </button>
                  )}
                </div>
              </div>

              {/* Opção alternativa: Link de Imagem */}
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Ou digite a URL da Imagem:
                </span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-noticia.jpg"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
                />
              </div>

              {/* Prévia da Imagem */}
              {imageUrl ? (
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-gray-700">
                    Prévia da Imagem Selecionada:
                  </span>
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 shadow-md group">
                    <img
                      src={imageUrl}
                      alt="Prévia da Notícia"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        htmlFor="article-image-upload"
                        className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-100"
                      >
                        Substituir Foto
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                  <ImageIcon className="w-10 h-10 mb-2 text-gray-300" />
                  <p className="text-xs font-bold text-gray-600">Nenhuma imagem selecionada ainda</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Envie uma foto para pré-visualizar aqui antes de publicar
                  </p>
                </div>
              )}

              {/* Notificação amigável de proporção */}
              {imageRatioNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#0056a4] shrink-0" />
                  <span>{imageRatioNotice}</span>
                </div>
              )}
            </div>

            {/* Painel de Instruções Claras (5 colunas) */}
            <div className="lg:col-span-5 bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#0056a4]" />
                Instruções para Imagens
              </h4>

              <ul className="space-y-2 text-xs text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Formatos aceitos:</strong> JPG, JPEG e PNG.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Recomendação:</strong> utilize uma imagem horizontal, nítida e diretamente relacionada ao fato noticiado.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Proporção ideal:</strong> aproximadamente <strong>16:9</strong> (horizontal panorâmica).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Tamanho máximo do arquivo:</strong> até <strong>5MB</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Substituição simples:</strong> você pode trocar a imagem a qualquer momento com apenas 1 clique.</span>
                </li>
              </ul>

              <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-500">
                Não é necessário calcular dimensões técnicas em pixels; nosso portal adapta automaticamente o corte para celular e computador.
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            ETAPA 3 — BOTÕES DE AÇÃO
        ======================================================= */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase text-gray-500 tracking-wider">
              Situação Atual:
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
              status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {status === 'published' ? 'Publicada' : 'Rascunho'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Ação 1: Salvar Rascunho */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave('draft')}
              className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-gray-600" />
              Salvar como Rascunho
            </button>

            {/* Ação 2: Visualizar Notícia */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-[#0056a4] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Visualizar Notícia
            </button>

            {/* Ação 3: Publicar Notícia */}
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publicar Notícia
            </button>
          </div>
        </div>
      </form>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DA NOTÍCIA */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <img
                  src="/vetor.svg"
                  alt="Folha da Região"
                  className="h-7 w-auto max-w-[180px] object-contain bg-white/10 px-2 py-0.5 rounded"
                />
                <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                  Pré-visualização da Matéria
                </span>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar Prévia
              </button>
            </div>

            <div className="p-6 md:p-10 overflow-y-auto space-y-6">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-[#0056a4] text-white text-[10px] font-black uppercase tracking-widest rounded">
                  {category}
                </span>
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">
                  {title || 'Título da Notícia Não Informado'}
                </h1>
                {subtitle && (
                  <p className="text-base text-gray-600 font-medium leading-relaxed border-l-4 border-gray-200 pl-4 py-1">
                    {subtitle}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
                  <span>Por <strong>{author}</strong></span>
                  <span>•</span>
                  <span>Publicado em {new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {imageUrl && (
                <div className="rounded-2xl overflow-hidden shadow-md bg-gray-900 max-h-[480px]">
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div 
                className="prose prose-lg max-w-none text-gray-800 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
