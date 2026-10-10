import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, SlidersHorizontal, MapPin, X, ArrowUpDown, 
  ShoppingBag, Briefcase, UserCheck, ShieldCheck, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { ClassifiedItem, ClassifiedSection, ClassifiedType, UserProfile, ClassifiedCategory } from '../../types/database';
import { classifiedsService } from '../../lib/supabase';
import { ClassifiedCard } from './ClassifiedCard';

interface ClassifiedListProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenCreateModal: () => void;
  onOpenMyClassifieds: () => void;
  onSelectClassified: (item: ClassifiedItem) => void;
}

export const ClassifiedList: React.FC<ClassifiedListProps> = ({
  currentUser,
  onOpenAuth,
  onOpenCreateModal,
  onOpenMyClassifieds,
  onSelectClassified
}) => {
  const [activeSection, setActiveSection] = useState<'todos' | ClassifiedSection>('todos');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedCity, setSelectedCity] = useState('todas');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [items, setItems] = useState<ClassifiedItem[]>([]);
  const [categories, setCategories] = useState<ClassifiedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadData = async () => {
    setLoading(true);
    const [fetchedItems, fetchedCats] = await Promise.all([
      classifiedsService.getClassifieds({
        section: activeSection === 'todos' ? undefined : activeSection,
        category: selectedCategory === 'todas' ? undefined : selectedCategory,
        type: selectedType === 'todos' ? undefined : (selectedType as ClassifiedType),
        city: selectedCity === 'todas' ? undefined : selectedCity,
        search: search.trim() || undefined,
        sortBy
      }),
      classifiedsService.getCategories(activeSection === 'todos' ? undefined : activeSection)
    ]);

    // Filtro adicional de faixa de preço se preenchido
    let filtered = fetchedItems;
    if (minPrice) {
      const min = parseFloat(minPrice);
      filtered = filtered.filter(i => (i.price || 0) >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      filtered = filtered.filter(i => (i.price || 0) <= max);
    }

    setItems(filtered);
    setCategories(fetchedCats);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    setCurrentPage(1);

    const handleUpdate = () => loadData();
    window.addEventListener('folha_classifieds_updated', handleUpdate);
    return () => window.removeEventListener('folha_classifieds_updated', handleUpdate);
  }, [activeSection, selectedCategory, selectedType, selectedCity, sortBy, minPrice, maxPrice]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('todas');
    setSelectedType('todos');
    setSelectedCity('todas');
    setSortBy('recent');
    setMinPrice('');
    setMaxPrice('');
    setActiveSection('todos');
  };

  // Cidades comuns para filtro
  const cities = ['todas', 'Estância', 'Aracaju', 'Lagarto', 'Itabaiana', 'Boquim', 'Nossa Senhora do Socorro'];

  // Paginação
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePublishClick = () => {
    if (!currentUser) {
      onOpenAuth();
    } else {
      onOpenCreateModal();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Banner de Topo dos Classificados */}
      <div className="bg-gradient-to-r from-gray-900 via-[#0056a4] to-gray-900 rounded-2xl p-6 md:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block">
              Balcão de Negócios & Oportunidades
            </span>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight">
              Classificados Folha da Região
            </h1>
            <p className="text-xs md:text-sm text-gray-200 mt-2 leading-relaxed">
              Compre, venda, alugue e encontre oportunidades de trabalho em Estância e em todo o estado de Sergipe com credibilidade e segurança.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {currentUser && (
              <button
                onClick={onOpenMyClassifieds}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all backdrop-blur-xs border border-white/20 cursor-pointer"
              >
                Meus Classificados
              </button>
            )}

            <button
              onClick={handlePublishClick}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Publicar Anúncio Grátis
            </button>
          </div>
        </div>
      </div>

      {/* 1. Três Seções Principais (Tabs) */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        <button
          onClick={() => { setActiveSection('todos'); setSelectedCategory('todas'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'todos'
              ? 'bg-[#0056a4] text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Todas as Modalidades
        </button>

        <button
          onClick={() => { setActiveSection('produtos_servicos'); setSelectedCategory('todas'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'produtos_servicos'
              ? 'bg-[#0056a4] text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Produtos e Serviços
        </button>

        <button
          onClick={() => { setActiveSection('vagas_emprego'); setSelectedCategory('todas'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'vagas_emprego'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Vagas de Emprego
        </button>

        <button
          onClick={() => { setActiveSection('procuro_emprego'); setSelectedCategory('todas'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeSection === 'procuro_emprego'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Procuro Trabalho / Serviços
        </button>
      </div>

      {/* 2. Barra de Busca e Botão de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs mb-6 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Pesquisar por produto, veículo, vaga de emprego ou profissional..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0056a4] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Buscar
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 border rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
          </button>
        </form>

        {/* Painel Expansível de Filtros */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-in fade-in">
            {/* Categoria */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
              >
                <option value="todas">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Tipo de Anúncio
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
              >
                <option value="todos">Todos os tipos</option>
                <option value="vendo">Vendo</option>
                <option value="compro">Compro</option>
                <option value="alugo">Alugo</option>
                <option value="ofereco_servico">Ofereço Serviço</option>
                <option value="ofereco_vaga">Vaga de Emprego</option>
                <option value="procuro_emprego">Procuro Emprego</option>
              </select>
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Cidade
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none capitalize"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city === 'todas' ? 'Todas as Cidades' : city}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenação */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
              >
                <option value="recent">Mais Recentes</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
              </select>
            </div>

            {/* Limpar Filtros */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-colors cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Indicador de Contagem e Lista de Resultados */}
      <div className="flex justify-between items-center mb-4 text-xs text-gray-500 font-bold">
        <span>
          Exibindo <strong>{items.length}</strong> anúncio(s) cadastrado(s)
        </span>

        {(selectedCategory !== 'todas' || selectedCity !== 'todas' || search) && (
          <button
            onClick={handleClearFilters}
            className="text-[#0056a4] hover:underline cursor-pointer uppercase text-[11px]"
          >
            Limpar Busca
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-sm font-bold">Carregando classificados...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-black text-gray-800 uppercase">Nenhum anúncio encontrado</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Não encontramos publicações para os filtros selecionados. Tente buscar por outros termos ou limpe os filtros.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg cursor-pointer"
            >
              Ver Todos os Anúncios
            </button>
            <button
              onClick={handlePublishClick}
              className="px-4 py-2 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Publicar Agora
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Grid de Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {paginatedItems.map((item) => (
              <ClassifiedCard
                key={item.id}
                classified={item}
                onSelect={onSelectClassified}
              />
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4 border-t border-gray-100">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-gray-700 px-3">
                Página {currentPage} de {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* 4. Dicas de Segurança e Prevenção de Abusos (Item 9) */}
      <div className="mt-16 bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-200/80">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-[#0056a4]" />
          <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">
            Regras de Publicação e Prevenção de Golpes
          </h3>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed mb-4">
          O portal <strong>Folha da Região</strong> atua como canal comunitário de conexão e não participa de transações financeiras entre anunciantes e compradores.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-700">
          <div className="p-3 bg-white rounded-xl border border-gray-200">
            <strong className="text-gray-900 block mb-1">🚫 Sem Pagamento Antecipado</strong>
            Nunca efetue Pix ou depósitos antecipados sem antes ver pessoalmente o produto anunciado.
          </div>
          <div className="p-3 bg-white rounded-xl border border-gray-200">
            <strong className="text-gray-900 block mb-1">🏢 Vagas de Emprego Transparentes</strong>
            São terminantemente proibidas cobranças de taxas de inscrição ou materiais para processos seletivos.
          </div>
          <div className="p-3 bg-white rounded-xl border border-gray-200">
            <strong className="text-gray-900 block mb-1">🚨 Notou algo suspeito?</strong>
            Utilize o botão de denúncia em qualquer anúncio para acionar imediatamente a equipe de moderação.
          </div>
        </div>
      </div>
    </div>
  );
};
