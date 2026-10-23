export type UserRole = 'admin' | 'editor' | 'reader';
export type AccountType = 'pf' | 'pj';
export type UserStatus = 'active' | 'suspended' | 'blocked' | 'inactive';
export type AccountState = 'active' | 'awaiting_confirmation' | 'suspended' | 'blocked' | 'pending_approval' | 'incomplete';

export interface UserAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: 'suspend' | 'reactivate' | 'block' | 'resend_confirmation' | 'confirm_email' | 'change_role' | 'send_email';
  previousStatus?: UserStatus;
  newStatus?: UserStatus;
  reason: string;
  result?: 'success' | 'failure';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  interests?: string[]; // Categorias de interesse, ex: ['Política', 'Cidades']
  createdAt: string;
  lastSignInAt?: string | null; // Data e hora do último login (ou null se nunca acessou)
  lastActiveAt?: string | null; // Data da última atividade
  hasProfile?: boolean; // Se possui perfil correspondente na tabela de perfis (ou false se apenas registro de Auth)
  accountState?: AccountState; // Estado computado da conta
  isPendingApproval?: boolean; // Se requer aprovação administrativa específica
  // Identificação e Cadastro Público Obrigatório
  accountType?: AccountType;
  phone?: string;
  city?: string;
  state?: string;
  // Pessoa Física
  cpf?: string;
  isLegalAge?: boolean;
  // Pessoa Jurídica
  companyName?: string; // Razão Social
  tradeName?: string;   // Nome Fantasia
  cnpj?: string;
  legalRepresentative?: string;
  representativeCpf?: string;
  // Segurança Jurídica e Consentimento (LGPD)
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  status?: UserStatus;
  moderationReason?: string;
  moderationAt?: string;
  moderatedBy?: string;
  // Confirmação de E-mail
  emailConfirmed?: boolean;
  emailConfirmedAt?: string;
}

export type AuthTokenType = 'email_confirmation' | 'password_reset';

export interface AuthSecurityToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  type: AuthTokenType;
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  createdAt: string;
}

export interface OutboxEmail {
  id: string;
  to: string;
  recipientName: string;
  subject: string;
  type: 'email_confirmation' | 'password_reset' | 'password_changed' | 'user_notification' | 'system_announcement' | 'test_email';
  bodyHtml: string;
  actionUrl?: string;
  actionLabel?: string;
  sentAt: string;
  status: 'sent' | 'delivered';
}

export interface EmailConfig {
  enabled: boolean;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  provider: 'smtp' | 'gmail' | 'titan' | 'cpanel' | 'resend' | 'custom';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  notifyOnNewRegistration?: boolean;
  notifyOnNewClassified?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  category: string;
  imageUrl?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export type ArticleStatus = 'published' | 'draft';

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  content: string;
  category: string;
  imageUrl: string;
  videoUrl?: string;
  isVideo?: boolean;
  isHero?: boolean;
  isSecondary?: boolean;
  viewsCount: number;
  author: string;
  createdAt: string;
  updatedAt?: string;
  status?: ArticleStatus;
}

export type CategorySlug = 
  | 'todos'
  | 'artigo'
  | 'brasil'
  | 'cidades'
  | 'esporte'
  | 'eventos'
  | 'policia'
  | 'politica'
  | 'videos'
  | 'classificados';

export interface CategoryItem {
  id: string;
  name: string;
  slug: CategorySlug;
}

export type AdPlacement = 'header' | 'feed' | 'sidebar' | 'article' | 'footer' | 'sidebar_300x900' | 'sidebar_300x600';
export type AdFormat = '300x300' | '300x900' | '300x600' | '728x90' | '970x90';
export type AdStatus = 'active' | 'paused' | 'ended';
export type PlacementMode = 'fixed' | 'carousel';

export interface PlacementSetting {
  placement: AdPlacement;
  mode: PlacementMode;
  isPaused?: boolean;
  defaultDurationSeconds?: number;
  preferredFormat?: '728x90' | '970x90' | '300x300' | '300x900' | '300x600';
}

export interface FormatCarouselSetting {
  format: '300x300' | '300x900' | '300x600';
  durationSeconds: number; // Intervalo independente configurado pelo admin (ex: 5s ou 8s)
  isPaused: boolean;
  mode: PlacementMode;
}

export interface AdItem {
  id: string;
  title: string;
  sponsorName: string;
  linkUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  placement: AdPlacement;
  adFormat?: AdFormat;           // Formato do anúncio: '300x300' | '300x600' | '728x90'
  aspectRatio: string; // e.g. "728 / 90", "1 / 1", "1 / 2", "16 / 9"
  maxWidth?: number;
  width?: number;                // e.g. 300
  height?: number;               // e.g. 300 ou 600
  active: boolean;
  status?: AdStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;

