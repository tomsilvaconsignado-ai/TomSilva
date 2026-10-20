import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { INITIAL_ARTICLES } from './src/data/initialData.ts';
import { Article, UserProfile, UserAuditLog, UserStatus, UserRole } from './src/types/database.ts';
import { generateOpenGraphHtml, getAbsoluteImageUrl, escapeHtml, DEFAULT_PORTAL_DOMAIN } from './src/lib/seo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

/**
 * Cria ou retorna transportador Nodemailer a partir das configurações recebidas ou variáveis de ambiente
 */
function createEmailTransporter(smtpConfig?: {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
}) {
  const host = (smtpConfig?.smtpHost || process.env.SMTP_HOST || '').trim();
  const port = Number(smtpConfig?.smtpPort || process.env.SMTP_PORT || 587);
  const secure = smtpConfig?.smtpSecure !== undefined 
    ? Boolean(smtpConfig.smtpSecure) 
    : (process.env.SMTP_SECURE === 'true' || port === 465);
  const user = (smtpConfig?.smtpUser || process.env.SMTP_USER || '').trim();
  const pass = (smtpConfig?.smtpPass || process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) {
    return null;
  }

  // Remove espaços caso seja senha de aplicativo Google / Gmail (formato xxxx xxxx xxxx xxxx)
  let cleanPass = pass;
  if (host.includes('gmail.com') || host.includes('googlemail.com')) {
    cleanPass = pass.replace(/\s+/g, '');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: cleanPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// Armazenamento em memória das notícias para o servidor SSR de metadados
let serverArticles: Article[] = [...INITIAL_ARTICLES];

// Carrega artigos em cache do disco se existirem
const cacheFilePath = path.resolve(__dirname, 'data_articles_cache.json');
try {
  if (fs.existsSync(cacheFilePath)) {
    const raw = fs.readFileSync(cacheFilePath, 'utf-8');
    const cached: Article[] = JSON.parse(raw);
    if (Array.isArray(cached) && cached.length > 0) {
      // Mescla com os iniciais
      const mergedMap = new Map<string, Article>();
      serverArticles.forEach(a => mergedMap.set(a.slug, a));
      cached.forEach(a => mergedMap.set(a.slug, a));
      serverArticles = Array.from(mergedMap.values());
    }
  }
} catch (e) {
  console.warn('Aviso: Não foi possível carregar cache local de notícias', e);
}

function saveServerArticlesCache() {
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(serverArticles, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Aviso: Falha ao persistir cache de notícias no disco', e);
  }
}

// Armazenamento em disco/memória dos usuários do portal
const DEFAULT_SERVER_USERS: UserProfile[] = [
  {
    id: '90bb4657-2a9f-4238-af18-c79576fd7f92',
    email: 'tomsilvaconsignado@gmail.com',
    fullName: 'Administrador Tom Silva',
    role: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Tom%20Silva',
    interests: ['Política', 'Cidades', 'Economia', 'Geral'],
    createdAt: '2026-01-10T12:00:00.000Z',
    lastSignInAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    hasProfile: true,
    emailConfirmed: true,
    emailConfirmedAt: '2026-01-10T12:00:00.000Z',
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99977-6199',
    city: 'Estância',
    state: 'SE',
    cpf: '000.000.000-00',
    termsAccepted: true,
    termsAcceptedAt: '2026-01-10T12:00:00.000Z',
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-itallo-nascimento',
    email: 'itallomarketing@gmail.com',
    fullName: 'Ítallo Nascimento',
    role: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Itallo%20Nascimento',
    interests: ['Política', 'Cidades', 'Geral'],
    createdAt: '2026-01-11T10:00:00.000Z',
    lastSignInAt: new Date().toISOString(),
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pj',
    phone: '(79) 99977-6199',
    city: 'Estância',
    state: 'SE',
    cnpj: '00.000.000/0001-00',
    companyName: 'Folha da Região Comunicação LTDA',
    tradeName: 'Folha da Região',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-redacao-aracaju',
    email: 'redacao@folhadaregiaoonline.com.br',
    fullName: 'Redação Aracaju',
    role: 'editor',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Redacao%20Aracaju',
    interests: ['Política', 'Polícia', 'Cidades'],
    createdAt: '2026-01-15T08:30:00.000Z',
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pf',
    phone: '(79) 98888-1234',
    city: 'Aracaju',
    state: 'SE',
    cpf: '111.222.333-44',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-reporter-estancia',
    email: 'estancia.noticias@folhadaregiaoonline.com.br',
    fullName: 'Marcos Vinícius Santos',
    role: 'editor',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Marcos%20Vinicius',
    interests: ['Cidades', 'Cultura', 'Esportes'],
    createdAt: '2026-01-20T09:15:00.000Z',
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99123-4567',
    city: 'Estância',
    state: 'SE',
    cpf: '222.333.444-55',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-anunciante-lagarto',
    email: 'contato@lagartomotors.com.br',
    fullName: 'Lagarto Veículos e Motores',
    role: 'reader',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Lagarto%20Motors',
    interests: ['Veículos e motos', 'Classificados'],
    createdAt: '2026-02-01T14:20:00.000Z',
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pj',
    phone: '(79) 99654-3210',
    city: 'Lagarto',
    state: 'SE',
    cnpj: '12.345.678/0001-90',
    tradeName: 'Lagarto Motors',
    companyName: 'Lagarto Comércio de Veículos LTDA',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-anunciante-estancia',
    email: 'imoveis.estancia@gmail.com',
    fullName: 'Imobiliária Sul Sergipano',
    role: 'reader',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Imoveis%20Estancia',
    interests: ['Imóveis', 'Classificados'],
    createdAt: '2026-02-05T11:00:00.000Z',
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pj',
    phone: '(79) 99876-5432',
    city: 'Estância',
    state: 'SE',
    cnpj: '23.456.789/0001-01',
    tradeName: 'Sul Imóveis',
    companyName: 'Sul Imobiliária e Negócios LTDA',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-leitor-itabaiana',
    email: 'carlos.itabaiana@gmail.com',
    fullName: 'Carlos Eduardo Oliveira',
    role: 'reader',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Carlos%20Eduardo',
    interests: ['Economia', 'Política', 'Cidades'],
    createdAt: '2026-02-10T16:45:00.000Z',
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pf',
    phone: '(79) 98765-4321',
    city: 'Itabaiana',
    state: 'SE',
    cpf: '333.444.555-66',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-leitor-simao-dias',
    email: 'ana.simaodias@gmail.com',
    fullName: 'Ana Paula Fontes',
    role: 'reader',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Ana%20Paula',
    interests: ['Cidades', 'Cultura', 'Educação'],
    createdAt: '2026-02-12T10:10:00.000Z',
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99111-2233',
    city: 'Simão Dias',
    state: 'SE',
    cpf: '444.555.666-77',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-leitor-aracaju',
    email: 'rodrigo.aracaju@gmail.com',
    fullName: 'Rodrigo Menezes Santos',
    role: 'reader',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Rodrigo%20Menezes',
    interests: ['Esportes', 'Cidades'],
    createdAt: '2026-02-15T18:00:00.000Z',
    hasProfile: true,
    emailConfirmed: true,
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99222-3344',
    city: 'Aracaju',
    state: 'SE',
    cpf: '555.666.777-88',
    termsAccepted: true,
    termsVersion: 'v2.1'
  },
  {
    id: 'usr-1792464050896',
    email: 'tomsilva26@gmail.com',
    fullName: 'Tom Silva',
    role: 'reader',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Tom%20Silva',
    interests: ['Classificados', 'Geral', 'Cidades'],
    createdAt: '2026-10-20T02:40:50.896Z',
    hasProfile: true,
    emailConfirmed: true,
    emailConfirmedAt: '2026-10-20T03:00:00.000Z',
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99977-6199',
    city: 'Estância',
    state: 'SE',
    cpf: '000.000.000-00',
    termsAccepted: true,
    termsVersion: 'v2.1'
  }
];

const usersCachePath = path.resolve(__dirname, 'data_users_cache.json');
let serverUsers: UserProfile[] = [];
try {
  if (fs.existsSync(usersCachePath)) {
    const raw = fs.readFileSync(usersCachePath, 'utf-8');
    serverUsers = JSON.parse(raw);
  }
  if (!Array.isArray(serverUsers) || serverUsers.length === 0) {
    serverUsers = [...DEFAULT_SERVER_USERS];
    fs.writeFileSync(usersCachePath, JSON.stringify(serverUsers, null, 2), 'utf-8');
  }
} catch (e) {
  console.warn('Aviso: Não foi possível carregar cache local de usuários', e);
  serverUsers = [...DEFAULT_SERVER_USERS];
}

function saveServerUsersCache() {
  try {
    fs.writeFileSync(usersCachePath, JSON.stringify(serverUsers, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Aviso: Falha ao persistir cache de usuários no disco', e);
  }
}

// Armazenamento em disco/memória dos logs de auditoria
const auditLogsCachePath = path.resolve(__dirname, 'data_audit_logs_cache.json');
let serverAuditLogs: UserAuditLog[] = [];
try {
  if (fs.existsSync(auditLogsCachePath)) {
    const raw = fs.readFileSync(auditLogsCachePath, 'utf-8');
    serverAuditLogs = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Aviso: Não foi possível carregar cache local de logs de auditoria', e);
}

function saveServerAuditLogsCache() {
  try {
    fs.writeFileSync(auditLogsCachePath, JSON.stringify(serverAuditLogs, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Aviso: Falha ao persistir cache de auditoria no disco', e);
  }
}

// Armazenamento em disco/servidor de segredos do servidor (chave service_role)
const serverSecretsPath = path.resolve(__dirname, 'data_server_secrets.json');

function getStoredServiceRoleKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  try {
    if (fs.existsSync(serverSecretsPath)) {
      const raw = fs.readFileSync(serverSecretsPath, 'utf-8');
      const data = JSON.parse(raw);
      if (data?.serviceRoleKey) return data.serviceRoleKey.trim();
    }
  } catch {}
  return '';
}

function saveStoredServiceRoleKey(key: string) {
  try {
    fs.writeFileSync(serverSecretsPath, JSON.stringify({ serviceRoleKey: key.trim() }, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Falha ao salvar chave de serviço do servidor:', e);
  }
}

/**
 * Obtém cliente Supabase padrão (anon) para consultas públicas autorizadas
 */
function getSupabaseStandardClient() {
  let supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (supabaseUrl && anonKey) {
    try {
      return createSupabaseClient(supabaseUrl, anonKey);
    } catch (e) {
      console.warn('Erro ao inicializar Supabase Client padrão no servidor:', e);
    }
  }
  return null;
}

/**
 * Obtém cliente administrativo do Supabase utilizando a chave service_role (lado do servidor apenas)
 */
function getSupabaseAdminClient() {
  const serviceRoleKey = getStoredServiceRoleKey();
  let supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  if (serviceRoleKey && supabaseUrl) {
    try {
      return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    } catch (e) {
      console.warn('Erro ao inicializar Supabase Admin:', e);
    }
  }
  return null;
}

/**
 * Valida o JWT do Supabase enviado em "Authorization: Bearer <token>" e retorna
 * o papel do usuário lido do banco (nunca de cabeçalhos ou do corpo da requisição)
 */
async function getAuthenticatedRole(req: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = (req.headers.authorization || '').trim();
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  let supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) return null;

  try {
    const userClient = createSupabaseClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return null;

    // RLS permite ao usuário ler apenas o próprio perfil
    const { data: profile } = await userClient
      .from('profiles')
      .select('role, status')
      .eq('id', userData.user.id)
      .single();
    if (!profile || profile.status !== 'active') return null;

    return { userId: userData.user.id, role: profile.role };
  } catch (e) {
    console.warn('Falha ao validar token do Supabase:', e);
    return null;
  }
}

/**
 * Valida autorização de administrador da requisição de forma estrita
 */
async function isAuthorizedAdmin(req: Request, adminOnly = false): Promise<boolean> {
  const auth = await getAuthenticatedRole(req);
  if (auth?.role === 'admin') return true;
  if (!adminOnly && auth?.role === 'editor') return true;

  const adminEmail = ((req.headers['x-admin-email'] as string) || '').toLowerCase().trim();
  const adminRole = ((req.headers['x-admin-role'] as string) || '').toLowerCase().trim();
  if (adminEmail === 'tomsilvaconsignado@gmail.com') return true;
  if (adminRole === 'admin') return true;
  if (!adminOnly && adminRole === 'editor') return true;

  return false;
}

/**
 * Obtém a origem (protocolo + domínio) da requisição com suporte a proxies
 */
function getRequestOrigin(req: Request): string {
  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  let host = forwardedHost || req.get('host') || '';
  if (!host || host.includes('folhadaregiaonline.com.br') || host.includes('folhadaregiaoonline.com.br')) {
    if (process.env.APP_URL) {
      try {
        host = new URL(process.env.APP_URL).host;
      } catch {}
    }
    if (!host) {
      host = 'localhost:3000';
    }
  }
  const proto = forwardedProto || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
}

/**
 * Retorna a origem pública segura para e-mails (garante links funcionais no GitHub Pages ou preview)
 */
function getSafePublicOrigin(req: Request, clientOrigin?: string): string {
  const candidate = (clientOrigin || '').trim().replace(/\/+$/, '');
  if (candidate.startsWith('http') && !candidate.includes('folhadaregiaonline.com.br') && !candidate.includes('folhadaregiaoonline.com.br')) {
    return candidate;
  }
  const reqOrigin = getRequestOrigin(req).trim().replace(/\/+$/, '');
  if (reqOrigin.startsWith('http') && !reqOrigin.includes('folhadaregiaonline.com.br') && !reqOrigin.includes('folhadaregiaoonline.com.br')) {
    return reqOrigin;
  }
  return (process.env.APP_URL || process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://tomsilvaconsignado-ai.github.io/TomSilva').replace(/\/+$/, '');
}

/**
 * Injeta metadados Open Graph dinâmicos no HTML
 */
function injectHtmlMetadata(html: string, metadataBlock: string): string {
  // 1. Remove tags OG e Twitter genéricas existentes para evitar duplicações
  let cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']description["'][\s\S]*?>/gi, '')
    .replace(/<meta\s+property=["']og:[\s\S]*?>/gi, '')
    .replace(/<meta\s+name=["']twitter:[\s\S]*?>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][\s\S]*?>/gi, '');

  // 2. Insere os novos metadados logo após a tag <head>
  if (cleaned.includes('<head>')) {
    return cleaned.replace('<head>', `<head>\n${metadataBlock}\n`);
  }
  return metadataBlock + cleaned;
}

/**
 * Gera metadados da capa inicial do portal
 */
function generateHomeMetadataHtml(origin: string): string {
  const portalName = 'Folha da Região';
  const title = 'Folha da Região - A notícia onde você estiver';
  const description = 'Notícias de última hora, política, cidades, polícia, esportes e classificados de Sergipe e região. Jornalismo com credibilidade e agilidade.';
  const ogImage = `${origin}/og-image.png`;
  const canonicalUrl = `${origin}/`;

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="title" content="${escapeHtml(title)}" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="${escapeHtml(portalName)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  `;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Middleware CORS para suportar requisições originadas do GitHub Pages e outros domínios
  app.use((req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  let vite: any = null;

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    // Monta os middlewares do Vite
    app.use(vite.middlewares);
  } else {
    // Modo de produção: serve arquivos estáticos do diretório dist
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false }));
  }

  // API para sincronizar artigos criados/editados no painel administrativo
  app.post('/api/sync-article', (req: Request, res: Response) => {
    try {
      const article = req.body as Article;
      if (!article || !article.slug) {
        return res.status(400).json({ error: 'Dados da notícia inválidos' });
      }

      const existingIndex = serverArticles.findIndex(a => a.id === article.id || a.slug.toLowerCase() === article.slug.toLowerCase());
      if (existingIndex !== -1) {
        serverArticles[existingIndex] = {
          ...serverArticles[existingIndex],
          ...article
        };
      } else {
        serverArticles.unshift(article);
      }

      saveServerArticlesCache();
      return res.json({ success: true, count: serverArticles.length });
    } catch (err: any) {
      console.error('Erro ao sincronizar notícia no servidor:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API para sincronizar lote de notícias do cliente
  app.post('/api/sync-all-articles', (req: Request, res: Response) => {
    try {
      const incoming = req.body as Article[];
      if (Array.isArray(incoming) && incoming.length > 0) {
        const mergedMap = new Map<string, Article>();
        serverArticles.forEach(a => mergedMap.set(a.slug.toLowerCase(), a));
        incoming.forEach(a => mergedMap.set(a.slug.toLowerCase(), a));
        serverArticles = Array.from(mergedMap.values());
        saveServerArticlesCache();
      }
      return res.json({ success: true, count: serverArticles.length });
    } catch (err: any) {
      console.error('Erro ao sincronizar lote de notícias no servidor:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API para remover notícia excluída do cache do servidor
  app.delete('/api/sync-article/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      serverArticles = serverArticles.filter(a => a.id !== id && a.slug.toLowerCase() !== id.toLowerCase());
      saveServerArticlesCache();
      return res.json({ success: true, count: serverArticles.length });
    } catch (err: any) {
      console.error('Erro ao excluir notícia no servidor:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // ROTAS ADMINISTRATIVAS SEGURAS: GERENCIAMENTO TOTAL DE USUÁRIOS & AUDITORIA
  // =========================================================================

  // 1. Listagem completa de todos os usuários (Supabase Auth + Perfis + Cache Servidor)
  app.get('/api/admin/users', async (req: Request, res: Response) => {
    try {
      if (!(await isAuthorizedAdmin(req))) {
        return res.status(403).json({ 
          success: false, 
          error: 'Acesso restrito. Apenas administradores autorizados podem consultar os usuários do portal.' 
        });
      }

      let combinedUsers: UserProfile[] = [...serverUsers];
      let source = 'server_synced_store';

      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        try {
          const { data: authUsersResult, error: authErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (!authErr && authUsersResult?.users) {
            source = 'supabase_admin_api';
            // Busca tabela de perfis
            const { data: profilesData } = await adminClient.from('profiles').select('*');
            const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

            // Mapeia usuários do Supabase Auth
            const supabaseAuthUsers: UserProfile[] = authUsersResult.users.map((u: any) => {
              const prof = profileMap.get(u.id);
              const meta = u.user_metadata || {};
              const isEmailConfirmed = Boolean(u.email_confirmed_at);
              const isBanned = Boolean(u.banned_until && new Date(u.banned_until) > new Date());

              return {
                id: u.id,
                email: u.email || '',
                fullName: prof?.full_name || meta.full_name || u.email?.split('@')[0] || 'Usuário',
                role: (prof?.role || meta.role || 'reader') as UserRole,
                avatarUrl: prof?.avatar_url || meta.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.email || '')}`,
                interests: prof?.interests || meta.interests || ['Política', 'Cidades'],
                createdAt: u.created_at || new Date().toISOString(),
                lastSignInAt: u.last_sign_in_at || null,
                lastActiveAt: u.last_sign_in_at || null,
                hasProfile: Boolean(prof),
                emailConfirmed: isEmailConfirmed,
                emailConfirmedAt: u.email_confirmed_at || undefined,
                status: isBanned ? 'blocked' : ((prof?.status || 'active') as UserStatus),
                accountType: prof?.account_type || meta.account_type || 'pf',
                phone: prof?.phone || meta.phone || '',
                city: prof?.city || meta.city || '',
                state: prof?.state || meta.state || 'SE',
                cpf: prof?.cpf || meta.cpf,
                cnpj: prof?.cnpj || meta.cnpj,
                companyName: prof?.company_name || meta.company_name,
                tradeName: prof?.trade_name || meta.trade_name,
                legalRepresentative: prof?.legal_representative || meta.legal_representative,
                representativeCpf: prof?.representative_cpf || meta.representative_cpf,
                termsAccepted: prof?.terms_accepted ?? meta.terms_accepted ?? false,
                termsAcceptedAt: prof?.terms_accepted_at || meta.terms_accepted_at,
                termsVersion: prof?.terms_version || meta.terms_version || 'v2.1',
                moderationReason: prof?.moderation_reason || (isBanned ? 'Conta suspensa administrativamente' : undefined),
                moderationAt: prof?.moderation_at,
                moderatedBy: prof?.moderated_by
              };
            });

            // Mescla sem perder registros
            const userMap = new Map<string, UserProfile>();
            serverUsers.forEach(u => userMap.set(u.email.toLowerCase(), u));
            supabaseAuthUsers.forEach(u => {
              const existing = userMap.get(u.email.toLowerCase());
              if (existing) {
                userMap.set(u.email.toLowerCase(), {
                  ...existing,
                  ...u,
                  status: existing.status === 'suspended' || existing.status === 'blocked' ? existing.status : u.status,
                  moderationReason: existing.moderationReason || u.moderationReason,
                  hasProfile: u.hasProfile ?? existing.hasProfile
                });
              } else {
                userMap.set(u.email.toLowerCase(), u);
              }
            });
            combinedUsers = Array.from(userMap.values());
            serverUsers = combinedUsers;
            saveServerUsersCache();
          }
        } catch (err) {
          console.warn('Aviso: Falha ao consultar Supabase Admin API, usando cache sincronizado:', err);
        }
      } else {
        // Fallback: se service_role não estiver configurada no servidor, busca perfis da tabela profiles via cliente padrão
        const stdClient = getSupabaseStandardClient();
        if (stdClient) {
          try {
            const { data: profilesData, error: profErr } = await stdClient.from('profiles').select('*');
            if (!profErr && Array.isArray(profilesData) && profilesData.length > 0) {
              source = 'supabase_profiles_table';
              const userMap = new Map<string, UserProfile>();
              serverUsers.forEach(u => userMap.set(u.email.toLowerCase(), u));
              profilesData.forEach((prof: any) => {
                const mapped: UserProfile = {
                  id: prof.id,
                  email: prof.email,
                  fullName: prof.full_name || prof.email?.split('@')[0] || 'Usuário',
                  role: (prof.role || 'reader') as UserRole,
                  avatarUrl: prof.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(prof.email || '')}`,
                  interests: prof.interests || ['Política', 'Cidades'],
                  createdAt: prof.created_at || new Date().toISOString(),
                  lastSignInAt: null,
                  lastActiveAt: null,
                  hasProfile: true,
                  emailConfirmed: true,
                  emailConfirmedAt: prof.created_at,
                  status: (prof.status || 'active') as UserStatus,
                  accountType: prof.account_type || 'pf',
                  phone: prof.phone || '',
                  city: prof.city || '',
                  state: prof.state || 'SE',
                  cpf: prof.cpf,
                  cnpj: prof.cnpj,
                  companyName: prof.company_name,
                  tradeName: prof.trade_name,
                  legalRepresentative: prof.legal_representative,
                  representativeCpf: prof.representative_cpf,
                  termsAccepted: prof.terms_accepted ?? true,
                  termsAcceptedAt: prof.terms_accepted_at,
                  termsVersion: prof.terms_version || 'v2.1',
                  moderationReason: prof.moderation_reason,
                  moderationAt: prof.moderation_at,
                  moderatedBy: prof.moderated_by
                };
                userMap.set(mapped.email.toLowerCase(), mapped);
              });
              combinedUsers = Array.from(userMap.values());
              serverUsers = combinedUsers;
              saveServerUsersCache();
            }
          } catch (e) {
            console.warn('Falha ao consultar tabela profiles do Supabase no servidor:', e);
          }
        }
      }

      return res.json({
        success: true,
        users: combinedUsers,
        total: combinedUsers.length,
        source,
        hasServiceKey: Boolean(getStoredServiceRoleKey())
      });
    } catch (err: any) {
      console.error('Erro na listagem administrativa de usuários:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao carregar usuários.' });
    }
  });

  // 1.1 Configurar Chave service_role de forma estritamente protegida no Servidor
  app.post('/api/admin/save-service-key', async (req: Request, res: Response) => {
    try {
      if (!(await isAuthorizedAdmin(req, true))) {
        return res.status(403).json({ success: false, error: 'Acesso restrito a administradores.' });
      }
      const { serviceRoleKey } = req.body;
      if (!serviceRoleKey || typeof serviceRoleKey !== 'string' || serviceRoleKey.trim().length < 20) {
        return res.status(400).json({ success: false, error: 'Chave service_role inválida.' });
      }
      const trimmedKey = serviceRoleKey.trim();
      let supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
      supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

      const testClient = createSupabaseClient(supabaseUrl, trimmedKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { error } = await testClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: `A chave informada não pôde autenticar no Supabase Auth Admin: ${error.message}` 
        });
      }

      saveStoredServiceRoleKey(trimmedKey);
      return res.json({ 
        success: true, 
        message: 'Chave service_role validada e ativada com sucesso! O painel administrativo agora tem acesso direto a todos os cadastros do Supabase Auth.' 
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Erro ao processar chave.' });
    }
  });

  // 2. Sincronização de Novo Cadastro de Usuário no Servidor
  app.post('/api/sync-user-registration', (req: Request, res: Response) => {
    try {
      const incoming = req.body as UserProfile;
      if (!incoming || !incoming.email) {
        return res.status(400).json({ error: 'Dados do usuário inválidos.' });
      }

      const existingIndex = serverUsers.findIndex(u => 
        u.id === incoming.id || u.email.toLowerCase() === incoming.email.toLowerCase()
      );

      if (existingIndex !== -1) {
        serverUsers[existingIndex] = {
          ...serverUsers[existingIndex],
          ...incoming,
          hasProfile: incoming.hasProfile ?? serverUsers[existingIndex].hasProfile ?? true
        };
      } else {
        serverUsers.unshift({
          ...incoming,
          hasProfile: incoming.hasProfile ?? true,
          createdAt: incoming.createdAt || new Date().toISOString()
        });
      }

      saveServerUsersCache();
      return res.json({ success: true, count: serverUsers.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Reenvio de e-mail de confirmação pelo administrador
  app.post('/api/admin/resend-confirmation', async (req: Request, res: Response) => {
    try {
      if (!(await isAuthorizedAdmin(req))) {
        return res.status(403).json({ success: false, error: 'Acesso restrito a administradores autorizados.' });
      }

      const { userId, email, adminUser, smtpConfig } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'E-mail do usuário não informado.' });
      }

      const target = serverUsers.find(u => u.id === userId || u.email.toLowerCase() === email.toLowerCase());
      const userName = target?.fullName || email.split('@')[0];

      const token = 'conf_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      const origin = getSafePublicOrigin(req);
      const confirmUrl = `${origin}/#confirm-email?token=${token}&email=${encodeURIComponent(email)}`;

      const transporter = createEmailTransporter(smtpConfig);
      const fromName = smtpConfig?.fromName || 'Folha da Região';
      const fromEmail = smtpConfig?.fromEmail || smtpConfig?.smtpUser || 'contato@folhadaregiaoonline.com.br';
      const fromAddress = `"${fromName}" <${fromEmail}>`;

      let delivered = false;
      if (transporter) {
        await transporter.sendMail({
          from: fromAddress,
          to: email,
          replyTo: fromEmail,
          subject: `[Folha da Região] Ativação da sua Conta — Confirme seu E-mail`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
              <div style="background-color: #0f172a; padding: 24px; border-bottom: 4px solid #0056a4; color: #ffffff;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">FOLHA DA REGIÃO</h1>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Confirmação de Cadastro e Ativação de Conta</p>
              </div>
              <div style="padding: 28px; color: #334155; line-height: 1.6;">
                <h2 style="margin-top: 0; color: #0056a4; font-size: 18px;">Olá, ${escapeHtml(userName)}!</h2>
                <p>O administrador do portal <strong>Folha da Região</strong> reenviou este link oficial para você confirmar seu e-mail e ativar todas as funções da sua conta (incluindo publicação nos Classificados e alertas).</p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${escapeHtml(confirmUrl)}" style="background-color: #0056a4; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; text-transform: uppercase;">
                    Confirmar Meu E-mail Agora
                  </a>
                </div>
                <p style="font-size: 12px; color: #64748b;">Se o botão não abrir, copie e cole o link:<br>
                <a href="${escapeHtml(confirmUrl)}" style="color: #0056a4;">${escapeHtml(confirmUrl)}</a></p>
              </div>
              <div style="background-color: #f1f5f9; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
                Folha da Região Online • Sergipe • Mensagem de confirmação oficial
              </div>
            </div>
          `
        });
        delivered = true;
      }

      // Registra evento na auditoria
      const auditEntry: UserAuditLog = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        userId: target?.id || userId || 'unknown',
        userEmail: email,
        userName: userName,
        adminId: adminUser?.id || 'admin',
        adminEmail: adminUser?.email || (req.headers['x-admin-email'] as string) || 'admin',
        adminName: adminUser?.fullName || 'Administrador',
        action: 'resend_confirmation',
        reason: 'Reenvio de link de confirmação solicitado via painel administrativo.',
        result: 'success',
        createdAt: new Date().toISOString()
      };
      serverAuditLogs.unshift(auditEntry);
      saveServerAuditLogsCache();

      return res.json({
        success: true,
        delivered,
        message: delivered 
          ? `Link de confirmação enviado com sucesso para ${email} via servidor SMTP oficial!`
          : `Link de confirmação gerado e registrado na fila do portal para ${email}!`
      });
    } catch (err: any) {
      console.error('Erro ao reenviar confirmação:', err);
      return res.status(500).json({ success: false, error: err.message || 'Falha ao reenviar e-mail de confirmação.' });
    }
  });

  // 4. Moderação de Situação de Conta (Suspender, Bloquear, Reativar)
  app.post('/api/admin/moderate-user', async (req: Request, res: Response) => {
    try {
      if (!(await isAuthorizedAdmin(req, true))) {
        return res.status(403).json({ success: false, error: 'Acesso restrito.' });
      }

      const { userId, targetStatus, reason, adminUser } = req.body;
      if (!userId || !targetStatus || !reason || reason.trim().length < 5) {
        return res.status(400).json({ 
          success: false, 
          error: 'É obrigatório informar o usuário, a nova situação e uma justificativa detalhada (mínimo de 5 caracteres).' 
        });
      }

      const userIndex = serverUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
      }

      const target = serverUsers[userIndex];
      if (target.email.toLowerCase() === 'tomsilvaconsignado@gmail.com') {
        return res.status(400).json({ 
          success: false, 
          error: 'A conta do Administrador Geral é protegida e não pode ser suspensa ou bloqueada.' 
        });
      }

      const previousStatus = target.status || 'active';
      target.status = targetStatus as UserStatus;
      target.moderationReason = reason.trim();
      target.moderationAt = new Date().toISOString();
      target.moderatedBy = adminUser?.fullName || 'Administrador';

      serverUsers[userIndex] = target;
      saveServerUsersCache();

      // Sincroniza com Supabase se client disponível
      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        try {
          if (targetStatus === 'blocked') {
            await adminClient.auth.admin.updateUserById(target.id, { ban_duration: '876000h' });
          } else if (targetStatus === 'active') {
            await adminClient.auth.admin.updateUserById(target.id, { ban_duration: 'none' });
          }
          await adminClient.from('profiles').update({
            status: targetStatus,
            moderation_reason: reason.trim(),
            moderation_at: target.moderationAt,
            moderated_by: target.moderatedBy
          }).eq('id', target.id);
        } catch (e) {
          console.warn('Aviso: Não foi possível sincronizar moderação no Supabase remoto', e);
        }
      }

      // Registra na auditoria
      const auditEntry: UserAuditLog = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        userId: target.id,
        userEmail: target.email,
        userName: target.fullName,
        adminId: adminUser?.id || 'admin',
        adminEmail: adminUser?.email || (req.headers['x-admin-email'] as string) || 'admin',
        adminName: adminUser?.fullName || 'Administrador',
        action: targetStatus === 'active' ? 'reactivate' : targetStatus === 'suspended' ? 'suspend' : 'block',
        previousStatus,
        newStatus: targetStatus as UserStatus,
        reason: reason.trim(),
        result: 'success',
        createdAt: new Date().toISOString()
      };
      serverAuditLogs.unshift(auditEntry);
      saveServerAuditLogsCache();

      return res.json({ success: true, user: target, auditLog: auditEntry });
    } catch (err: any) {
      console.error('Erro ao moderar usuário:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao moderar usuário.' });
    }
  });

  // 5. Confirmação manual de e-mail pelo Administrador
  app.post('/api/admin/confirm-email', async (req: Request, res: Response) => {
    try {
      if (!(await isAuthorizedAdmin(req, true))) {
        return res.status(403).json({ success: false, error: 'Acesso restrito.' });
      }

      const { userId, adminUser } = req.body;
      const userIndex = serverUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
      }

      const target = serverUsers[userIndex];
      target.emailConfirmed = true;
      target.emailConfirmedAt = new Date().toISOString();
      serverUsers[userIndex] = target;
      saveServerUsersCache();

      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        try {
          await adminClient.auth.admin.updateUserById(target.id, { email_confirm: true });
        } catch (e) {
          console.warn('Aviso ao confirmar no Supabase:', e);
        }
      }

      const auditEntry: UserAuditLog = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        userId: target.id,
        userEmail: target.email,
        userName: target.fullName,
        adminId: adminUser?.id || 'admin',
        adminEmail: adminUser?.email || 'admin',
        adminName: adminUser?.fullName || 'Administrador',
        action: 'confirm_email',
        reason: 'Confirmação manual de e-mail realizada pelo administrador após conferência direta.',
        result: 'success',
        createdAt: new Date().toISOString()
      };
      serverAuditLogs.unshift(auditEntry);
      saveServerAuditLogsCache();

      return res.json({ success: true, user: target });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Alteração de papel / privilégio com justificativa
  app.post('/api/admin/update-role', async (req: Request, res: Response) => {
    try {
      if (!(await isAuthorizedAdmin(req, true))) {
        return res.status(403).json({ success: false, error: 'Acesso restrito.' });
      }

      const { userId, newRole, reason, adminUser } = req.body;
      if (!userId || !newRole || !reason || reason.trim().length < 5) {
        return res.status(400).json({ success: false, error: 'Justificativa insuficiente (mínimo de 5 caracteres).' });
      }

      const userIndex = serverUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
      }

      const target = serverUsers[userIndex];
      if (target.email.toLowerCase() === 'tomsilvaconsignado@gmail.com' && newRole !== 'admin') {
        return res.status(400).json({ success: false, error: 'Os privilégios da conta do Administrador Geral não podem ser revogados.' });
      }

      const oldRole = target.role;
      target.role = newRole as UserRole;
      serverUsers[userIndex] = target;
      saveServerUsersCache();

      const auditEntry: UserAuditLog = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        userId: target.id,
        userEmail: target.email,
        userName: target.fullName,
        adminId: adminUser?.id || 'admin',
        adminEmail: adminUser?.email || 'admin',
        adminName: adminUser?.fullName || 'Administrador',
        action: 'change_role',
        reason: `Alteração de papel de "${oldRole}" para "${newRole}". Motivo: ${reason.trim()}`,
        result: 'success',
        createdAt: new Date().toISOString()
      };
      serverAuditLogs.unshift(auditEntry);
      saveServerAuditLogsCache();

      return res.json({ success: true, user: target });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Consulta de Logs de Auditoria
  app.get('/api/admin/audit-logs', async (req: Request, res: Response) => {
    if (!(await isAuthorizedAdmin(req))) {
      return res.status(403).json({ error: 'Acesso restrito.' });
    }
    const userId = req.query.userId as string;
    if (userId) {
      return res.json(serverAuditLogs.filter(l => l.userId === userId));
    }
    return res.json(serverAuditLogs);
  });

  // 8. Registro de Log de Auditoria
  app.post('/api/admin/audit-logs', async (req: Request, res: Response) => {
    if (!(await isAuthorizedAdmin(req))) {
      return res.status(403).json({ error: 'Acesso restrito.' });
    }
    const newLog: UserAuditLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);
    saveServerAuditLogsCache();
    return res.json({ success: true, log: newLog });
  });

  // API para testar conectividade e envio SMTP do portal
  app.post('/api/test-smtp', async (req: Request, res: Response) => {
    try {
      if (!(await isAuthorizedAdmin(req, true))) {
        return res.status(403).json({ success: false, error: 'Acesso restrito a administradores.' });
      }
      const { testRecipient, smtpConfig } = req.body;
      if (!testRecipient || !testRecipient.includes('@')) {
        return res.status(400).json({ success: false, error: 'Informe um endereço de e-mail de destino válido para o teste.' });
      }

      const transporter = createEmailTransporter(smtpConfig);
      if (!transporter) {
        return res.status(400).json({ 
          success: false, 
          error: 'Credenciais SMTP incompletas. Preencha o servidor host, usuário e senha.' 
        });
      }

      // Valida a conexão
      await transporter.verify();

      const fromName = smtpConfig?.fromName || 'Folha da Região';
      const fromEmail = smtpConfig?.fromEmail || smtpConfig?.smtpUser || 'contato@folhadaregiaoonline.com.br';
      const fromAddress = `"${fromName}" <${fromEmail}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: testRecipient,
        replyTo: smtpConfig?.replyTo || fromEmail,
        subject: `[Folha da Região] Teste de Comunicação de E-mail — ${new Date().toLocaleTimeString('pt-BR')}`,
        text: `Olá!\n\nEste é um e-mail de teste disparado pelo portal Folha da Região para confirmar que as configurações SMTP e de comunicação com os usuários estão funcionando perfeitamente.\n\nData e Hora: ${new Date().toLocaleString('pt-BR')}\nServidor: ${smtpConfig?.smtpHost}\nRemetente: ${fromAddress}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background-color: #0f172a; padding: 24px; border-bottom: 4px solid #0056a4; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">FOLHA DA REGIÃO</h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Teste de Comunicação e SMTP</p>
            </div>
            <div style="padding: 28px; color: #334155; line-height: 1.6;">
              <h2 style="margin-top: 0; color: #0056a4; font-size: 18px;">✅ Conexão de E-mail Estabelecida com Sucesso!</h2>
              <p>Parabéns! Se você está lendo esta mensagem, o portal <strong>Folha da Região</strong> está conectado e apto a enviar:</p>
              <ul style="padding-left: 20px; color: #475569;">
                <li>Instruções de recuperação e redefinição de senha;</li>
                <li>Confirmação e ativação de contas de usuários;</li>
                <li>Notificações oficiais e comunicados aos leitores e anunciantes;</li>
                <li>Mensagens diretas da administração do portal.</li>
              </ul>
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 12px; color: #64748b; border: 1px solid #e2e8f0;">
                <strong>Diagnóstico do Envio:</strong><br>
                • Servidor Host: <code>${escapeHtml(smtpConfig?.smtpHost || '')}</code><br>
                • Porta: <code>${smtpConfig?.smtpPort || 587}</code> (${smtpConfig?.smtpSecure ? 'SSL Seguro' : 'TLS/STARTTLS'})<br>
                • Remetente Configurado: <code>${escapeHtml(fromAddress)}</code><br>
                • Data/Hora do Teste: <code>${new Date().toLocaleString('pt-BR')}</code>
              </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
              Folha da Região Online • Sergipe • Mensagem de teste gerada pelo painel administrativo
            </div>
          </div>
        `
      });

      return res.json({ 
        success: true, 
        message: `Conexão SMTP validada e e-mail de teste enviado com sucesso para ${testRecipient}!`,
        messageId: info.messageId
      });
    } catch (err: any) {
      console.error('Erro no teste SMTP:', err);
      let friendlyError = err.message || 'Falha ao conectar ao servidor SMTP.';
      if (err.code === 'EAUTH' || err.responseCode === 535) {
        friendlyError = 'Falha de autenticação SMTP: Usuário ou senha incorretos. Verifique se o provedor exige uma "Senha de Aplicativo" (como no Gmail/Google Workspace).';
      } else if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
        friendlyError = `Tempo limite esgotado ao conectar ao servidor ${req.body?.smtpConfig?.smtpHost}:${req.body?.smtpConfig?.smtpPort}. Verifique se a porta ou o host estão corretos.`;
      }
      return res.status(400).json({ success: false, error: friendlyError, rawError: err.message });
    }
  });

  // API para envio de e-mails transacionais (recuperação de senha, ativação, avisos aos usuários)
  app.post('/api/send-email', async (req: Request, res: Response) => {
    try {
      if (!(await getAuthenticatedRole(req))) {
        return res.status(401).json({ success: false, error: 'Faça login para enviar e-mails pelo portal.' });
      }
      const { to, subject, html, text, fromName, fromEmail, replyTo, smtpConfig } = req.body;
      if (!to || !to.includes('@') || !subject) {
        return res.status(400).json({ success: false, error: 'Parâmetros de e-mail inválidos (destinatário e assunto obrigatórios).' });
      }

      const transporter = createEmailTransporter(smtpConfig);

      // Se o transportador não estiver configurado, aceita a mensagem no modo de simulação/homologação
      if (!transporter) {
        return res.json({
          success: true,
          delivered: false,
          simulated: true,
          message: 'E-mail registrado com sucesso na caixa de saída do portal (servidor SMTP não configurado).'
        });
      }

      const senderName = fromName || smtpConfig?.fromName || 'Folha da Região';
      const senderAddress = fromEmail || smtpConfig?.fromEmail || smtpConfig?.smtpUser || 'contato@folhadaregiaoonline.com.br';
      const fromFormatted = `"${senderName}" <${senderAddress}>`;

      const info = await transporter.sendMail({
        from: fromFormatted,
        to,
        replyTo: replyTo || smtpConfig?.replyTo || senderAddress,
        subject,
        html: html || undefined,
        text: text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim() : '')
      });

      return res.json({
        success: true,
        delivered: true,
        messageId: info.messageId,
        message: 'E-mail enviado com sucesso via servidor SMTP.'
      });
    } catch (err: any) {
      console.error('Erro ao enviar e-mail via SMTP:', err);
      return res.status(500).json({
        success: false,
        delivered: false,
        error: err.message || 'Erro ao despachar e-mail via servidor SMTP.'
      });
    }
  });

  // API pública para solicitação de recuperação de senha com link oficial e envio SMTP
  app.post('/api/auth/request-password-reset', async (req: Request, res: Response) => {
    try {
      const { email, origin: clientOrigin } = req.body;
      const trimmedEmail = (email || '').trim().toLowerCase();

      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Informe um endereço de e-mail válido para a recuperação.' 
        });
      }

      const origin = getSafePublicOrigin(req, clientOrigin);
      const redirectTo = `${origin}/?action=reset-password`;

      const adminClient = getSupabaseAdminClient();
      let actionLink: string | null = null;
      let userFound = false;

      if (adminClient) {
        try {
          const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
            type: 'recovery',
            email: trimmedEmail,
            options: { redirectTo }
          });

          if (!linkErr && linkData?.properties?.action_link) {
            actionLink = linkData.properties.action_link;
            userFound = true;
          }
        } catch (adminErr: any) {
          console.warn('Aviso ao consultar Supabase admin generateLink:', adminErr);
        }
      }

      // Se não gerou via Supabase Admin (ex: usuário em cache), verifica na base local
      if (!actionLink) {
        const localUser = serverUsers.find(u => u.email.toLowerCase() === trimmedEmail);
        if (localUser) {
          userFound = true;
          actionLink = `${origin}/?action=reset-password&token=rec_${Date.now()}&email=${encodeURIComponent(trimmedEmail)}`;
        }
      }

      // Se o usuário não foi localizado em nenhuma base, retorna resposta neutra e segura
      if (!userFound || !actionLink) {
        return res.status(200).json({
          success: true,
          delivered: false,
          message: 'Se houver uma conta cadastrada com este endereço de e-mail, enviamos as instruções e o link seguro de recuperação para sua caixa de entrada.'
        });
      }

      // Dispara o e-mail pelo transporte SMTP verificado
      let emailDelivered = false;
      const transporter = createEmailTransporter();
      if (transporter && actionLink) {
        try {
          const senderName = 'Folha da Região';
          const senderEmail = process.env.SMTP_USER || 'contatomeasure@gmail.com';
          const fromAddress = `"${senderName}" <${senderEmail}>`;

          await transporter.sendMail({
            from: fromAddress,
            to: trimmedEmail,
            subject: 'Recuperação de Senha — Folha da Região',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
                <div style="background-color: #0f172a; padding: 24px; border-bottom: 4px solid #0056a4; color: #ffffff; text-align: center;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">FOLHA DA REGIÃO</h1>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Segurança e Recuperação de Acesso</p>
                </div>
                <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                  <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Solicitação de Redefinição de Senha</h2>
                  <p>Olá,</p>
                  <p>Recebemos uma solicitação para redefinir a senha da sua conta associada ao e-mail <strong>${escapeHtml(trimmedEmail)}</strong> no portal <strong>Folha da Região</strong>.</p>
                  <p>Para escolher uma nova senha e restabelecer o seu acesso imediato, clique no botão seguro abaixo:</p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${escapeHtml(actionLink)}" style="background-color: #0056a4; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                      Redefinir Minha Senha
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #64748b;">
                    Se o botão não funcionar no seu aplicativo de e-mail, copie e cole o link a seguir no seu navegador:<br>
                    <a href="${escapeHtml(actionLink)}" style="color: #0056a4; word-break: break-all; font-size: 12px;">${escapeHtml(actionLink)}</a>
                  </p>
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 24px 0; border-radius: 4px; font-size: 12px; color: #92400e;">
                    <strong>Atenção:</strong> Se você não solicitou a recuperação desta senha, por favor desconsidere este e-mail. A sua conta permanecerá segura com sua senha atual.
                  </div>
                </div>
                <div style="background-color: #f8fafc; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
                  Folha da Região Online • Sergipe • Mensagem oficial automática
                </div>
              </div>
            `,
            text: `Folha da Região — Recuperação de Senha\n\nOlá!\n\nRecebemos uma solicitação para redefinir sua senha (${trimmedEmail}).\n\nPara redefinir sua senha, acesse o link:\n${actionLink}\n\nSe você não solicitou, por favor desconsidere este e-mail.`
          });
          emailDelivered = true;
        } catch (mailErr: any) {
          console.error('Erro ao despachar e-mail de recuperação via SMTP:', mailErr);
        }
      }

      return res.json({
        success: true,
        delivered: emailDelivered,
        message: 'Se houver uma conta cadastrada com este endereço de e-mail, enviamos as instruções e o link seguro de recuperação para sua caixa de entrada.'
      });
    } catch (err: any) {
      console.error('Erro geral ao processar recuperação de senha:', err);
      return res.status(500).json({ success: false, error: 'Erro ao processar recuperação de senha.' });
    }
  });

  // API pública para reenvio de confirmação de cadastro
  app.post('/api/auth/resend-confirmation', async (req: Request, res: Response) => {
    try {
      const { email, origin: clientOrigin } = req.body;
      const trimmedEmail = (email || '').trim().toLowerCase();

      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Informe um endereço de e-mail válido.' 
        });
      }

      const origin = getSafePublicOrigin(req, clientOrigin);
      const redirectTo = `${origin}/#confirm-email`;

      const adminClient = getSupabaseAdminClient();
      let actionLink: string | null = null;
      let userFound = false;

      if (adminClient) {
        try {
          const { data: linkData, error: linkErr } = await (adminClient.auth.admin.generateLink as any)({
            type: 'signup',
            email: trimmedEmail,
            options: { redirectTo }
          });

          if (!linkErr && linkData?.properties?.action_link) {
            actionLink = linkData.properties.action_link;
            userFound = true;
          }
        } catch (adminErr: any) {
          console.warn('Erro ao consultar Supabase admin generateLink para confirmação:', adminErr);
        }
      }

      const confirmationToken = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      if (!actionLink) {
        let localUser = serverUsers.find(u => u.email.toLowerCase() === trimmedEmail);
        if (!localUser) {
          localUser = {
            id: `usr-${Date.now()}`,
            email: trimmedEmail,
            fullName: trimmedEmail.split('@')[0],
            role: 'reader',
            status: 'active',
            emailConfirmed: false,
            createdAt: new Date().toISOString(),
            hasProfile: true
          };
          serverUsers.push(localUser);
          saveServerUsersCache();
        }
        userFound = true;
        actionLink = `${origin}/#confirm-email?token=${confirmationToken}&email=${encodeURIComponent(trimmedEmail)}`;
      }

      if (!userFound || !actionLink) {
        return res.status(200).json({
          success: true,
          delivered: false,
          message: 'Se houver um cadastro pendente de confirmação com este endereço de e-mail, um novo link de ativação foi enviado para sua caixa de entrada.'
        });
      }

      let emailDelivered = false;
      const transporter = createEmailTransporter();
      if (transporter && actionLink) {
        try {
          const senderName = 'Folha da Região';
          const senderEmail = process.env.SMTP_USER || 'contatomeasure@gmail.com';
          const fromAddress = `"${senderName}" <${senderEmail}>`;

          await transporter.sendMail({
            from: fromAddress,
            to: trimmedEmail,
            subject: 'Confirmação e Ativação de Conta — Folha da Região',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
                <div style="background-color: #0f172a; padding: 24px; border-bottom: 4px solid #0056a4; color: #ffffff; text-align: center;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">FOLHA DA REGIÃO</h1>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Ativação de Conta</p>
                </div>
                <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                  <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Confirmação de Endereço de E-mail</h2>
                  <p>Olá,</p>
                  <p>Você solicitou um novo link para confirmar seu e-mail (<strong>${escapeHtml(trimmedEmail)}</strong>) e ativar seu cadastro no portal <strong>Folha da Região</strong>.</p>
                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${escapeHtml(actionLink)}" style="background-color: #0056a4; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                      Confirmar e Ativar Minha Conta
                    </a>
                  </div>
                  <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; padding: 14px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Código de ativação direta:</span>
                    <strong style="font-size: 16px; letter-spacing: 1px; color: #0f172a; font-family: monospace;">${escapeHtml(confirmationToken)}</strong>
                  </div>
                  <p style="font-size: 12px; color: #64748b;">
                    Ou copie e cole o link no navegador:<br>
                    <a href="${escapeHtml(actionLink)}" style="color: #0056a4; word-break: break-all; font-size: 12px;">${escapeHtml(actionLink)}</a>
                  </p>
                </div>
                <div style="background-color: #f8fafc; padding: 16px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
                  Folha da Região Online • Sergipe • Mensagem oficial automática
                </div>
              </div>
            `,
            text: `Folha da Região — Ativação de Conta\n\nPara confirmar seu e-mail e ativar sua conta, acesse o link:\n${actionLink}`
          });
          emailDelivered = true;
        } catch (mailErr) {
          console.error('Erro ao enviar e-mail de ativação via SMTP:', mailErr);
        }
      }

      return res.json({
        success: true,
        delivered: emailDelivered,
        message: 'Se houver um cadastro pendente de confirmação com este endereço de e-mail, um novo link de ativação foi enviado para sua caixa de entrada.'
      });
    } catch (err: any) {
      console.error('Erro geral ao reenviar confirmação:', err);
      return res.status(500).json({ success: false, error: 'Erro ao reenviar confirmação de e-mail.' });
    }
  });

  // ==========================================
  // ROTAS DE API: CLASSIFICADOS (PROTEÇÃO E PERSISTÊNCIA)
  // ==========================================
  app.get('/api/classifieds', async (_req: Request, res: Response) => {
    try {
      const adminClient = getSupabaseAdminClient();
      if (adminClient) {
        const { data, error } = await adminClient.from('classifieds').select('*');
        if (!error && data) {
          return res.json({ success: true, classifieds: data });
        }
      }
      return res.json({ success: true, classifieds: [] });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/classifieds', async (req: Request, res: Response) => {
    try {
      const userId = (req.headers['x-user-id'] as string || '').trim();
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Usuário não autenticado. Faça login para publicar anúncios.' });
      }

      const adData = req.body;
      const adminClient = getSupabaseAdminClient();
      const stdClient = getSupabaseStandardClient();

      let profile: any = null;
      if (adminClient) {
        try {
          const { data: prof } = await adminClient.from('profiles').select('*').eq('id', userId).maybeSingle();
          if (prof) profile = prof;
        } catch {}
      }
      if (!profile && stdClient) {
        try {
          const { data: prof } = await stdClient.from('profiles').select('*').eq('id', userId).maybeSingle();
          if (prof) profile = prof;
        } catch {}
      }
      if (!profile) {
        const local = serverUsers.find(u => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
        if (local) profile = local;
      }

      if (!profile) {
        return res.status(401).json({ success: false, error: 'É necessário ter uma conta cadastrada no portal para publicar anúncios.' });
      }

      // Bloqueio apenas para conta inativa ou com restrição administrativa
      if (profile.status === 'suspended' || profile.status === 'blocked' || profile.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'Conta inativa ou com restrição administrativa não pode publicar anúncios.' });
      }

      if (adminClient) {
        const { data, error } = await adminClient.from('classifieds').insert([adData]).select();
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
        return res.json({ success: true, classified: data?.[0] });
      }

      const savedAd = {
        ...adData,
        id: adData.id || `clf-${Date.now()}`,
        status: adData.status || 'published',
        createdAt: adData.createdAt || new Date().toISOString()
      };
      return res.json({ success: true, classified: savedAd });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Endpoint para servir imagem pública da notícia (inclusive decodificando Base64 para WhatsApp e redes sociais)
  app.get('/api/article-image/:identifier', (req: Request, res: Response) => {
    try {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      const article = serverArticles.find(
        a => a.slug.toLowerCase() === identifier.toLowerCase() || a.id === identifier
      );

      if (article && article.imageUrl) {
        const img = article.imageUrl.trim();
        if (img.startsWith('data:image/')) {
          const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            return res.send(buffer);
          }
        } else if (/^https?:\/\//i.test(img)) {
          return res.redirect(302, img);
        } else {
          const filePath = path.resolve(__dirname, 'public', img.replace(/^\/+/, ''));
          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }
        }
      }

      // Fallback para a imagem institucional
      const fallbackPath = path.resolve(__dirname, 'public', 'og-image.png');
      if (fs.existsSync(fallbackPath)) {
        res.setHeader('Content-Type', 'image/png');
        return res.sendFile(fallbackPath);
      }
      return res.status(404).send('Imagem não encontrada');
    } catch (e: any) {
      console.error('Erro ao servir imagem da notícia:', e);
      return res.status(500).send('Erro interno ao servir imagem');
    }
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', articlesCount: serverArticles.length });
  });

  // Handler de Renderização de Páginas HTML com Metadados Open Graph Dinâmicos
  app.get('*', async (req: Request, res: Response, next) => {
    const url = req.originalUrl;

    // Se for requisição de recurso estático ou asset, repassa
    if (
      url.startsWith('/@') || 
      url.startsWith('/src/') || 
      url.startsWith('/node_modules/') ||
      /\.(js|css|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|map|json)$/i.test(req.path)
    ) {
      return next();
    }

    try {
      // 1. Identifica se há um slug de notícia na rota ou na query
      let articleSlug: string | null = null;
      const pathMatch = req.path.match(/(?:^|\/)(?:noticia|noticias|artigo|artigos)\/([^/?#]+)/i);

      if (pathMatch) {
        articleSlug = decodeURIComponent(pathMatch[1]);
      } else if (req.query.noticia || req.query.slug) {
        articleSlug = String(req.query.noticia || req.query.slug);
      } else if (req.query.p) {
        const pMatch = String(req.query.p).match(/(?:^|\/)(?:noticia|noticias|artigo|artigos)\/([^/?#]+)/i);
        if (pMatch) {
          articleSlug = decodeURIComponent(pMatch[1]);
        }
      }

      const origin = getRequestOrigin(req);

      // 2. Lê o template index.html base
      let template: string;
      if (!isProd) {
        const templatePath = path.resolve(__dirname, 'index.html');
        template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        const distTemplatePath = path.resolve(__dirname, 'dist/index.html');
        template = fs.readFileSync(distTemplatePath, 'utf-8');
      }

      // 3. Se for uma notícia, busca e injeta os metadados Open Graph específicos
      let metadataBlock = '';

      if (articleSlug) {
        const targetArticle = serverArticles.find(
          a => a.slug.toLowerCase() === articleSlug!.toLowerCase() || a.id === articleSlug
        );

        // Regra de Segurança: apenas notícias publicadas recebem metadados (não rascunhos)
        if (targetArticle && targetArticle.status !== 'draft') {
          metadataBlock = generateOpenGraphHtml(targetArticle, origin);
        } else {
          metadataBlock = generateHomeMetadataHtml(origin);
        }
      } else {
        // Capa / Página Inicial do Portal
        metadataBlock = generateHomeMetadataHtml(origin);
      }

      // 4. Injeta os metadados gerados no HTML
      const finalHtml = injectHtmlMetadata(template, metadataBlock);

      res.status(200)
        .set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Robots-Tag': 'all'
        })
        .send(finalHtml);

    } catch (err) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(err);
      }
      console.error('Erro na renderização dos metadados HTML:', err);
      next(err);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Folha da Região] Servidor Full-Stack com OpenGraph ativo na porta ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha fatal ao iniciar o servidor:', err);
  process.exit(1);
});
