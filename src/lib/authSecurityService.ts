import { AuthSecurityToken, AuthTokenType } from '../types/database';

const TOKENS_STORAGE_KEY = 'folha_auth_tokens_v1';

const getStoredTokens = (): AuthSecurityToken[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredTokens = (tokens: AuthSecurityToken[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error('Erro ao salvar tokens de segurança', e);
  }
};

// Gera token criptográfico seguro imprevisível de 48 caracteres hexadecimais
export const generateSecureTokenString = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint8Array(24);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback seguro baseado em tempo e entropia
  return 'sec_' + Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const authSecurityService = {
  // Cria um novo token seguro e invalida tokens não utilizados anteriores do mesmo usuário/tipo
  createToken(userId: string, email: string, type: AuthTokenType): AuthSecurityToken {
    const tokens = getStoredTokens();
    const now = new Date();

    // Invalida tokens anteriores não usados deste usuário para o mesmo objetivo
    tokens.forEach(t => {
      if (t.userId === userId && t.type === type && !t.used) {
        t.used = true;
        t.usedAt = now.toISOString();
      }
    });

    // Validade: 24h para confirmação de e-mail, 1h para redefinição de senha
    const validityHours = type === 'password_reset' ? 1 : 24;
    const expiresAt = new Date(now.getTime() + validityHours * 3600 * 1000).toISOString();

    const newToken: AuthSecurityToken = {
      id: 'tok-' + Math.random().toString(36).substring(2, 9),
      userId,
      email: email.trim().toLowerCase(),
      token: generateSecureTokenString(),
      type,
      expiresAt,
      used: false,
      createdAt: now.toISOString()
    };

    tokens.unshift(newToken);
    saveStoredTokens(tokens);

    return newToken;
  },

  // Valida um token recebido por link
  verifyToken(tokenString: string, expectedType: AuthTokenType): {
    valid: boolean;
    token?: AuthSecurityToken;
    reason?: 'not_found' | 'used' | 'expired' | 'type_mismatch';
    message: string;
  } {
    if (!tokenString || !tokenString.trim()) {
      return { valid: false, reason: 'not_found', message: 'Token não fornecido ou link inválido.' };
    }

    const tokens = getStoredTokens();
    const found = tokens.find(t => t.token === tokenString.trim());

    if (!found) {
      return { valid: false, reason: 'not_found', message: 'Link de validação inválido ou não encontrado no sistema.' };
    }

    if (found.type !== expectedType) {
      return { valid: false, reason: 'type_mismatch', message: 'Tipo de validação incompatível com o link solicitado.' };
    }

    if (found.used) {
      return { 
        valid: false, 
        token: found,
        reason: 'used', 
        message: 'Este link de validação já foi utilizado anteriormente e não pode ser reutilizado.' 
      };
    }

    const now = new Date();
    const expires = new Date(found.expiresAt);

    if (now > expires) {
      return { 
        valid: false, 
        token: found,
        reason: 'expired', 
        message: 'Este link de validação expirou. Por favor, solicite um novo envio para continuar.' 
      };
    }

    return { valid: true, token: found, message: 'Token válido e seguro.' };
  },

  // Consome (invalida) o token após a operação de sucesso
  consumeToken(tokenString: string): boolean {
    const tokens = getStoredTokens();
    const target = tokens.find(t => t.token === tokenString.trim());
    if (target && !target.used) {
      target.used = true;
      target.usedAt = new Date().toISOString();
      saveStoredTokens(tokens);
      return true;
    }
    return false;
  }
};
