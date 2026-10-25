import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROJECT_ARTICLES } from '../src/data/initialData';
import { Article } from '../src/types/database';

// Gera um SQL de importação de notícias a partir do backup exportado do portal original
// (JSON com main_image_url, category.name, published_at...).
//
// Uso: npx tsx scripts/build_articles_seed.ts <backup.json> [saida.sql]
//
// - Inclui as matérias que já estão no projeto (src/data/initialData.ts) e acrescenta
//   apenas as do backup que ainda não existem, comparando por slug e por título.
// - Grava também src/data/backupArticles.json, que o portal soma às matérias iniciais:
//   assim elas aparecem no site, na pré-renderização e no "Importar conteúdo" do painel.
// - O SQL usa ON CONFLICT DO NOTHING: rodar mais de uma vez não duplica nada e não
//   altera matérias que já estejam no banco.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

interface BackupArticle {
  id: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  slug: string;
  main_image_url: string | null;
  video_url: string | null;
  status: string;
  type: string;
  views_count: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  category: { name: string; slug: string } | null;
}

const DEFAULT_AUTHOR = 'Redação Folha da Região';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&h=600&fit=crop';

const normalizeTitle = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// O backup guarda texto puro; o portal exibe o conteúdo como HTML
const textToHtml = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(block => block.split('\n').map(line => line.replace(/ /g, ' ').trim()).filter(Boolean))
    .filter(lines => lines.length > 0)
    .map(lines => {
      const html = lines.map(escapeHtml).join('<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return `<p>${html}</p>`;
    })
    .join('\n');

const cleanExcerpt = (excerpt: string | null): string | null => {
  const value = (excerpt || '').replace(/\s+/g, ' ').trim();
  return value.length > 0 ? value : null;
};

const sql = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${value.replace(/'/g, "''")}'`;
};

interface SeedRow {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  content: string;
  category: string;
  imageUrl: string;
  videoUrl: string | null;
  isVideo: boolean;
  isHero: boolean;
  isSecondary: boolean;
  viewsCount: number;
  author: string;
  createdAt: string;
  updatedAt: string;
}

const fromProject = (a: Article, publishedAt: string | undefined): SeedRow => ({
  id: a.id,
  title: a.title,
  subtitle: a.subtitle || null,
  slug: a.slug,
  content: a.content.trim(),
  category: a.category,
  imageUrl: a.imageUrl || DEFAULT_IMAGE,
  videoUrl: a.videoUrl || null,
  isVideo: Boolean(a.isVideo || a.videoUrl),
  isHero: Boolean(a.isHero),
  isSecondary: Boolean(a.isSecondary),
  viewsCount: a.viewsCount || 0,
  author: a.author || DEFAULT_AUTHOR,
  // As datas das matérias de exemplo são relativas a "agora"; usa a data real de publicação do backup
  createdAt: publishedAt || a.createdAt,
  updatedAt: publishedAt || a.updatedAt || a.createdAt
});

const fromBackup = (b: BackupArticle): SeedRow => ({
  id: b.id,
  title: b.title.trim(),
  subtitle: cleanExcerpt(b.subtitle) || cleanExcerpt(b.excerpt),
  slug: b.slug,
  content: textToHtml(b.content),
  category: b.category?.name || 'Cidades',
  imageUrl: b.main_image_url || DEFAULT_IMAGE,
  videoUrl: b.video_url || null,
  isVideo: Boolean(b.video_url) || b.type === 'video',
  isHero: false,
  isSecondary: false,
  viewsCount: b.views_count || 0,
  author: DEFAULT_AUTHOR,
  createdAt: b.published_at || b.created_at,
  updatedAt: b.updated_at || b.created_at
});

const toInsert = (r: SeedRow): string =>
  `(${[
    sql(r.id), sql(r.title), sql(r.subtitle), sql(r.slug), sql(r.content), sql(r.category),
    sql(r.imageUrl), sql(r.videoUrl), sql(r.isVideo), sql(r.isHero), sql(r.isSecondary),
    sql(r.viewsCount), sql(r.author), sql('published'), sql(r.createdAt), sql(r.updatedAt)
  ].join(', ')})`;

function run() {
  const [inputArg, outputArg] = process.argv.slice(2);
  if (!inputArg) {
    console.error('[Seed] Uso: npx tsx scripts/build_articles_seed.ts <backup.json> [saida.sql]');
    process.exit(1);
  }

  const backup: BackupArticle[] = JSON.parse(fs.readFileSync(path.resolve(inputArg), 'utf-8'));
  const published = backup.filter(b => b.status === 'published');
  const backupBySlug = new Map(published.map(b => [b.slug, b]));

  const projectSlugs = new Set(PROJECT_ARTICLES.map(a => a.slug));
  const projectTitles = new Set(PROJECT_ARTICLES.map(a => normalizeTitle(a.title)));

  const projectRows = PROJECT_ARTICLES.map(a => fromProject(a, backupBySlug.get(a.slug)?.published_at || undefined));
  const missing = published.filter(b => !projectSlugs.has(b.slug) && !projectTitles.has(normalizeTitle(b.title)));
  const missingRows = missing.map(fromBackup);
  const rows = [...projectRows, ...missingRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const outputPath = path.resolve(outputArg || path.join(rootDir, 'supabase', 'seed', 'articles_seed.sql'));
  const header = `-- ==============================================================================
-- IMPORTAÇÃO DE NOTÍCIAS - Folha da Região Online
-- Gerado por scripts/build_articles_seed.ts a partir de ${path.basename(inputArg)}
-- ${projectRows.length} matérias do projeto + ${missing.length} do backup que ainda não existiam
-- (${published.length - missing.length} do backup foram ignoradas por já existirem no projeto)
--
-- Pré-requisito: migração 20261024000000_supabase_source_of_truth.sql aplicada.
-- Para executar: Supabase -> SQL Editor -> cole este arquivo inteiro -> Run
-- Pode ser executado mais de uma vez: registros já existentes (mesmo id ou slug)
-- são mantidos como estão.
-- ==============================================================================

BEGIN;

-- Sem isto, cada matéria importada geraria notificações para os leitores
ALTER TABLE public.articles DISABLE TRIGGER notify_readers_of_article;

INSERT INTO public.articles
  (id, title, subtitle, slug, content, category, image_url, video_url, is_video, is_hero, is_secondary, views_count, author, status, created_at, updated_at)
VALUES
`;
  const footer = `
ON CONFLICT DO NOTHING;

ALTER TABLE public.articles ENABLE TRIGGER notify_readers_of_article;

COMMIT;
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, header + rows.map(toInsert).join(',\n') + footer, 'utf-8');

  const publishedAt: Record<string, string> = {};
  for (const a of PROJECT_ARTICLES) {
    const date = backupBySlug.get(a.slug)?.published_at;
    if (date) publishedAt[a.slug] = date;
  }
  const jsonPath = path.join(rootDir, 'src', 'data', 'backupArticles.json');
  const jsonArticles: Article[] = missingRows.map(r => ({
    id: r.id,
    title: r.title,
    ...(r.subtitle ? { subtitle: r.subtitle } : {}),
    slug: r.slug,
    content: r.content,
    category: r.category,
    imageUrl: r.imageUrl,
    ...(r.videoUrl ? { videoUrl: r.videoUrl } : {}),
    isVideo: r.isVideo,
    viewsCount: r.viewsCount,
    author: r.author,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    status: 'published'
  }));
  fs.writeFileSync(jsonPath, JSON.stringify({ publishedAt, articles: jsonArticles }, null, 1) + '\n', 'utf-8');

  console.log(`[Seed] Backup: ${backup.length} matérias (${published.length} publicadas).`);
  console.log(`[Seed] Já existentes no projeto: ${published.length - missing.length}. Novas: ${missing.length}.`);
  console.log(`[Seed] Total no SQL: ${rows.length}. Arquivo: ${path.relative(rootDir, outputPath)}`);
  console.log(`[Seed] ${jsonArticles.length} matérias gravadas em ${path.relative(rootDir, jsonPath)}`);
}

run();
