import { OutboxEmail, UserProfile } from '../types/database';

const OUTBOX_STORAGE_KEY = 'folha_outbox_emails_v1';
const RATE_LIMIT_STORAGE_KEY = 'folha_email_rate_limits_v1';

export const getStoredEmails = (): OutboxEmail[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredEmails = (emails: OutboxEmail[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(emails));
  } catch (e) {
    console.error('Erro ao salvar e-mails no outbox', e);
  }
};

// Rate limiter: 60 segundos entre solicitações para o mesmo e-mail e tipo
export const checkEmailRateLimit = (email: string, type: string, cooldownSeconds = 60): { allowed: boolean; remainingSeconds: number } => {
  if (typeof window === 'undefined') return { allowed: true, remainingSeconds: 0 };
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const limits = raw ? JSON.parse(raw) : {};
    const key = `${email.toLowerCase()}_${type}`;
    const lastTime = limits[key];
    const now = Date.now();

    if (lastTime && now - lastTime < cooldownSeconds * 1000) {
      const remainingSeconds = Math.ceil((cooldownSeconds * 1000 - (now - lastTime)) / 1000);
      return { allowed: false, remainingSeconds };
    }

    limits[key] = now;
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(limits));
    return { allowed: true, remainingSeconds: 0 };
  } catch {
    return { allowed: true, remainingSeconds: 0 };
  }
};

