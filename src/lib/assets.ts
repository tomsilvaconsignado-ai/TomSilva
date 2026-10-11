/**
 * Utilitário universal para resolução de URLs de assets públicos.
 * Garante funcionamento perfeito em raiz local (AI Studio / Vite dev),
 * subpastas do GitHub Pages (ex: /TomSilva/) e deploys em servidores de produção.
 */
export function getAssetUrl(path?: string): string {
  if (!path) return '';
  
  // Se for data URL, blob ou URL externa absoluta (http/https), retorna inalterado
  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    /^https?:\/\//i.test(path)
  ) {
    return path;
  }

  // Remove barras iniciais redundantes
  const cleanPath = path.replace(/^\/+/, '');
  
  // Obtém o BASE_URL configurado no Vite (ex: '/TomSilva/' no GitHub Actions ou './' local)
  const baseUrl = import.meta.env.BASE_URL || './';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return `${normalizedBase}${cleanPath}`;
}

/**
 * Sanitiza conteúdo HTML para exibição segura, neutralizando scripts maliciosos e tags perigosas.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\s(href|src)="javascript:[^"]*"/gi, ' $1="#"')
    .replace(/\s(href|src)='javascript:[^']*'/gi, " $1='#'");
}
