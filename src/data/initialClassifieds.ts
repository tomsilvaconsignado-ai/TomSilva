import { ClassifiedCategory, ClassifiedItem, ClassifiedsSettings } from '../types/database';

export const DEFAULT_CLASSIFIEDS_SETTINGS: ClassifiedsSettings = {
  requireApproval: true, // Aprovação prévia ativada por padrão conforme solicitado
  defaultValidityDays: 30
};

export const INITIAL_CLASSIFIED_CATEGORIES: ClassifiedCategory[] = [
  // PRODUTOS E SERVIÇOS
  { id: 'cat-prod-1', name: 'Veículos e motos', section: 'produtos_servicos' },
  { id: 'cat-prod-2', name: 'Imóveis para venda', section: 'produtos_servicos' },
  { id: 'cat-prod-3', name: 'Imóveis para aluguel', section: 'produtos_servicos' },
  { id: 'cat-prod-4', name: 'Celulares e eletrônicos', section: 'produtos_servicos' },
  { id: 'cat-prod-5', name: 'Móveis e eletrodomésticos', section: 'produtos_servicos' },
  { id: 'cat-prod-6', name: 'Informática', section: 'produtos_servicos' },
  { id: 'cat-prod-7', name: 'Moda e acessórios', section: 'produtos_servicos' },
  { id: 'cat-prod-8', name: 'Casa e construção', section: 'produtos_servicos' },
  { id: 'cat-prod-9', name: 'Serviços profissionais', section: 'produtos_servicos' },
  { id: 'cat-prod-10', name: 'Outros produtos e serviços', section: 'produtos_servicos' },

  // EMPREGOS E OPORTUNIDADES (Vagas)
  { id: 'cat-vaga-1', name: 'Administração e escritório', section: 'vagas_emprego' },
  { id: 'cat-vaga-2', name: 'Comércio e vendas', section: 'vagas_emprego' },
  { id: 'cat-vaga-3', name: 'Saúde', section: 'vagas_emprego' },
  { id: 'cat-vaga-4', name: 'Educação', section: 'vagas_emprego' },
  { id: 'cat-vaga-5', name: 'Tecnologia', section: 'vagas_emprego' },
  { id: 'cat-vaga-6', name: 'Serviços gerais', section: 'vagas_emprego' },
  { id: 'cat-vaga-7', name: 'Construção civil', section: 'vagas_emprego' },
  { id: 'cat-vaga-8', name: 'Transporte e logística', section: 'vagas_emprego' },
  { id: 'cat-vaga-9', name: 'Estágio e jovem aprendiz', section: 'vagas_emprego' },
  { id: 'cat-vaga-10', name: 'Trabalho autônomo', section: 'vagas_emprego' },
  { id: 'cat-vaga-11', name: 'Outras oportunidades', section: 'vagas_emprego' },

  // PROCURO EMPREGO
  { id: 'cat-cand-1', name: 'Administração e escritório', section: 'procuro_emprego' },
  { id: 'cat-cand-2', name: 'Comércio e vendas', section: 'procuro_emprego' },
  { id: 'cat-cand-3', name: 'Saúde', section: 'procuro_emprego' },
  { id: 'cat-cand-4', name: 'Educação', section: 'procuro_emprego' },
  { id: 'cat-cand-5', name: 'Tecnologia', section: 'procuro_emprego' },
  { id: 'cat-cand-6', name: 'Serviços gerais', section: 'procuro_emprego' },
  { id: 'cat-cand-7', name: 'Construção civil', section: 'procuro_emprego' },
  { id: 'cat-cand-8', name: 'Transporte e logística', section: 'procuro_emprego' },
  { id: 'cat-cand-9', name: 'Estágio e jovem aprendiz', section: 'procuro_emprego' },
  { id: 'cat-cand-10', name: 'Trabalho autônomo', section: 'procuro_emprego' },
  { id: 'cat-cand-11', name: 'Outras oportunidades', section: 'procuro_emprego' },
];

