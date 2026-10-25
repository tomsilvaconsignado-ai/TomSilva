import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_ARTICLES } from '../src/data/initialData';
import { Article, ClassifiedItem } from '../src/types/database';
import { generateOpenGraphHtml, generateClassifiedOpenGraphHtml, escapeHtml, DEFAULT_PORTAL_DOMAIN } from '../src/lib/seo';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../src/lib/supabaseConfig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

// Lê as matérias publicadas pela API REST do Supabase com a chave pública (anon)
async function fetchPublishedArticles(): Promise<Article[]> {
  const url = (process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
  const key = (process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  try {
    const resp = await fetch(
      `${url}/rest/v1/articles?select=id,title,subtitle,slug,content,category,image_url,video_url,is_video,author,views_count,created_at,updated_at,status&status=eq.published&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!resp.ok) {
      console.warn(`[SSG Pre-render] Supabase respondeu ${resp.status}; usando matérias iniciais.`);
      return [];
    }
    const rows: any[] = await resp.json();
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle || undefined,
      slug: r.slug,
      content: r.content,
      category: r.category,
      imageUrl: r.image_url,
      videoUrl: r.video_url || undefined,
      isVideo: Boolean(r.is_video),
      viewsCount: r.views_count || 0,
      author: r.author || 'Folha da Região',
      createdAt: r.created_at,
      updatedAt: r.updated_at || undefined,
      status: r.status || 'published'
    }));
  } catch (e) {
    console.warn('[SSG Pre-render] Não foi possível consultar o Supabase; usando matérias iniciais.', e);
    return [];
  }
}

// Lê os anúncios publicados e ainda válidos dos classificados (a leitura pública é liberada pelo RLS)
async function fetchPublishedClassifieds(): Promise<ClassifiedItem[]> {
  const url = (process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
  const key = (process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  try {
    const resp = await fetch(
      `${url}/rest/v1/classifieds?select=id,code,slug,title,description,section,type,category,price_type,price,city,state,images,status,created_at,updated_at,expires_at&status=eq.published&order=created_at.desc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!resp.ok) {
      console.warn(`[SSG Pre-render] Supabase respondeu ${resp.status} ao listar classificados; nenhum anúncio pré-renderizado.`);
      return [];
    }
    const now = Date.now();
    const rows: any[] = await resp.json();
    return rows
      .filter(r => r.slug && (!r.expires_at || new Date(r.expires_at).getTime() > now))
      .map(r => ({
        id: r.id,
        code: r.code,
        userId: '',
        section: r.section,
        type: r.type,
        category: r.category || '',
        title: r.title,
        slug: r.slug,
        description: r.description || '',
        priceType: r.price_type || 'fixed',
        price: r.price !== null && r.price !== undefined ? Number(r.price) : undefined,
        city: r.city || '',
        state: r.state || '',
        advertiserName: '',
        phone: '',
        images: Array.isArray(r.images) ? r.images : [],
        status: r.status,
        viewsCount: 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at || undefined,
        expiresAt: r.expires_at
      }));
  } catch (e) {
    console.warn('[SSG Pre-render] Não foi possível consultar os classificados no Supabase.', e);
    return [];
  }
}

// Monta a página estática: metadados próprios no <head> e caminhos de assets a 2 níveis da raiz
function buildStaticPage(baseHtml: string, metaBlock: string, routeScript: string): string {
  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']description["'][\s\S]*?>/gi, '')
    .replace(/<meta\s+property=["']og:[\s\S]*?>/gi, '')
    .replace(/<meta\s+name=["']twitter:[\s\S]*?>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][\s\S]*?>/gi, '');

  html = html.replace('<head>', `<head>\n${metaBlock}\n`);
  html = html.replace('</head>', `  <script>${routeScript}</script>\n</head>`);

  return html
    .replace(/(src|href)=["']\.\/assets\//g, '$1="../../assets/')
    .replace(/(src|href)=["']\.\/vetor\.svg["']/g, '$1="../../vetor.svg"')
    .replace(/(src|href)=["']\.\/logo\.svg["']/g, '$1="../../logo.svg"')
    .replace(/(src|href)=["']\.\/og-image\.png["']/g, '$1="../../og-image.png"')
    .replace(/(src|href)=["']\/assets\//g, '$1="../../assets/');
}

// Grava a página em /<pasta>/<slug>/ (e na cópia /<repo>/... quando o site está em github.io/<repo>)
function writeStaticPage(folders: string[], slug: string, html: string) {
  const targets = folders.map(folder => path.resolve(distDir, folder, slug));
  if (process.env.GITHUB_REPOSITORY && !process.env.CUSTOM_DOMAIN) {
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    if (repo && !repo.endsWith('.github.io')) {
      folders.forEach(folder => targets.push(path.resolve(distDir, repo, folder, slug)));
    }
  }
  for (const targetFolder of targets) {
    fs.mkdirSync(targetFolder, { recursive: true });
    fs.writeFileSync(path.resolve(targetFolder, 'index.html'), html, 'utf-8');
  }
}

async function runPrerender() {
  console.log('[SSG Pre-render] Iniciando pré-renderização estática das notícias para GitHub Pages...');

  const templatePath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error('[SSG Pre-render] Erro: dist/index.html não foi encontrado. Execute vite build primeiro.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(templatePath, 'utf-8');

  // 1. Carrega as notícias publicadas no Supabase (fonte oficial); sem elas, usa as iniciais e o cache local
  let articles: Article[] = await fetchPublishedArticles();
  if (articles.length > 0) {
    console.log(`[SSG Pre-render] ${articles.length} matérias carregadas do Supabase.`);
  } else {
    articles = [...INITIAL_ARTICLES];
  }
  const cachePath = path.resolve(rootDir, 'data_articles_cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      const raw = fs.readFileSync(cachePath, 'utf-8');
      const cached = JSON.parse(raw);
      if (Array.isArray(cached) && cached.length > 0) {
        const map = new Map<string, Article>();
        articles.forEach(a => map.set(a.slug.toLowerCase(), a));
        cached.forEach((a: Article) => map.set(a.slug.toLowerCase(), a));
        articles = Array.from(map.values());
      }
    } catch (e) {
      console.warn('[SSG Pre-render] Não foi possível ler cache local de notícias', e);
    }
  }

  // 2. Determina a origem pública e base para metadados
  let origin = DEFAULT_PORTAL_DOMAIN;
  if (process.env.CUSTOM_DOMAIN) {
    origin = `https://${process.env.CUSTOM_DOMAIN.replace(/\/+$/, '')}`;
  } else if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if (owner && repo) {
      origin = `https://${owner}.github.io/${repo}`;
    }
  }

  console.log(`[SSG Pre-render] Domínio canônico configurado: ${origin}`);
  console.log(`[SSG Pre-render] Total de matérias a processar: ${articles.length}`);

  let generatedCount = 0;

  // 3. Para cada notícia publicada, gera o arquivo estático com Open Graph no head
  for (const article of articles) {
    if (article.status === 'draft') continue;
    // Sistemas de arquivos limitam o nome da pasta a 255 bytes; slugs maiores (há matérias antigas
    // com o texto inteiro no slug) continuam abrindo pelo roteamento do SPA via 404.html
    if (Buffer.byteLength(article.slug, 'utf-8') > 200) {
      console.warn(`[SSG Pre-render] Slug longo demais, sem página estática: ${article.title}`);
      continue;
    }

    const metaBlock = generateOpenGraphHtml(article, origin);
    const html = buildStaticPage(baseHtml, metaBlock, `window.__INITIAL_ARTICLE_SLUG__ = "${escapeHtml(article.slug)}";`);
    writeStaticPage(['noticia', 'noticias'], article.slug, html);

    generatedCount++;
  }

  // 3.b Classificados: uma página por anúncio com a primeira foto, o título e o nome do portal
  const classifieds = await fetchPublishedClassifieds();
  let classifiedCount = 0;
  for (const item of classifieds) {
    if (Buffer.byteLength(item.slug, 'utf-8') > 200) continue;
    const metaBlock = generateClassifiedOpenGraphHtml(item, origin);
    const html = buildStaticPage(baseHtml, metaBlock, `window.__INITIAL_CLASSIFIED_SLUG__ = "${escapeHtml(item.slug)}";`);
    writeStaticPage(['classificado'], item.slug, html);
    classifiedCount++;
  }
  console.log(`[SSG Pre-render] ${classifiedCount} anúncios dos classificados pré-renderizados em /classificado/.`);

  // 4. Garante que .nojekyll e 404.html estejam presentes no dist
  const nojekyllSrc = path.resolve(rootDir, 'public/.nojekyll');
  const nojekyllDest = path.resolve(distDir, '.nojekyll');
  if (fs.existsSync(nojekyllSrc) && !fs.existsSync(nojekyllDest)) {
    fs.copyFileSync(nojekyllSrc, nojekyllDest);
  } else if (!fs.existsSync(nojekyllDest)) {
    fs.writeFileSync(nojekyllDest, '', 'utf-8');
  }

  const notFoundSrc = path.resolve(rootDir, 'public/404.html');
  const notFoundDest = path.resolve(distDir, '404.html');
  if (fs.existsSync(notFoundSrc) && !fs.existsSync(notFoundDest)) {
    fs.copyFileSync(notFoundSrc, notFoundDest);
  }

  console.log(`[SSG Pre-render] Sucesso! ${generatedCount} notícias pré-renderizadas com Open Graph completo em /noticia/ e /noticias/.`);
  console.log('[SSG Pre-render] Arquivos .nojekyll e 404.html verificados e configurados para GitHub Pages.');
}

runPrerender().catch(err => {
  console.error('[SSG Pre-render] Falha crítica:', err);
  process.exit(1);
});
