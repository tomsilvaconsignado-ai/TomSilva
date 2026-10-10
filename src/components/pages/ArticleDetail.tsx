import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Eye, Clock, MessageSquare, Send, Check, Bookmark, ThumbsUp, Play } from 'lucide-react';
import { Article, Comment, UserProfile, AdItem } from '../../types/database';
import { commentsService, newsService } from '../../lib/supabase';
import { ArticleCard, formatRelativeTime } from '../news/ArticleCard';
import { AdSlot } from '../news/AdSlot';

interface ArticleDetailProps {
  article: Article;
  allArticles: Article[];
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  articleAd?: AdItem;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({
  article,
  allArticles,
  currentUser,
  onOpenAuth,
  onBack,
  onSelectArticle,
  articleAd
}) => {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    // Rola para o topo ao abrir notícia
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Incrementa contagem de visualizações
    newsService.incrementViews(article.id);
    // Carrega comentários
    commentsService.getComments(article.id).then(setComments);
  }, [article.id]);

  const handleShare = (platform: 'whatsapp' | 'facebook' | 'twitter' | 'copy') => {
    const url = window.location.href;
    const title = article.title;

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} - ${url}`)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmittingComment(true);
    const created = await commentsService.addComment(article.id, newComment.trim(), currentUser);
    setComments([created, ...comments]);
    setNewComment('');
    setSubmittingComment(false);
  };

  const relatedArticles = allArticles
    .filter(a => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  const formattedDate = new Date(article.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl animate-in fade-in duration-300">
      {/* Botão Voltar & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-600 hover:text-[#0056a4] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar às Notícias
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <span>Tamanho do texto:</span>
          <button
            onClick={() => setFontSize('normal')}
            className={`px-2 py-0.5 rounded border text-[11px] cursor-pointer ${fontSize === 'normal' ? 'bg-[#0056a4] text-white border-[#0056a4]' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
          >
            A
          </button>
          <button
            onClick={() => setFontSize('large')}
            className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${fontSize === 'large' ? 'bg-[#0056a4] text-white border-[#0056a4]' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
          >
            A+
          </button>
          <button
            onClick={() => setFontSize('xlarge')}
            className={`px-2 py-0.5 rounded border text-sm cursor-pointer ${fontSize === 'xlarge' ? 'bg-[#0056a4] text-white border-[#0056a4]' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
          >
            A++
          </button>
        </div>
      </div>

      <article className="space-y-6">
        {/* Categoria Badge */}
        <div className="flex items-center gap-3">
          <span className="inline-block px-3 py-1 bg-[#0056a4] text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm">
            {article.category}
          </span>
          {article.isVideo && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded">
              <Play className="w-3 h-3 fill-current" /> Vídeo Exclusivo
            </span>
          )}
        </div>

        {/* Título Principal */}
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[1.15]">
          {article.title}
        </h1>

        {/* Subtítulo */}
        {article.subtitle && (
          <p className="text-base md:text-lg text-gray-600 leading-relaxed font-medium border-l-4 border-gray-200 pl-4 py-1">
            {article.subtitle}
          </p>
        )}

        {/* Metadados e Autor */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0056a4] text-white flex items-center justify-center font-black text-xs">
              FR
            </div>
            <div>
              <p className="font-bold text-gray-900">{article.author}</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{formattedDate} ({formatRelativeTime(article.createdAt)})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-gray-600">
              <Eye className="w-4 h-4 text-[#0056a4]" />
              {article.viewsCount} visualizações
            </span>

            <button
              onClick={() => setBookmarked(!bookmarked)}
              className={`p-1.5 rounded-full border transition-colors cursor-pointer ${bookmarked ? 'bg-amber-50 text-amber-600 border-amber-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              title={bookmarked ? 'Salvo' : 'Salvar notícia'}
            >
              <Bookmark className="w-4 h-4" />
            </button>

            <button
              onClick={() => setLiked(!liked)}
              className={`p-1.5 rounded-full border transition-colors cursor-pointer ${liked ? 'bg-red-50 text-red-600 border-red-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              title={liked ? 'Curtido' : 'Curtir'}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Imagem / Vídeo em Destaque */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-gray-100 bg-gray-900">
          {article.videoUrl && article.isVideo ? (
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${article.videoUrl.split('v=')[1] || ''}`}
                title={article.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          )}
        </div>

        {/* Barra de Compartilhamento Rápido */}
        <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 border border-gray-100">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-[#0056a4]" />
            Compartilhe esta notícia:
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShare('whatsapp')}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              WhatsApp
            </button>
            <button
              onClick={() => handleShare('facebook')}
              className="px-3 py-1.5 bg-[#1877f2] hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Facebook
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              X (Twitter)
            </button>
            <button
              onClick={() => handleShare('copy')}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : null}
              {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
          </div>
        </div>

        {/* Conteúdo Completo da Matéria */}
        <div
          className={`prose prose-lg max-w-none text-gray-800 leading-relaxed space-y-4 pt-4 ${
            fontSize === 'large' ? 'text-lg md:text-xl' : fontSize === 'xlarge' ? 'text-xl md:text-2xl' : 'text-base md:text-lg'
          }`}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Publicidade dentro da matéria */}
        {articleAd && (
          <div className="my-8 pt-4 border-t border-gray-100">
            <AdSlot ad={articleAd} />
          </div>
        )}
      </article>

      {/* Seção de Comentários */}
      <section className="mt-12 pt-8 border-t border-gray-200">
        <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#0056a4]" />
          Comentários dos Leitores ({comments.length})
        </h3>

        {/* Área de Comentar */}
        {currentUser ? (
          <form onSubmit={handleAddComment} className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.fullName}`}
                alt={currentUser.fullName}
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-xs font-bold text-gray-800">
                Comentando como <strong className="text-[#0056a4]">{currentUser.fullName}</strong>
              </span>
            </div>

            <textarea
              required
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Deixe sua opinião sobre esta notícia..."
              className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] focus:ring-2 focus:ring-[#0056a4]/10 resize-none"
            />

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="px-5 py-2 bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingComment ? 'Enviando...' : 'Publicar Comentário'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-6 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
            <p className="text-sm font-bold text-gray-800 mb-3">
              Deseja participar do debate e deixar seu comentário?
            </p>
            <button
              onClick={onOpenAuth}
              className="px-6 py-2.5 bg-[#0056a4] text-white font-black uppercase tracking-widest text-xs rounded-lg hover:bg-[#004482] transition-all shadow-md cursor-pointer"
            >
              Fazer Login ou Criar Conta Grátis
            </button>
          </div>
        )}

        {/* Lista de Comentários */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Seja o primeiro a comentar esta matéria!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={comment.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.userName}`}
                      alt={comment.userName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-bold text-xs text-gray-900">{comment.userName}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pl-8">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Notícias Relacionadas */}
      {relatedArticles.length > 0 && (
        <section className="mt-14 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-6 border-l-4 border-[#0056a4] pl-3">
            Notícias Relacionadas em {article.category}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((rel) => (
              <ArticleCard
                key={rel.id}
                article={rel}
                variant="secondary"
                onSelectArticle={onSelectArticle}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
