import { Article, AdItem, CategoryItem } from '../types/database';

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: '1', name: 'Início', slug: 'todos' },
  { id: '2', name: 'Artigo', slug: 'artigo' },
  { id: '3', name: 'Brasil', slug: 'brasil' },
  { id: '4', name: 'Cidades', slug: 'cidades' },
  { id: '5', name: 'Esporte', slug: 'esporte' },
  { id: '6', name: 'Eventos', slug: 'eventos' },
  { id: '7', name: 'Polícia', slug: 'policia' },
  { id: '8', name: 'Política', slug: 'politica' },
  { id: '9', name: 'Vídeos', slug: 'videos' },
  { id: '10', name: 'Classificados', slug: 'classificados' },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Sergipana de Aracaju, Sofia Favero é eleita com mais de 407 mil votos em SP e apresenta prioridades',
    subtitle: 'Nascida na capital sergipana, a parlamentar conquistou expressiva votação no maior colégio eleitoral do país e já traça seus planos prioritários de atuação legislativa.',
    slug: 'sergipana-de-aracaju-sofia-favero--eleita-com-mais-de-407-mil-votos-em-sp-e-apresenta-prioridades',
    category: 'Política',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791554319971_sofia.jpg',
    isVideo: false,
    isHero: true,
    isSecondary: false,
    viewsCount: 142,
    author: 'Redação Folha da Região',
    createdAt: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
    content: `
      <p>A sergipana Sofia Favero, natural de Aracaju, surpreendeu o cenário político nacional ao conquistar mais de 407 mil votos na recente eleição pelo estado de São Paulo, consolidando-se entre as mais votadas de todo o Brasil.</p>
      <p>Em entrevista concedida neste fim de semana, a parlamentar eleita destacou suas origens sergipanas e ressaltou que as pautas ligadas ao desenvolvimento regional, defesa dos direitos fundamentais, fortalecimento da educação pública e modernização da gestão serão prioridades absolutas em seu mandato.</p>
      <p>“Carrego com imenso orgulho minhas raízes nordestinas e de Aracaju. A confiança expressa por centenas de milhares de eleitores representa uma imensa responsabilidade com as transformações necessárias para a sociedade brasileira”, destacou Sofia.</p>
      <p>Lideranças partidárias e analistas políticos apontam que o expressivo resultado a credencia como uma das vozes mais promissoras da nova geração política no Congresso.</p>
    `
  },
  {
    id: 'art-2',
    title: 'Governo de Sergipe inaugura Vila da Criança nesta sexta-feira',
    subtitle: 'Espaço lúdico na Orla de Atalaia reúne dezenas de atrações culturais, esportivas e educativas para toda a família durante o mês das crianças.',
    slug: 'governo-de-sergipe-inaugura-vila-da-criana-nesta-sexta-feira',
    category: 'Eventos',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791553264333_Governo-de-Sergipe-inaugura-terceira-edicao-da-Vila-da-Crianca-na-sexta-foto-secom.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: true,
    viewsCount: 89,
    author: 'Secom / Governo de Sergipe',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    content: `
      <p>O Governo de Sergipe abriu oficialmente nesta sexta-feira a edição especial da Vila da Criança, montada na área de eventos da Orla da Atalaia em Aracaju. O espaço conta com teatros, oficinas pedagógicas, parque infantil inclusivo e gastronomia típica sergipana.</p>
      <p>A iniciativa, idealizada com coordenação integrada das secretarias de Estado, oferece programação totalmente gratuita de terça a domingo ao longo de todo o mês de outubro.</p>
    `
  },
  {
    id: 'art-3',
    title: 'Disparo interrompe ato político pró-Lula em frente à UFS',
    subtitle: 'Confusão aconteceu nas imediações do campus de São Cristóvão; polícia foi acionada para conter a situação e abrir inquérito.',
    slug: 'disparo-interrompe-ato-poltico-pr-lula-em-frente--ufs',
    category: 'Política',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791552746522_sargento-parou-carro-em-meio-ao-alto-e-sacou-arma-1791550251343_v2_900x506.jpg.webp',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    isVideo: true,
    isHero: false,
    isSecondary: true,
    viewsCount: 115,
    author: 'Redação Folha da Região',
    createdAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    content: `
      <p>Um disparo de arma de fogo provocou pânico e interrompeu um ato político realizado nas proximidades do campus sede da Universidade Federal de Sergipe (UFS), em São Cristóvão.</p>
      <p>De acordo com testemunhas, um indivíduo desceu de um veículo e realizou um disparo para o alto antes de deixar o local. As autoridades policiais já identificaram o suspeito e solicitaram imagens de câmeras de segurança da região.</p>
    `
  },
  {
    id: 'art-4',
    title: 'Jackson Barreto declara que possível derrota de Lula nas urnas “vai levar Sergipe ao retrocesso”',
    subtitle: 'Ex-governador fez pronunciamento enfático sobre os investimentos federais no estado e alertou sobre os riscos para obras de infraestrutura.',
    slug: 'jackson-barreto-declara-que-possvel-derrota-de-lula-nas-urnas-vai-levar-sergipe-ao-retrocesso',
    category: 'Política',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791476495992_IMG_2658.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: true,
    viewsCount: 231,
    author: 'Redação Folha da Região',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    content: `
      <p>O ex-governador de Sergipe Jackson Barreto concedeu entrevista repercutindo o cenário eleitoral e advertiu para o impacto dos repasses do governo federal nas prefeituras e em grandes obras rodoviárias do estado.</p>
      <p>Para o experiente político sergipano, a continuidade dos programas sociais e de fomento aos estados nordestinos depende da manutenção da estabilidade institucional e do apoio federativo.</p>
    `
  },
  {
    id: 'art-5',
    title: 'Prefeitura de Estância realiza acolhimento de nove jovens aprendizes',
    subtitle: 'Solenidade ocorreu nesta quinta-feira (8), no Paço Municipal, e reuniu representantes da administração municipal e do Ministério Público do Trabalho; outros seis jovens já foram convocados.',
    slug: 'prefeitura-de-estncia-realiza-acolhimento-de-nove-jovens-aprendizes',
    category: 'Cidades',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791476722816_Handler.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: true,
    viewsCount: 94,
    author: 'Ascom / Prefeitura de Estância',
    createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    content: `
      <p>A Prefeitura de Estância realizou o acolhimento formal de nove jovens participantes do Programa Jovem Aprendiz Municipal. A solenidade foi sediada no Paço Municipal com a presença de gestores municipais e representantes do Ministério Público do Trabalho (MPT).</p>
      <p>O programa tem como foco a qualificação técnico-profissional de estudantes de escolas públicas, proporcionando bolsa-auxílio, carteira assinada e experiência prática em setores administrativos do município.</p>
    `
  },
  {
    id: 'art-6',
    title: 'ATeG do Senar Sergipe impulsiona a produção de plantas ornamentais em Boquim',
    subtitle: 'Produtores rurais do município comemoram aumento de 40% na rentabilidade após consultoria técnica especializada.',
    slug: 'ateg-do-senar-sergipe-impulsiona-a-produo-de-plantas-ornamentais-em-boquim',
    category: 'Cidades',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791462262162_ateg-do-senar-sergipe-impulsiona-a-producao-de-plantas-ornamentais-em-boquim-bfa841b4.webp',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 45,
    author: 'Ascom Senar Sergipe',
    createdAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    content: `
      <p>O programa de Assistência Técnica e Gerencial (ATeG) do Serviço Nacional de Aprendizagem Rural (Senar Sergipe) vem transformando a realidade de floricultores em Boquim e região centro-sul do estado.</p>
    `
  },
  {
    id: 'art-7',
    title: 'Idoso de 86 anos é resgatado após cair em cisterna de 15 metros em Lagarto',
    subtitle: 'Corpo de Bombeiros Militar de Sergipe atuou com técnica de salvamento vertical para retirar a vítima com vida.',
    slug: 'idoso-de-86-anos--resgatado-aps-cair-em-cisterna-de-15-metros-em-lagarto',
    category: 'Cidades',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791461217925_idosocaiemcisterna_15metros_lagarto_fotocbmse.png',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 88,
    author: 'CBMSE / Notícias Policiais',
    createdAt: new Date(Date.now() - 53 * 3600 * 1000).toISOString(),
    content: `
      <p>Uma equipe de busca e salvamento do Corpo de Bombeiros Militar de Sergipe resgatou com sucesso um idoso de 86 anos que acidentalmente caiu em uma cisterna de 15 metros de profundidade no município de Lagarto.</p>
    `
  },
  {
    id: 'art-8',
    title: 'PoderData/Aya aponta vitória de Flávio Bolsonaro no 2° turno',
    subtitle: 'Pesquisa eleitoral divulgada nesta semana detalha as intenções de voto e taxa de rejeição dos principais concorrentes.',
    slug: 'poderdataaya-aponta-vitria-de-flvio-bolsonaro-no-2-turno',
    category: 'Política',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791460737344_Foto-5.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 167,
    author: 'Agência Nacional de Notícias',
    createdAt: new Date(Date.now() - 55 * 3600 * 1000).toISOString(),
    content: `
      <p>Levantamento nacional realizado pelo instituto PoderData/Aya aponta cenário equilibrado no segundo turno, com variações significativas nas principais capitais do país.</p>
    `
  },
  {
    id: 'art-9',
    title: 'Valmir de Francisquinho assumirá a Secretaria de Governo de Itabaiana',
    subtitle: 'Anúncio foi confirmado pelo prefeito eleito da cidade serrana em coletiva com a imprensa.',
    slug: 'valmir-de-francisquinho-assumir-a-secretaria-de-governo-de-itabaiana',
    category: 'Política',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791415914610_valmirdefrancisquinho_ascom.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 122,
    author: 'Redação Folha da Região',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    content: `
      <p>O ex-prefeito Valmir de Francisquinho foi convidado e aceitou assumir a Secretaria Municipal de Governo de Itabaiana a partir do próximo exercício administrativo.</p>
    `
  },
  {
    id: 'art-10',
    title: 'André David promete ir às ruas para tentar ajudar a eleger Flávio Bolsonaro',
    subtitle: 'Delegado e liderança política sergipana reforça alinhamento ideológico e mobilização partidária no estado.',
    slug: 'andr-david-promete-ir-s-ruas-para-tentar-ajudar-a-eleger-flvio-bolsonaro',
    category: 'Política',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791395497291_Captura-de-tela-2026-10-06-132144.png',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 97,
    author: 'Redação Folha da Região',
    createdAt: new Date(Date.now() - 75 * 3600 * 1000).toISOString(),
    content: `
      <p>O delegado André David confirmou em vídeo veiculado em suas redes que percorrerá os municípios sergipanos com atos em apoio à candidatura da oposição.</p>
    `
  },
  {
    id: 'art-11',
    title: 'Gilmar Mendes arquiva investigação de abuso sexual contra vice de Flávio',
    subtitle: 'Ministro do STF acolheu parecer da Procuradoria-Geral da República por falta de elementos mínimos comprobatórios.',
    slug: 'gilmar-mendes-arquiva-investigao-de-abuso-sexual-contra-vice-de-flvio',
    category: 'Brasil',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791383921003_alfredo-gaspar-consolida-projeto-ao-senado-e-prepa-00879802-8130084b068db606da9c06daff83de67-1024x631-1.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 104,
    author: 'Brasília / Agência Brasil',
    createdAt: new Date(Date.now() - 76 * 3600 * 1000).toISOString(),
    content: `
      <p>O ministro do Supremo Tribunal Federal (STF) Gilmar Mendes determinou o arquivamento definitivo da investigação preliminar.</p>
    `
  },
  {
    id: 'art-12',
    title: 'Érica Mitidieri foi peça fundamental para a reeleição de Fábio Mitidieri',
    subtitle: 'Primeira-dama e secretária de Estado teve atuação elogiada em programas de assistência social e diálogo comunitário.',
    slug: 'rica-mitidieri-foi-pea-fundamental-para-a-reeleio-de-fbio-mitidieri',
    category: 'Cidades',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791383524175_erica-mitidieri.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 78,
    author: 'Redação Folha da Região',
    createdAt: new Date(Date.now() - 77 * 3600 * 1000).toISOString(),
    content: `
      <p>A articulada presença de Érica Mitidieri no interior do estado foi apontada por correligionários como um dos principais fatores de engajamento popular.</p>
    `
  },
  {
    id: 'art-13',
    title: 'Sérgio Reis e Fábio Reis seguirão em palanques diferentes no segundo turno das eleições',
    subtitle: 'Irmãos da tradicional família política de Lagarto reforçam posicionamentos independentes no pleito de 2026.',
    slug: 'srgio-reis-e-fbio-reis-seguiro-em-palanques-diferentes-no-segundo-turno-das-eleies',
    category: 'Cidades',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791383335554_WhatsApp-Image-2026-10-07-at-11.13.35-768x432.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 189,
    author: 'Correspondente Lagarto',
    createdAt: new Date(Date.now() - 78 * 3600 * 1000).toISOString(),
    content: `
      <p>Em declarações à imprensa regional, o deputado Sérgio Reis e o ex-deputado Fábio Reis reiteraram respeito mútuo, porém com caminhos distintos no segundo turno.</p>
    `
  },
  {
    id: 'art-14',
    title: 'Jogos Estudantis de Estância encerram edição com finais e definição dos campeões',
    subtitle: 'Centenas de alunos de colégios públicos e particulares disputaram medalhas no ginásio poliesportivo Franciscão.',
    slug: 'jogos-estudantis-de-estncia-encerram-edio-com-finais-e-definio-dos-campees',
    category: 'Cidades',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791383090267_Handler.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 65,
    author: 'Secretaria de Juventude e Desporto de Estância',
    createdAt: new Date(Date.now() - 79 * 3600 * 1000).toISOString(),
    content: `
      <p>A solenidade de encerramento dos Jogos Estudantis de Estância coroou as equipes campeãs no futsal, vôlei, basquete e atletismo escolar.</p>
    `
  },
  {
    id: 'art-15',
    title: 'Fábio Mitidieri vence Valmir em 67 dos 75 municípios de Sergipe',
    subtitle: 'Mapeamento detalhado dos votos demonstra ampla liderança do atual governador na maioria das microrregiões do estado.',
    slug: 'fbio-mitidieri-vence-valmir-em-67-dos-75-municpios-de-sergipe',
    category: 'Política',
    imageUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1791288097002_Fabio_Valmir-Candidatos-FotosRedesSociais-2409.jpg',
    isVideo: false,
    isHero: false,
    isSecondary: false,
    viewsCount: 215,
    author: 'Análise Política Sergipe',
    createdAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    content: `
      <p>Os dados consolidados pelo Tribunal Regional Eleitoral (TRE-SE) apontam que Fábio Mitidieri obteve votação superior à oposição em 67 cidades sergipanas.</p>
    `
  }
];

