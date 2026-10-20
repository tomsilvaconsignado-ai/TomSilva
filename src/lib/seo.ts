import { Article } from '../types/database';

/**
 * Utilitários de SEO e Metadados Open Graph para WhatsApp e Redes Sociais
 */

// Domínio padrão de fallback seguro se não for possível inferir do ambiente
export const DEFAULT_PORTAL_DOMAIN = 'https://tomsilvaconsignado-ai.github.io/TomSilva';

export const escapeHtml = (text: string = ''): string => {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const stripHtml = (html: string = ''): string => {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Retorna o caminho base da aplicação (suporta tanto domínios raiz quanto subdiretórios no GitHub Pages)
 */
export const getAppBasePath = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Tenta obter a base configurada pelo Vite
    const viteBase = (import.meta as any).env?.BASE_URL;
    if (viteBase && viteBase !== './' && viteBase !== '.') {
      return viteBase.endsWith('/') ? viteBase : `${viteBase}/`;
    }

    // 2. Se estiver em subdiretório do GitHub Pages (ex: tomsilva.github.io/nome-do-repo/)
    if (window.location.hostname.endsWith('github.io')) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && !['noticia', 'noticias', 'artigo', 'artigos'].includes(parts[0].toLowerCase())) {
        return `/${parts[0]}/`;
      }
    }

    // 3. Fallback: extrai subdiretório anterior a rotas conhecidas de matérias
    const match = window.location.pathname.match(/^(\/[^/]+)\/(?:noticia|noticias|artigo|artigos)/i);
    if (match && match[1]) {
      return `${match[1]}/`;
    }
  }

  const base = (import.meta as any).env?.BASE_URL || '/';
  return (base === './' || base === '.') ? '/' : (base.endsWith('/') ? base : `${base}/`);
};

/**
 * Retorna a URL canônica e permanente de uma notícia
 * Preserva o domínio real e o subdiretório do repositório no GitHub Pages
 */
export const getArticleCanonicalUrl = (slug: string, customOrigin?: string): string => {
  let origin = customOrigin;
  let basePath = '/';

  if (!origin && typeof window !== 'undefined' && window.location?.origin) {
    origin = window.location.origin;
    basePath = getAppBasePath();
  }

  if (!origin) {
    origin = DEFAULT_PORTAL_DOMAIN;
    basePath = '/';
  }

  // Remove barras no final da origem
  origin = origin.replace(/\/+$/, '');
  
  // Normaliza o basePath garantindo barras adequadas
  const cleanBase = basePath.startsWith('/') ? basePath : `/${basePath}`;
  const formattedBase = cleanBase.endsWith('/') ? cleanBase : `${cleanBase}/`;

  return `${origin}${formattedBase}noticia/${encodeURIComponent(slug)}`;
};

/**
 * Garante que a URL da imagem seja pública, absoluta e adequada para prévias
 */
export const getAbsoluteImageUrl = (imageUrl?: string, customOrigin?: string, articleSlugOrId?: string): string => {
  let origin = customOrigin;
  if (!origin && typeof window !== 'undefined' && window.location?.origin) {
    origin = window.location.origin;
  }
  if (!origin) {
    origin = DEFAULT_PORTAL_DOMAIN;
  }
  origin = origin.replace(/\/+$/, '');

  if (!imageUrl || imageUrl.trim() === '') {
    return `${origin}/og-image.png`;
  }

  const cleanUrl = imageUrl.trim();

  // Se for imagem codificada em Base64, fornece endpoint do servidor para WhatsApp baixar via HTTP
  if (cleanUrl.startsWith('data:image/')) {
    if (articleSlugOrId) {
      return `${origin}/api/article-image/${encodeURIComponent(articleSlugOrId)}`;
    }
    return `${origin}/og-image.png`;
  }

  // Se já for URL absoluta (http/https), retorna diretamente
  if (/^https?:\/\//i.test(cleanUrl)) {
    return cleanUrl;
  }

  // Se for caminho relativo, converte para absoluta
  const cleanPath = cleanUrl.replace(/^\/+/, '');
  return `${origin}/${cleanPath}`;
};

/**
 * Gera texto de compartilhamento formatado para WhatsApp
 */