  // Configurações individuais do carrossel e métricas
  altText?: string;
  displayOrder?: number;         // 1, 2, 3... na sequência do carrossel
  durationSeconds?: number;      // Duração de exibição do slide individual
  openInNewTab?: boolean;        // Se true, abre em nova aba
  campaignId?: string;           // Identificador interno da campanha
  campaignName?: string;         // Nome da campanha publicitária
  impressionsCount?: number;     // Contagem de exibições/impressões confirmadas
  clicksCount?: number;          // Contagem de cliques confirmados
}

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  createdAt: string;
}

// ==========================================
// MÓDULO CLASSIFICADOS - TIPOS
// ==========================================
export type ClassifiedSection = 'produtos_servicos' | 'vagas_emprego' | 'procuro_emprego';

export type ClassifiedType = 
  | 'vendo' 
  | 'compro' 
  | 'alugo' 
  | 'ofereco_servico' 
  | 'ofereco_vaga' 
  | 'procuro_emprego';

export type ClassifiedStatus = 'pending' | 'published' | 'rejected' | 'paused' | 'expired';

export type PriceType = 'fixed' | 'free' | 'negotiable';

export interface ClassifiedCategory {
  id: string;
  name: string;
  section: ClassifiedSection;
}

export interface ClassifiedItem {
  id: string;
  code: string; // Código de identificação, ex: CL-4019
  userId: string;
  section: ClassifiedSection;
  type: ClassifiedType;
  category: string;
  title: string;
  slug: string;
  description: string;
  priceType: PriceType;
  price?: number;
  city: string;
  state: string;
  advertiserName: string;
  phone: string; // WhatsApp / Telefone
  images: string[]; // Máximo 3 imagens
  // Campos específicos de Emprego
  jobRole?: string;
  jobArea?: string;
  contractType?: 'CLT' | 'PJ' | 'Estágio' | 'Freelancer' | 'Temporário';
  workload?: 'Integral' | 'Meio Período' | 'Flexível' | 'Remoto';
  experience?: string;
  requirements?: string;
  // Gestão e Validade
  status: ClassifiedStatus;
  rejectionReason?: string;
  viewsCount: number;
  createdAt: string;
  updatedAt?: string;
  expiresAt: string;
}

export interface ClassifiedReport {
  id: string;
  classifiedId: string;
  classifiedTitle: string;
  reporterName?: string;
  reporterEmail?: string;
  reason: 'fraude' | 'produto_proibido' | 'dados_falsos' | 'conteudo_ofensivo' | 'outro';
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface ClassifiedsSettings {
  requireApproval: boolean;
  defaultValidityDays: number;
}

export interface PortalSettings {
  // 1. Identidade e Slogan
  officialName: string;
  shortName: string;
  tagline: string; // Slogan principal (ex: "A NOTÍCIA ONDE VOCÊ ESTIVER")
  presentationPhrase: string; // Frase de apresentação
  shortInstitutionalText: string; // Texto institucional curto
  portalDescription: string; // Descrição utilizada na identificação do portal
  logoBadgeText: string; // Ex: "ONLINE"
  customLogoUrl?: string; // URL ou Base64 da imagem da logomarca oficial

  // 2. Contatos do Portal & Visibilidade
  contactEmail: string;
  showContactEmail: boolean;
  contactPhone: string;
  showContactPhone: boolean;
  whatsappNumber: string; // Ex: "(79) 99977-6199" ou "(79) 99910-0495"
  whatsappLink: string; // Ex: "https://wa.me/5579999776199" (atualizado junto)
  showWhatsapp: boolean;
  commercialAddress: string;
  showCommercialAddress: boolean;
  city: string;
  state: string;
  openingHours: string; // Horário de atendimento
  showOpeningHours: boolean;

  // 3. Informações Institucionais do Rodapé
  footerPresentation: string; // Apresentação institucional no rodapé
  footerAboutText: string; // Texto sobre o portal
  footerClosingPhrase: string; // Frase de encerramento
  copyrightText: string; // Texto de direitos autorais
  referenceYear: string; // Ano de referência (ex: "2026")
  responsibleCompany: string; // Nome da empresa responsável (ex: "Folha da Região Comunicação LTDA")
  additionalFooterInfo: string;

  // 4. Redes Sociais
  facebookUrl: string;
  showFacebook: boolean;
  instagramUrl: string;
  showInstagram: boolean;
  twitterUrl?: string;
  showTwitter?: boolean;
  youtubeUrl?: string;
  showYoutube?: boolean;

  // 5. Páginas Institucionais Editáveis
  institutionalPages: {
    sobreNos: {
      title: string;
      leadParagraph: string;
      historyParagraphs: string[];
      mission: string;
      values: string;
      coverage: string;
    };
    expediente: {
      directorName: string;
      directorRole: string;
      directorEmail: string;
      commercialDept: string;
      commercialContact: string;
      newsroomLocations: string;
      coverageHours: string;
      administrativeHeadquarters: string;
    };
    privacidade: {
      introText: string;
      dataCollectionText: string;
      securityText: string;
      cookiesText: string;
      userRightsText: string;
      dpoContact: string;
    };
  };

  // 6. Configurações de Envio de E-mail & Comunicação (SMTP / Provedor)
  emailConfig?: EmailConfig;

  updatedAt?: string;
}