export const INITIAL_CLASSIFIEDS: ClassifiedItem[] = [
  // 1. PRODUTO: Veículo em Estância
  {
    id: 'clf-1',
    code: 'CL-8101',
    userId: 'user-admin-1',
    section: 'produtos_servicos',
    type: 'vendo',
    category: 'Veículos e motos',
    title: 'Honda Civic LXS 1.8 Automático 2014 Impecável',
    slug: 'honda-civic-lxs-1-8-automatico-2014-impecavel-cl-8101',
    description: 'Veículo de único dono, revisões em dia na concessionária, 4 pneus novos, ar-condicionado digital, bancos em couro, câmera de ré. IPVA 2026 pago. Documentação 100% pronta para transferência.',
    priceType: 'fixed',
    price: 58500,
    city: 'Estância',
    state: 'SE',
    advertiserName: 'Marcos Oliveira',
    phone: '79999112233',
    images: [
      'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&h=600&fit=crop'
    ],
    status: 'published',
    viewsCount: 230,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString()
  },
  // 2. PRODUTO: Imóvel para Venda
  {
    id: 'clf-2',
    code: 'CL-8102',
    userId: 'user-admin-1',
    section: 'produtos_servicos',
    type: 'vendo',
    category: 'Imóveis para venda',
    title: 'Casa Residencial com 3 Quartos e Piscina no Bairro Santa Cruz',
    slug: 'casa-residencial-com-3-quartos-e-piscina-bairro-santa-cruz-cl-8102',
    description: 'Excelente casa ampla com 3 quartos (1 suíte), sala de estar e jantar integradas, cozinha planejada, área gourmet com churrasqueira e piscina privativa. Garagem para 2 veículos. Ótima localização próxima ao centro.',
    priceType: 'fixed',
    price: 290000,
    city: 'Estância',
    state: 'SE',
    advertiserName: 'Imobiliária Regional',
    phone: '79999776199',
    images: [
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'
    ],
    status: 'published',
    viewsCount: 412,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 27 * 24 * 3600 * 1000).toISOString()
  },
  // 3. VAGA DE EMPREGO
  {
    id: 'clf-3',
    code: 'CL-8103',
    userId: 'user-admin-1',
    section: 'vagas_emprego',
    type: 'ofereco_vaga',
    category: 'Comércio e vendas',
    title: 'Vaga: Vendedor(a) Interno e Atendimento ao Cliente',
    slug: 'vaga-vendedor-interno-e-atendimento-ao-cliente-cl-8103',
    description: 'Empresa do ramo de comércio em Estância contrata profissional dinâmico para atendimento balcão, prospecção e pós-venda. Oferecemos salário fixo + comissão por metas atingidas + vale alimentação.',
    priceType: 'negotiable',
    city: 'Estância',
    state: 'SE',
    advertiserName: 'Comercial Silva & Filhos',
    phone: '79999445566',
    images: [
      'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=800&h=600&fit=crop'
    ],
    jobRole: 'Vendedor Interno',
    jobArea: 'Vendas / Varejo',
    contractType: 'CLT',
    workload: 'Integral',
    experience: 'Mínimo de 6 meses na área comercial',
    requirements: 'Ensino Médio completo, boa comunicação, conhecimento básico de informática e residir em Estância.',
    status: 'published',
    viewsCount: 310,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 29 * 24 * 3600 * 1000).toISOString()
  },
  // 4. VAGA DE EMPREGO: Tecnologia / Suporte
  {
    id: 'clf-4',
    code: 'CL-8104',
    userId: 'user-admin-1',
    section: 'vagas_emprego',
    type: 'ofereco_vaga',
    category: 'Tecnologia',
    title: 'Vaga: Técnico de Suporte de TI e Redes',
    slug: 'vaga-tecnico-de-suporte-de-ti-e-redes-cl-8104',
    description: 'Provedor de internet e serviços digitais contrata técnico para manutenção de redes, configuração de roteadores e atendimento a clientes corporativos.',
    priceType: 'fixed',
    price: 2200,
    city: 'Aracaju',
    state: 'SE',
    advertiserName: 'Sergipe Conecta TI',
    phone: '79998877665',
    images: [
      'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800&h=600&fit=crop'
    ],
    jobRole: 'Técnico de Suporte',
    jobArea: 'Tecnologia da Informação',
    contractType: 'CLT',
    workload: 'Integral',
    experience: 'Desejável experiência com fibra óptica e redes TCP/IP',
    requirements: 'CNH categoria B, curso técnico ou superior em andamento na área de TI.',
    status: 'published',
    viewsCount: 189,
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 26 * 24 * 3600 * 1000).toISOString()
  },
  // 5. PROCURO EMPREGO
  {
    id: 'clf-5',
    code: 'CL-8105',
    userId: 'user-reader-1',
    section: 'procuro_emprego',
    type: 'procuro_emprego',
    category: 'Construção civil',
    title: 'Eletricista Residencial e Predial com 10 Anos de Experiência',
    slug: 'eletricista-residencial-e-predial-com-10-anos-de-experiencia-cl-8105',
    description: 'Profissional qualificado com certificado NR-10. Realizo instalações elétricas completas, reparos em quadros de distribuição, padrão de energia Energisa, iluminação LED e manutenção preventiva em residências e comércios.',
    priceType: 'negotiable',
    city: 'Estância',
    state: 'SE',
    advertiserName: 'José Carlos dos Santos',
    phone: '79999881122',
    images: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop'
    ],
    jobRole: 'Eletricista',
    jobArea: 'Construção e Manutenção',
    contractType: 'Freelancer',
    workload: 'Flexível',
    experience: '10 anos de atuação no sul sergipano',
    requirements: 'Disponibilidade imediata e ferramentas próprias.',
    status: 'published',
    viewsCount: 145,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString()
  },
  // 6. PROCURO EMPREGO: Administração
  {
    id: 'clf-6',
    code: 'CL-8106',
    userId: 'user-reader-1',
    section: 'procuro_emprego',
    type: 'procuro_emprego',
    category: 'Administração e escritório',
    title: 'Auxiliar Administrativa e Financeira - Graduada em Gestão',
    slug: 'auxiliar-administrativa-e-financeira-graduada-em-gestao-cl-8106',
    description: 'Procuro oportunidade nas áreas de recepção, contas a pagar/receber, emissão de notas fiscais ou rotinas de escritório. Domínio do pacote Office (Excel intermediário/avançado) e boa comunicação.',
    priceType: 'negotiable',
    city: 'Estância',
    state: 'SE',
    advertiserName: 'Ana Beatriz Souza',
    phone: '79998123456',
    images: [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=600&fit=crop'
    ],
    jobRole: 'Assistente Administrativa',
    jobArea: 'Administração / Finanças',
    contractType: 'CLT',
    workload: 'Integral',
    experience: '2 anos em escritório contábil e recepção clínica',
    requirements: 'Ensino Superior Completo em Administração.',
    status: 'published',
    viewsCount: 167,
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 24 * 24 * 3600 * 1000).toISOString()
  }
];
