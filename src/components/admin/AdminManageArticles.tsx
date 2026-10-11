import React, { useState } from 'react';
import { 
  Search, Filter, Edit2, Trash2, Eye, Plus, Calendar, 
  User, CheckCircle2, Clock, AlertTriangle, X 
} from 'lucide-react';
import { Article, ArticleStatus, CategoryItem } from '../../types/database';
import { newsService } from '../../lib/supabase';
import { INITIAL_CATEGORIES } from '../../data/initialData';
import { sanitizeHtml } from '../../lib/assets';

interface AdminManageArticlesProps {
  articles: Article[];
  onRefreshData: () => void;
  onEditArticle: (article: Article) => void;
  onAddNewArticle: () => void;
}

export const AdminManageArticles: React.FC<AdminManageArticlesProps> = ({
  articles,
  onRefreshData,
  onEditArticle,
  onAddNewArticle
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');
  
  // Confirmação de exclusão
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal de visualização rápida
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);

  const availableCategories = INITIAL_CATEGORIES
    .filter(c => c.slug !== 'todos' && c.slug !== 'classificados')
    .map(c => c.name);

  // Filtragem de notícias
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.subtitle && article.subtitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'todas' || article.category === selectedCategory;
    
    const articleStatus: ArticleStatus = article.status || 'published';
    const matchesStatus = selectedStatus === 'all' || articleStatus === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const confirmDelete = async () => {
    if (!articleToDelete) return;
    setIsDeleting(true);
    try {
      await newsService.deleteArticle(articleToDelete.id);
      setArticleToDelete(null);
      onRefreshData();
    } catch (err) {
      console.error('Erro ao excluir notícia', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho da Seção com Botão de Adicionar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
            Gerenciar Notícias
          </h2>
          <p className="text-xs text-gray-500">
            Total de <strong>{articles.length}</strong> matérias registradas no portal.
          </p>
        </div>

        <button
          onClick={onAddNewArticle}
          className="px-5 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Notícia
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Campo de Busca por Título */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar notícia por título ou palavra-chave..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtro por Categoria */}
        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none cursor-pointer"
          >
            <option value="todas">Todas as Categorias</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Situação (Publicada ou Rascunho) */}
        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#0056a4] focus:bg-white outline-none cursor-pointer"
          >
            <option value="all">Todas as Situações</option>
            <option value="published">Somente Publicadas</option>
            <option value="draft">Somente Rascunhos</option>
          </select>
        </div>
      </div>

      {/* Lista Organizada de Notícias */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <Filter className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-bold text-gray-600">Nenhuma notícia encontrada com os filtros selecionados.</p>
            <p className="text-xs text-gray-400">Tente buscar por outro termo ou limpe os filtros para visualizar todas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                  <th className="py-3.5 px-4">Notícia</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Autor</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Situação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredArticles.map((art) => {
                  const artStatus: ArticleStatus = art.status || 'published';
                  return (
                    <tr key={art.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Miniatura & Título */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 max-w-md">
                          <img
                            src={art.imageUrl}
                            alt={art.title}
                            className="w-16 h-12 rounded-lg object-cover bg-gray-100 shrink-0 border border-gray-200"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 line-clamp-2 leading-snug">
                              {art.title}
                            </p>
                            {art.isHero && (
                              <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                ★ Super Manchete
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-[10px] font-black uppercase tracking-wide rounded-md">
                          {art.category}
                        </span>
                      </td>

                      {/* Autor */}
                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {art.author || 'Redação Folha da Região'}
                      </td>

                      {/* Data de Publicação */}
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(art.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Situação: Publicada ou Rascunho */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {artStatus === 'published' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Publicada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Rascunho
                          </span>
                        )}
                      </td>

                      {/* Ações: Editar, Visualizar e Excluir */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingArticle(art)}
                            className="p-1.5 text-gray-500 hover:text-[#0056a4] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Notícia"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditArticle(art)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar Notícia"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setArticleToDelete(art)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Notícia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {articleToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black uppercase text-gray-900 tracking-tight">
                Confirmar Exclusão de Notícia
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Tem certeza que deseja excluir permanentemente a matéria:
              </p>
              <p className="text-xs font-bold text-gray-800 mt-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                "{articleToDelete.title}"
              </p>
              <p className="text-[11px] text-red-600 mt-2">
                Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setArticleToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO RÁPIDA */}
      {viewingArticle && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#0056a4] text-white text-[10px] font-black uppercase rounded">
                  {viewingArticle.category}
                </span>
                <span className="text-xs font-bold text-gray-300">
                  Visualização da Notícia
                </span>
              </div>
              <button
                onClick={() => setViewingArticle(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-4">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                {viewingArticle.title}
              </h1>
              {viewingArticle.subtitle && (
                <p className="text-sm text-gray-600 font-medium leading-relaxed border-l-4 border-gray-200 pl-3">
                  {viewingArticle.subtitle}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Por <strong>{viewingArticle.author}</strong></span>
                <span>•</span>
                <span>{new Date(viewingArticle.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>

              {viewingArticle.imageUrl && (
                <div className="rounded-xl overflow-hidden bg-gray-900 max-h-[360px]">
                  <img
                    src={viewingArticle.imageUrl}
                    alt={viewingArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div 
                className="prose prose-sm max-w-none text-gray-800 leading-relaxed pt-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewingArticle.content) }}
              />
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  const art = viewingArticle;
                  setViewingArticle(null);
                  onEditArticle(art);
                }}
                className="px-4 py-2 bg-[#0056a4] text-white text-xs font-bold rounded-xl hover:bg-[#004482] transition-colors cursor-pointer"
              >
                Editar Esta Matéria
              </button>
              <button
                onClick={() => setViewingArticle(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