export const INITIAL_ADS: AdItem[] = [
  {
    id: 'ad-top',
    title: 'PAF Sergipe Cremação',
    sponsorName: 'PAF Sergipe',
    linkUrl: 'https://www.instagram.com/pafsergipe',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1788485470954_CREMA__O.gif',
    mediaType: 'gif',
    placement: 'header',
    aspectRatio: '728 / 90',
    maxWidth: 728,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-feed-1',
    title: 'Lizart Publicidade',
    sponsorName: 'Lizart Pec',
    linkUrl: 'https://www.instagram.com/lizart.pec',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1788442767679_lizarte.mp4',
    mediaType: 'video',
    placement: 'feed',
    aspectRatio: '16 / 9',
    maxWidth: 320,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-1',
    title: 'Manancial Empório Vidros',
    sponsorName: 'Vidraçaria Manancial',
    linkUrl: 'https://www.instagram.com/vidracariamanancial1710',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1787595007476_anuncie_conosco__2_.gif',
    mediaType: 'gif',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-2',
    title: 'Viana Correia Imóveis',
    sponsorName: 'Viana Correia',
    linkUrl: 'https://www.instagram.com/viana.correia/',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1788278982129_viana.png',
    mediaType: 'image',
    placement: 'sidebar',
    aspectRatio: '1 / 2',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-3',
    title: 'LS Suplementos Estância',
    sponsorName: 'LS Suplementos',
    linkUrl: 'https://www.instagram.com/ls_suplementoos',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1788292467612_ls_final.mp4',
    mediaType: 'video',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-4',
    title: 'Contag Contabilidade',
    sponsorName: 'Contag',
    linkUrl: 'https://folhadaregiaonline.com.br/institucional/anuncie-conosco',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1787594699568_contag.gif',
    mediaType: 'gif',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-5',
    title: 'Loja Nossa Senhora da Conceição',
    sponsorName: 'Loja Nossa Senhora da Conceição',
    linkUrl: 'https://www.instagram.com/lojanossasenhoradaconceicaoo',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1790682390811_79_9_3500_9350.mp4',
    mediaType: 'video',
    placement: 'sidebar',
    aspectRatio: '1 / 2',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-6',
    title: 'Cellgás Distribuidora',
    sponsorName: 'Cellgás Estância',
    linkUrl: 'https://www.instagram.com/cellgas_estancia',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1787924698730_cellgas.gif',
    mediaType: 'gif',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-7',
    title: 'Ivan Moto Peças',
    sponsorName: 'Ivan Motos',
    linkUrl: 'https://www.instagram.com/ivanmotospecas',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1788277086944_ivan_motos_01.mp4',
    mediaType: 'video',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-8',
    title: 'Shopping do Bebê Estância',
    sponsorName: 'Shopping do Bebê',
    linkUrl: 'https://www.instagram.com/shoppingdobebeestancia/',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1788274569213_SHOPPING_DO_BEBE_01.mp4',
    mediaType: 'video',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-9',
    title: 'Exclusiva Casa Colchões',
    sponsorName: 'Exclusiva Casa Oficial',
    linkUrl: 'https://www.instagram.com/exclusivacasaoficial/',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1788275323053_exclusiva_casa.mp4',
    mediaType: 'video',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-10',
    title: 'Despertar Pilates Clássico',
    sponsorName: 'Despertar Pilates',
    linkUrl: 'https://www.instagram.com/despertarpilatesclassico01',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1789652463250_DESPERTAR.mp4',
    mediaType: 'video',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ad-side-11',
    title: 'CPA Pro Cursos Profissionalizantes',
    sponsorName: 'CPA Pro Cursos',
    linkUrl: 'https://cpaprocurso.com.br/',
    mediaUrl: 'https://zetgraouzpoxlbmqxtpb.supabase.co/storage/v1/object/public/images/public/1787571743823_anuncie_conosco.gif',
    mediaType: 'gif',
    placement: 'sidebar',
    aspectRatio: '1 / 1',
    maxWidth: 300,
    active: true,
    createdAt: new Date().toISOString()
  }
];