export const getWhatsAppShareData = (article: Article, customOrigin?: string) => {
  const canonicalUrl = getArticleCanonicalUrl(article.slug, customOrigin);
  const title = article.title.trim();
  // Formato ideal para o WhatsApp: Título da notícia + link permanente
  // O WhatsApp faz o scraping da página informada no link para carregar a imagem e resumo
  const text = `${title}\n\n${canonicalUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  return {
    title,
    canonicalUrl,
    whatsappUrl,
    formattedText: text
  };
};

/**
 * Gera tags Open Graph, Twitter Cards e Schema.org em formato HTML
 */
export const generateOpenGraphHtml = (article: Article, origin: string): string => {
  const canonicalUrl = getArticleCanonicalUrl(article.slug, origin);
  const imageUrl = getAbsoluteImageUrl(article.imageUrl, origin, article.slug || article.id);
  const portalName = 'Folha da Região';
  
  // Resumo/Descrição: subtítulo ou primeiros 160 caracteres do texto
  const rawDesc = article.subtitle?.trim() || stripHtml(article.content);
  const description = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '...' : rawDesc;

  const pageTitle = `${article.title} - ${portalName}`;
  const publishedTime = article.createdAt || new Date().toISOString();
  const modifiedTime = article.updatedAt || publishedTime;
  const authorName = article.author || 'Redação Folha da Região';
  const category = article.category || 'Geral';

  return `
    <!-- Metadados Primários da Notícia -->
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="title" content="${escapeHtml(pageTitle)}" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="author" content="${escapeHtml(authorName)}" />
    <meta name="news_keywords" content="${escapeHtml(category)}, Sergipe, Folha da Região, Notícias" />

    <!-- Open Graph / Facebook / WhatsApp / LinkedIn -->
    <meta property="og:site_name" content="${escapeHtml(portalName)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(article.title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(article.title)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="article:published_time" content="${escapeHtml(publishedTime)}" />
    <meta property="article:modified_time" content="${escapeHtml(modifiedTime)}" />
    <meta property="article:section" content="${escapeHtml(category)}" />
    <meta property="article:author" content="${escapeHtml(authorName)}" />

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@folhadaregiaose" />
    <meta name="twitter:creator" content="@folhadaregiaose" />
    <meta name="twitter:title" content="${escapeHtml(article.title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(article.title)}" />

    <!-- Link Canônico -->
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

    <!-- Schema.org JSON-LD (NewsArticle) para Mecanismos de Busca -->
    <script type="application/ld+json">
    ${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': article.title,
      'description': description,
      'image': [imageUrl],
      'datePublished': publishedTime,
      'dateModified': modifiedTime,
      'author': [{
        '@type': 'Person',
        'name': authorName
      }],
      'publisher': {
        '@type': 'NewsMediaOrganization',
        'name': portalName,
        'url': origin,
        'logo': {
          '@type': 'ImageObject',
          'url': `${origin}/vetor.svg`
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': canonicalUrl
      },
      'articleSection': category
    })}
    </script>

    <!-- Indicador de Inicialização de Rota -->
    <script>
      window.__INITIAL_ARTICLE_SLUG__ = "${escapeHtml(article.slug)}";
    </script>
  `;
};

/**
 * Atualiza dinamicamente as tags Open Graph no DOM do cliente (SPA)
 */
export const updateClientHeadForArticle = (article: Article) => {
  if (typeof document === 'undefined') return;

  const origin = window.location.origin;
  const canonicalUrl = getArticleCanonicalUrl(article.slug, origin);
  const imageUrl = getAbsoluteImageUrl(article.imageUrl, origin, article.slug || article.id);
  const portalName = 'Folha da Região';
  const pageTitle = `${article.title} - ${portalName}`;
  const rawDesc = article.subtitle?.trim() || stripHtml(article.content);
  const description = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '...' : rawDesc;

  document.title = pageTitle;

  const setMeta = (attr: 'property' | 'name', value: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${value}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, value);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Primary
  setMeta('name', 'description', description);
  setMeta('name', 'author', article.author || portalName);

  // Open Graph
  setMeta('property', 'og:site_name', portalName);
  setMeta('property', 'og:type', 'article');
  setMeta('property', 'og:title', article.title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:image', imageUrl);
  setMeta('property', 'og:image:secure_url', imageUrl);
  setMeta('property', 'og:image:alt', article.title);

  // Twitter
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', article.title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', imageUrl);

  // Canonical link
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);
};
