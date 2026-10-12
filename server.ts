import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_ARTICLES } from './src/data/initialData.ts';
import { Article } from './src/types/database.ts';
import { generateOpenGraphHtml, getAbsoluteImageUrl, escapeHtml, DEFAULT_PORTAL_DOMAIN } from './src/lib/seo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

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

/**
 * Obtém a origem (protocolo + domínio) da requisição com suporte a proxies
 */
function getRequestOrigin(req: Request): string {
  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host') || 'folhadaregiaonline.com.br';
  const proto = forwardedProto || (req.secure ? 'https' : 'http');
  return `${proto}://${host}`;
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

      const existingIndex = serverArticles.findIndex(a => a.id === article.id || a.slug === article.slug);
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
      const pathMatch = req.path.match(/^\/(?:noticia|noticias|artigo|artigos)\/([^/?#]+)/i);

      if (pathMatch) {
        articleSlug = decodeURIComponent(pathMatch[1]);
      } else if (req.query.noticia || req.query.slug || req.query.p) {
        articleSlug = String(req.query.noticia || req.query.slug || req.query.p);
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
