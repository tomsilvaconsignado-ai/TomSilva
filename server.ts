import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { INITIAL_ARTICLES } from './src/data/initialData.ts';
import { Article } from './src/types/database.ts';
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

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
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

  // API para testar conectividade e envio SMTP do portal
  app.post('/api/test-smtp', async (req: Request, res: Response) => {
    try {
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
