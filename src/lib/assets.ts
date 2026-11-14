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
  
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return `${normalizedBase}${cleanPath}`;
}

/**
 * Sanitiza conteúdo HTML para exibição segura, neutralizando scripts maliciosos e tags perigosas.
 */
const BLOCO_ABRE = /<(ul|ol|blockquote|table|figure|pre)\b/gi;
const BLOCO_FECHA = /<\/(ul|ol|blockquote|table|figure|pre)>/gi;
const COMECA_BLOCO = /^<(p|h[1-6]|ul|ol|li|blockquote|figure|img|div|table|iframe|hr|pre|video)\b/i;

/**
 * Prepara o texto da matéria para leitura. O editor grava texto corrido com quebras de linha (e
 * marcações soltas como <strong>, <h2>, <blockquote> e listas); inserido direto como HTML, as quebras
 * somem e os parágrafos se juntam. Aqui cada linha vira um parágrafo, e blocos (listas, citações,
 * intertítulos) ficam como estão. Conteúdo que já vem com <p>, <br> ou <div> não é alterado.
 */
export function formatarMateria(conteudo: string): string {
  const html = sanitizeHtml(conteudo);
  if (!html || /<(p|br|div)\b/i.test(html)) return html;
  const saida: string[] = [];
  let profundidade = 0;
  for (const bruta of html.replace(/\r\n?/g, '\n').split('\n')) {
    const linha = bruta.trim();
    const abre = (linha.match(BLOCO_ABRE) || []).length;
    const fecha = (linha.match(BLOCO_FECHA) || []).length;
    if (profundidade > 0 || abre > 0 || COMECA_BLOCO.test(linha)) saida.push(linha);
    else if (linha) saida.push(`<p>${linha}</p>`);
    profundidade = Math.max(0, profundidade + abre - fecha);
  }
  return saida.join('\n');
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/\s(href|src)="javascript:[^"]*"/gi, ' $1="#"')
    .replace(/\s(href|src)='javascript:[^']*'/gi, " $1='#'");
}