// Gerador de Modelos HTML Responsivos com Identidade Visual da Folha da Região
const generateBaseHtml = (title: string, contentHtml: string, actionUrl?: string, actionLabel?: string, footerNote?: string): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { background-color: #0f172a; padding: 28px 32px; border-bottom: 4px solid #0056a4; text-align: left; }
    .header-logo { color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; margin: 0; }
    .header-badge { display: inline-block; background-color: #0056a4; color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; }
    .body { padding: 36px 32px; font-size: 14px; line-height: 1.6; color: #334155; }
    .button-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0056a4; color: #ffffff !important; text-decoration: none; padding: 14px 32px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 86, 164, 0.25); }
    .link-alt { margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px; word-break: break-all; color: #64748b; }
    .footer { background-color: #f8fafc; padding: 24px 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">FOLHA DA REGIÃO</div>
      <div class="header-badge">Comunicação e Autenticação Segura</div>
    </div>
    <div class="body">
      ${contentHtml}
      ${actionUrl && actionLabel ? `
        <div class="button-container">
          <a href="${actionUrl}" class="btn" target="_blank">${actionLabel}</a>
        </div>
        <div class="link-alt">
          Se o botão acima não funcionar, copie e cole este link seguro diretamente no seu navegador:<br>
          <a href="${actionUrl}" style="color: #0056a4;">${actionUrl}</a>
        </div>
      ` : ''}
      ${footerNote ? `<p style="font-size: 12px; color: #64748b; margin-top: 24px;">${footerNote}</p>` : ''}
    </div>
    <div class="footer">
      <strong>Folha da Região Online</strong> • Jornalismo e Classificados em Sergipe<br>
      Este é um e-mail transacional automático. Por razões de segurança, não responda a esta mensagem.<br>
      © ${new Date().getFullYear()} Folha da Região. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const emailService = {
  getOutbox(): OutboxEmail[] {
    return getStoredEmails();
  },

  clearOutbox(): void {
    saveStoredEmails([]);
    window.dispatchEvent(new Event('folha_outbox_updated'));
  },

  // 1. E-MAIL DE CONFIRMAÇÃO DE CADASTRO
  async sendEmailConfirmation(user: UserProfile, token: string): Promise<OutboxEmail> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://folhadaregiao.com.br';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const actionUrl = `${origin}${pathname}?action=confirm-email&token=${encodeURIComponent(token)}`;

    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Olá, ${user.fullName}!</h2>
      <p>Agradecemos por se cadastrar na <strong>Folha da Região</strong>.</p>
      <p>Para concluir a ativação da sua conta, garantir a autenticidade e liberar a publicação de classificados e comentários, confirme seu endereço de e-mail clicando no botão abaixo:</p>
    `;

    const bodyHtml = generateBaseHtml(
      'Confirme seu e-mail — Folha da Região',
      contentHtml,
      actionUrl,
      'Confirmar meu e-mail',
      '⚠️ Este link de confirmação é de uso único e possui validade de <strong>24 horas</strong>. Caso você não tenha solicitado este cadastro, ignore esta mensagem com segurança.'
    );

    const email: OutboxEmail = {
      id: 'email-' + Math.random().toString(36).substring(2, 9),
      to: user.email,
      recipientName: user.fullName,
      subject: 'Portal de Notícias — Confirmação de Conta',
      type: 'email_confirmation',
      bodyHtml,
      actionUrl,
      actionLabel: 'Confirmar meu e-mail',
      sentAt: new Date().toISOString(),
      status: 'delivered'
    };

    const outbox = getStoredEmails();
    outbox.unshift(email);
    saveStoredEmails(outbox);

    window.dispatchEvent(new CustomEvent('folha_email_sent', { detail: email }));
    window.dispatchEvent(new Event('folha_outbox_updated'));

    return email;
  },

  // 2. REENVIO DO E-MAIL DE CONFIRMAÇÃO
  async sendResendConfirmation(user: UserProfile, token: string): Promise<OutboxEmail> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://folhadaregiao.com.br';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const actionUrl = `${origin}${pathname}?action=confirm-email&token=${encodeURIComponent(token)}`;

    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Olá, ${user.fullName}!</h2>
      <p>Você solicitou o reenvio do link de confirmação de e-mail para a sua conta no portal <strong>Folha da Região</strong>.</p>
      <p>Clique no botão abaixo para validar seu e-mail e ativar todas as funções da sua conta:</p>
    `;

    const bodyHtml = generateBaseHtml(
      'Novo link de confirmação — Folha da Região',
      contentHtml,
      actionUrl,
      'Confirmar meu e-mail',
      '⚠️ Este novo link é seguro, de uso único e substitui qualquer link enviado anteriormente. Validade: 24 horas.'
    );

    const email: OutboxEmail = {
      id: 'email-' + Math.random().toString(36).substring(2, 9),
      to: user.email,
      recipientName: user.fullName,
      subject: 'Portal de Notícias — Novo link de confirmação de conta',
      type: 'email_confirmation',
      bodyHtml,
      actionUrl,
      actionLabel: 'Confirmar meu e-mail',
      sentAt: new Date().toISOString(),
      status: 'delivered'
    };

    const outbox = getStoredEmails();
    outbox.unshift(email);
    saveStoredEmails(outbox);

    window.dispatchEvent(new CustomEvent('folha_email_sent', { detail: email }));
    window.dispatchEvent(new Event('folha_outbox_updated'));

    return email;
  },

  // 3. RECUPERAÇÃO DE SENHA
  async sendPasswordReset(user: UserProfile, token: string): Promise<OutboxEmail> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://folhadaregiao.com.br';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const actionUrl = `${origin}${pathname}?action=reset-password&token=${encodeURIComponent(token)}`;

    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Olá, ${user.fullName}!</h2>
      <p>Recebemos uma solicitação para redefinir a senha de acesso da sua conta na <strong>Folha da Região</strong>.</p>
      <p>Para cadastrar uma nova senha segura, clique no botão destacado abaixo:</p>
    `;

    const bodyHtml = generateBaseHtml(
      'Redefinição de senha — Folha da Região',
      contentHtml,
      actionUrl,
      'Redefinir minha senha',
      '🔒 Por segurança, este link possui validade de <strong>1 hora</strong> e só poderá ser utilizado uma única vez. Se você não solicitou a redefinição da sua senha, fique tranquilo: nenhuma alteração foi realizada e sua conta permanece protegida.'
    );

    const email: OutboxEmail = {
      id: 'email-' + Math.random().toString(36).substring(2, 9),
      to: user.email,
      recipientName: user.fullName,
      subject: 'Portal de Notícias — Instruções para redefinir sua senha',
      type: 'password_reset',
      bodyHtml,
      actionUrl,
      actionLabel: 'Redefinir minha senha',
      sentAt: new Date().toISOString(),
      status: 'delivered'
    };

    const outbox = getStoredEmails();
    outbox.unshift(email);
    saveStoredEmails(outbox);

    window.dispatchEvent(new CustomEvent('folha_email_sent', { detail: email }));
    window.dispatchEvent(new Event('folha_outbox_updated'));

    return email;
  },

  // 4. CONFIRMAÇÃO DE SENHA ALTERADA
  async sendPasswordChangedNotification(user: UserProfile): Promise<OutboxEmail> {
    const contentHtml = `
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0;">Olá, ${user.fullName}!</h2>
      <p>Informamos que a senha da sua conta no portal <strong>Folha da Região</strong> foi <strong>alterada com sucesso</strong> em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>
      <p>Você já pode acessar o portal utilizando sua nova senha.</p>
      <p style="color: #dc2626; font-size: 12px; font-weight: 700; margin-top: 20px;">
        ⚠️ Se você NÃO realizou esta alteração, entre em contato imediatamente com nossa equipe pelo suporte do portal.
      </p>
    `;

    const bodyHtml = generateBaseHtml(
      'Sua senha foi alterada com sucesso — Folha da Região',
      contentHtml,
      undefined,
      undefined,
      'Este é um aviso automático de segurança da sua conta.'
    );

    const email: OutboxEmail = {
      id: 'email-' + Math.random().toString(36).substring(2, 9),
      to: user.email,
      recipientName: user.fullName,
      subject: 'Portal de Notícias — Confirmação de alteração de senha',
      type: 'password_changed',
      bodyHtml,
      actionUrl: '',
      actionLabel: '',
      sentAt: new Date().toISOString(),
      status: 'delivered'
    };

    const outbox = getStoredEmails();
    outbox.unshift(email);
    saveStoredEmails(outbox);

    window.dispatchEvent(new CustomEvent('folha_email_sent', { detail: email }));
    window.dispatchEvent(new Event('folha_outbox_updated'));

    return email;
  }
};
