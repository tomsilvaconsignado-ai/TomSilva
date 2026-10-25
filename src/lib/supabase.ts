import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  Article, AdItem, AdPlacement, AdFormat, FormatCarouselSetting, PlacementSetting, UserProfile, UserRole, UserStatus, UserAuditLog, Comment, NewsletterSubscriber, NotificationItem,
  ClassifiedItem, ClassifiedCategory, ClassifiedReport, ClassifiedsSettings,
  ClassifiedSection, ClassifiedType, ClassifiedStatus, PortalSettings,
  isExtraSidebarSquare
} from '../types/database';
import { INITIAL_ARTICLES, INITIAL_ADS } from '../data/initialData';
import {
  INITIAL_CLASSIFIED_CATEGORIES, DEFAULT_CLASSIFIEDS_SETTINGS
} from '../data/initialClassifieds';
import { checkEmailRateLimit } from './emailService';

// Configurações lidas do ambiente ou do localStorage (para configuração em tempo de execução)
// Configurações padrão do projeto oficial Supabase (garante comunicação 100% no GitHub Pages, Vercel e produção)
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from './supabaseConfig';
export { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY };

// Configurações lidas do ambiente ou do localStorage (para configuração em tempo de execução)
const envUrl = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '').trim();
const envKey = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '').trim();
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('folha_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('folha_supabase_anon_key') : null;

const sanitizeSupabaseUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed === 'https://seu-projeto.supabase.co' || !trimmed.startsWith('https://')) return '';
  return trimmed.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

const sanitizeSupabaseKey = (key: string | null | undefined): string => {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed === 'sua-chave-anon-publica-aqui' || trimmed.length < 20) return '';
  return trimmed;
};

const resolvedUrl = sanitizeSupabaseUrl(storedUrl) || sanitizeSupabaseUrl(envUrl) || DEFAULT_SUPABASE_URL;
const resolvedKey = sanitizeSupabaseKey(storedKey) || sanitizeSupabaseKey(envKey) || DEFAULT_SUPABASE_ANON_KEY;

const SUPABASE_URL = resolvedUrl;
const SUPABASE_KEY = resolvedKey;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL && 
    SUPABASE_KEY && 
    SUPABASE_URL !== 'https://seu-projeto.supabase.co' &&
    SUPABASE_URL.startsWith('https://')
  );
};

export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  key: SUPABASE_KEY,
  isConfigured: isSupabaseConfigured()
});

export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('folha_supabase_url', url.trim());
    localStorage.setItem('folha_supabase_anon_key', key.trim());
    window.location.reload();
  }
};

/**
 * URL do portal em produção (usada para links enviados por e-mail quando disparados do ambiente de desenvolvimento)
 */
export const DEFAULT_PRODUCTION_URL = 'https://tomsilvaconsignado-ai.github.io/TomSilva';

export const getProductionSiteUrl = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('folha_production_url');
      if (saved && (saved.includes('folhadaregiaonline.com.br') || saved.includes('folhadaregiaoonline.com.br'))) {
        localStorage.removeItem('folha_production_url');
      } else if (saved && saved.startsWith('http')) {
        return saved.replace(/\/+$/, '');
      }
    } catch {}
  }
  const envUrl = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SITE_URL) || '').trim();
  if (envUrl && !envUrl.includes('folhadaregiaonline.com.br') && !envUrl.includes('folhadaregiaoonline.com.br')) {
    return envUrl.replace(/\/+$/, '');
  }
  return DEFAULT_PRODUCTION_URL;
};

export const setProductionSiteUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean.includes('folhadaregiaonline.com.br') || clean.includes('folhadaregiaoonline.com.br')) {
      // Ignora gravação de domínio sem apontamento DNS para proteger links
      return;
    }
    localStorage.setItem('folha_production_url', clean);
  }
};

/**
 * Gera URL de redirecionamento dinâmica segura preservando subdiretórios (ex: GitHub Pages /nome-do-repo/)
 * NUNCA direciona para domínios sem DNS ativo (*.folhadaregiaonline.com.br)
 */
export const getAuthRedirectUrl = (actionOrHash: string): string => {
  if (typeof window === 'undefined') {
    const prod = getProductionSiteUrl();
    return actionOrHash.startsWith('#') 
      ? `${prod}/${actionOrHash.replace(/^\/+/, '')}` 
      : `${prod}/?action=${actionOrHash}`;
  }

  const hostname = window.location.hostname.toLowerCase();

  // 1. Se estiver rodando em qualquer ambiente acessível (localhost, *.run.app, tomsilvaconsignado-ai.github.io):
  if (!hostname.includes('folhadaregiaonline.com.br') && !hostname.includes('folhadaregiaoonline.com.br')) {
    try {
      const u = new URL(window.location.href);
      if (actionOrHash.startsWith('#')) {
        u.hash = actionOrHash;
        u.search = '';
      } else {
        u.search = `?action=${actionOrHash}`;
        u.hash = '';
      }
      return u.toString();
    } catch {}
  }

  // 2. Fallback seguro garantido se estiver rodando em domínio sem apontamento DNS:
  const targetBase = getProductionSiteUrl();
  return actionOrHash.startsWith('#')
    ? `${targetBase}/${actionOrHash.replace(/^\/+/, '')}`
    : `${targetBase}/?action=${actionOrHash}`;
};

// Instância do Supabase oficial
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Cabeçalho Authorization com o JWT da sessão atual (o servidor valida o token e o papel no banco)
export const getApiAuthHeaders = async (): Promise<Record<string, string>> => {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ==========================================
// SERVIDOR DE API OPCIONAL (server.ts)
// O GitHub Pages só serve arquivos estáticos: lá as rotas /api não existem.
// Em desenvolvimento (npm run dev) o servidor Express atende na mesma origem.
// Em produção, defina VITE_API_BASE_URL no build se hospedar o server.ts
// (use "/" quando o servidor servir o próprio site).
// ==========================================
const rawApiBaseUrl = String((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '').trim();
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export const isBackendAvailable = (): boolean =>
  Boolean(rawApiBaseUrl) || Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

export const apiFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  if (!isBackendAvailable()) {
    throw new Error('O servidor de API do portal não está disponível nesta hospedagem.');
  }
  return fetch(`${API_BASE_URL}${path}`, init);
};

// Dispara uma chamada à API sem bloquear a interface (usada para o cache de Open Graph do servidor)
const fireAndForgetApi = (path: string, init?: RequestInit): void => {
  if (!isBackendAvailable()) return;
  apiFetch(path, init).catch(() => {});
};

// ==========================================
// CACHE LOCAL
// A fonte da verdade é o Supabase. O localStorage guarda apenas a última cópia
// recebida, usada quando a rede falha e para leituras síncronas (configurações).
// ==========================================
export const STORAGE_KEYS = {
  ARTICLES: 'folha_articles_cache_v2',
  ADS: 'folha_ads_cache_v2',
  CURRENT_USER: 'folha_current_user_v2',
  CLASSIFIEDS: 'folha_classifieds_cache_v2',
  CLASSIFIED_CATEGORIES: 'folha_classified_cats_cache_v2',
  CLASSIFIED_SETTINGS: 'folha_classified_settings_cache_v2',
  PORTAL_SETTINGS: 'folha_portal_settings_cache_v2',
  ADS_SETTINGS: 'folha_ads_settings_cache_v2',
  ADS_FORMAT_SETTINGS: 'folha_ads_format_settings_cache_v2',
  // Senha SMTP fica apenas neste navegador (nunca vai para o banco público)
  SMTP_SECRET: 'folha_smtp_secret_v1'
};

// Chaves da versão anterior, quando tudo era gravado só no navegador
export const LEGACY_STORAGE_KEYS = {
  ARTICLES: 'folha_articles_v1',
  ADS: 'folha_ads_v1',
  PORTAL_SETTINGS: 'folha_portal_settings_v1',
  ADS_SETTINGS: 'folha_ads_settings_v1',
  ADS_FORMAT_SETTINGS: 'folha_ads_format_settings_v1'
};

// Dados da versão anterior que não devem continuar no navegador:
// a lista de usuários guardava senhas em texto puro.
const LEGACY_SENSITIVE_KEYS = [
  'folha_users_v1',
  'folha_current_user_v1',
  'folha_auth_tokens_v1',
  'folha_comments_v1',
  'folha_subscribers_v1',
  'folha_notifications_v1',
  'folha_classifieds_v1',
  'folha_classified_cats_v1',
  'folha_classified_reports_v1',
  'folha_classified_settings_v1',
  'folha_user_audit_logs_v1'
];

const memoryStore = new Map<string, string>();

export const safeDispatchEvent = (event: Event): void => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(event);
    } catch {}
  }
};

export const getStored = <T>(key: string, defaultValue: T): T => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
    const memItem = memoryStore.get(key);
    return memItem ? JSON.parse(memItem) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const setStored = <T>(key: string, value: T): void => {
  try {
    const serialized = JSON.stringify(value);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    }
    memoryStore.set(key, serialized);
  } catch (e) {
    console.error('Erro ao salvar no storage', e);
  }
};

if (typeof window !== 'undefined') {
  try {
    LEGACY_SENSITIVE_KEYS.forEach(key => localStorage.removeItem(key));
  } catch {}
}

const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
};

const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('O banco de dados Supabase não está configurado.');
  }
  return supabase;
};

// Traduz erros do PostgREST/RLS para mensagens compreensíveis no painel
const describeDbError = (error: { message?: string; code?: string } | null | undefined, action: string): Error => {
  const code = error?.code || '';
  const msg = error?.message || '';
  if (code === '42501' || msg.toLowerCase().includes('row-level security')) {
    return new Error(`Sem permissão para ${action}. Entre novamente com uma conta autorizada.`);
  }
  if (code === '23505') {
    return new Error(`Não foi possível ${action}: já existe um registro com esses dados (ex.: mesmo endereço/slug).`);
  }
  if (code === '42703' || code === 'PGRST204') {
    return new Error(`Não foi possível ${action}: o banco está desatualizado. Execute as migrações em supabase/migrations no SQL Editor.`);
  }
  return new Error(`Não foi possível ${action}${msg ? `: ${msg}` : '.'}`);
};

// ==========================================
// UPLOAD DE MÍDIA (Supabase Storage)
// Os formulários leem os arquivos como data URL; antes de gravar no banco as
// imagens/vídeos são enviados ao bucket público "media" e substituídos pela URL.
// ==========================================
const MEDIA_BUCKET = 'media';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
};

const dataUrlToBlob = (dataUrl: string): Blob | null => {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  try {
    if (match[2]) {
      const binary = atob(match[3]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(match[3])], { type: mime });
  } catch {
    return null;
  }
};

export const mediaService = {
  // Envia um data URL ao Storage e devolve a URL pública. URLs comuns são devolvidas sem alteração.
  async ensureUploaded(url: string | undefined, folder: string): Promise<string | undefined> {
    if (!url || !url.startsWith('data:') || !supabase) return url;
    const blob = dataUrlToBlob(url);
    const ext = blob ? MIME_EXTENSIONS[blob.type] : undefined;
    if (!blob || !ext) return url;

    const path = `${folder.replace(/\/+$/, '')}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
      contentType: blob.type,
      cacheControl: '31536000',
      upsert: false
    });
    if (error) {
      // Mantém o data URL para não perder o arquivo; o registro continua funcionando
      console.warn('Falha ao enviar mídia ao Supabase Storage (mantendo arquivo embutido):', error.message);
      return url;
    }
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  async ensureAllUploaded(urls: string[], folder: string): Promise<string[]> {
    const results: string[] = [];
    for (const url of urls) {
      const uploaded = await this.ensureUploaded(url, folder);
      if (uploaded) results.push(uploaded);
    }
    return results;
  }
};

// ==========================================
// SERVIÇO DE AUTENTICAÇÃO (somente Supabase Auth)
// ==========================================
export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

const DEFAULT_INTERESTS = ['Política', 'Cidades'];

const translateAuthError = (message: string): string => {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';
  }
  if (m.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Abra o link que enviamos para sua caixa de entrada (verifique também o spam) ou use a opção "Reenviar confirmação".';
  }
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) {
    return 'Já existe uma conta com este e-mail. Faça login ou recupere sua senha.';
  }
  if (m.includes('rate limit') || m.includes('too many') || m.includes('429') || m.includes('security purposes')) {
    return 'Muitas solicitações em pouco tempo. Por segurança, aguarde cerca de 1 minuto e tente novamente.';
  }
  if (m.includes('password should be at least') || m.includes('weak password')) {
    return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
  }
  if (m.includes('same password') || m.includes('different from the old')) {
    return 'A nova senha precisa ser diferente da senha atual.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Não foi possível conectar ao servidor de autenticação. Verifique sua internet e tente novamente.';
  }
  return message || 'Ocorreu um erro inesperado na autenticação.';
};

// Converte a linha de public.profiles (+ dados do Auth) para o modelo do app
const mapProfileRow = (
  p: any,
  authUser?: Pick<User, 'id' | 'email' | 'email_confirmed_at' | 'last_sign_in_at' | 'created_at' | 'user_metadata'> | null
): UserProfile => {
  const meta = authUser?.user_metadata || {};
  const email = p?.email || authUser?.email || '';
  return {
    id: p?.id || authUser?.id || '',
    email,
    fullName: p?.full_name || meta.full_name || meta.name || email.split('@')[0] || 'Usuário',
    role: (p?.role || 'reader') as UserRole,
    avatarUrl: p?.avatar_url || meta.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
    interests: p?.interests || meta.interests || DEFAULT_INTERESTS,
    createdAt: p?.created_at || authUser?.created_at || new Date().toISOString(),
    status: (p?.status || 'active') as UserStatus,
    moderationReason: p?.moderation_reason || undefined,
    moderationAt: p?.moderation_at || undefined,
    moderatedBy: p?.moderated_by || undefined,
    emailConfirmed: authUser ? Boolean(authUser.email_confirmed_at) : true,
    emailConfirmedAt: authUser?.email_confirmed_at || undefined,
    hasProfile: Boolean(p),
    lastSignInAt: authUser?.last_sign_in_at || null,
    lastActiveAt: authUser?.last_sign_in_at || null,
    accountType: p?.account_type || meta.account_type || 'pf',
    phone: p?.phone || meta.phone || '',
    city: p?.city || meta.city || '',
    state: p?.state || meta.state || 'SE',
    cpf: p?.cpf || meta.cpf || undefined,
    cnpj: p?.cnpj || meta.cnpj || undefined,
    companyName: p?.company_name || meta.company_name || undefined,
    tradeName: p?.trade_name || meta.trade_name || undefined,
    legalRepresentative: p?.legal_representative || meta.legal_representative || undefined,
    representativeCpf: p?.representative_cpf || meta.representative_cpf || undefined,
    isLegalAge: meta.is_legal_age ?? undefined,
    termsAccepted: p?.terms_accepted ?? meta.terms_accepted ?? false,
    termsAcceptedAt: p?.terms_accepted_at || undefined,
    termsVersion: p?.terms_version || meta.terms_version || undefined
  };
};

// Campos do perfil no formato que o trigger handle_new_user lê de raw_user_meta_data
const toSignupMetadata = (fullName: string, extra?: Partial<UserProfile>): Record<string, any> => ({
  full_name: fullName,
  interests: DEFAULT_INTERESTS,
  account_type: extra?.accountType || 'pf',
  phone: extra?.phone,
  city: extra?.city,
  state: extra?.state,
  cpf: extra?.cpf,
  cnpj: extra?.cnpj,
  company_name: extra?.companyName,
  trade_name: extra?.tradeName,
  legal_representative: extra?.legalRepresentative,
  representative_cpf: extra?.representativeCpf,
  is_legal_age: extra?.isLegalAge,
  terms_accepted: extra?.termsAccepted ?? true,
  terms_version: extra?.termsVersion
});

const loadProfileForAuthUser = async (authUser: User): Promise<UserProfile> => {
  const sb = requireSupabase();
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (error) {
    console.warn('Aviso: não foi possível ler o perfil do usuário:', error.message);
  }
  return mapProfileRow(profile, authUser);
};

const isRestrictedStatus = (status?: UserStatus): string | null => {
  if (status === 'suspended') return 'Esta conta está temporariamente suspensa por moderação da administração.';
  if (status === 'blocked') return 'Esta conta foi permanentemente bloqueada pela moderação do portal.';
  return null;
};

const publishCurrentUser = (user: UserProfile | null): void => {
  setStored(STORAGE_KEYS.CURRENT_USER, user);
  safeDispatchEvent(new Event('folha_auth_changed'));
};

export const authService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    if (!supabase) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setStored(STORAGE_KEYS.CURRENT_USER, null);
        return null;
      }

      const user = await loadProfileForAuthUser(session.user);
      if (isRestrictedStatus(user.status)) {
        await supabase.auth.signOut();
        setStored(STORAGE_KEYS.CURRENT_USER, null);
        return null;
      }

      setStored(STORAGE_KEYS.CURRENT_USER, user);
      return user;
    } catch (err) {
      console.warn('Erro ao checar sessão Supabase:', err);
      return null;
    }
  },

  async signUp(
    email: string,
    password: string,
    fullName: string,
    _role: 'admin' | 'editor' | 'reader' = 'reader', // o papel é sempre definido pelo banco (reader)
    additionalData?: Partial<UserProfile>
  ): Promise<AuthResponse> {
    try {
      const sb = requireSupabase();
      const { data, error } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl('confirm-email'),
          data: toSignupMetadata(fullName, additionalData)
        }
      });

      if (error) {
        return { user: null, error: translateAuthError(error.message) };
      }
      if (!data.user) {
        return { user: null, error: 'Não foi possível concluir o cadastro. Tente novamente.' };
      }
      // Com proteção contra enumeração, o Supabase devolve um usuário sem identidades quando o e-mail já existe
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { user: null, error: 'Já existe uma conta com este e-mail. Faça login ou recupere sua senha.' };
      }

      if (data.session) {
        // Confirmação de e-mail desativada no projeto: o usuário já está conectado
        const user = await loadProfileForAuthUser(data.user);
        publishCurrentUser(user);
        return { user: { ...user, accountState: 'active' }, error: null };
      }

      // Confirmação pendente: não há sessão até o usuário abrir o link enviado por e-mail
      return {
        user: {
          ...mapProfileRow(null, data.user),
          fullName,
          ...additionalData,
          emailConfirmed: false,
          accountState: 'awaiting_confirmation'
        },
        error: null
      };
    } catch (err: any) {
      return { user: null, error: translateAuthError(err?.message || 'Falha no cadastro') };
    }
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const sb = requireSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error || !data.user) {
        return { user: null, error: translateAuthError(error?.message || '') };
      }

      const user = await loadProfileForAuthUser(data.user);
      const restriction = isRestrictedStatus(user.status);
      if (restriction) {
        await sb.auth.signOut();
        return { user: null, error: restriction };
      }

      publishCurrentUser(user);
      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: translateAuthError(err?.message || '') };
    }
  },

  async signInAdmin(email: string, password: string): Promise<AuthResponse> {
    const res = await this.signIn(email, password);
    if (res.error) {
      return res;
    }
    if (!res.user) {
      return { user: null, error: 'Credenciais inválidas.' };
    }
    // O papel vem da tabela profiles (protegida por RLS e trigger), nunca do navegador
    if (res.user.role !== 'admin' && res.user.role !== 'editor') {
      await this.signOut();
      return {
        user: null,
        error: 'Acesso negado. Esta credencial não possui privilégios de administração ou edição no portal.'
      };
    }
    return res;
  },

  async updateInterests(userId: string, newInterests: string[]): Promise<UserProfile | null> {
    const sb = requireSupabase();
    const { error } = await sb.from('profiles').update({ interests: newInterests }).eq('id', userId);
    if (error) {
      throw describeDbError(error, 'salvar suas preferências');
    }
    const updated = await this.getCurrentUser();
    safeDispatchEvent(new Event('folha_auth_changed'));
    safeDispatchEvent(new Event('folha_interests_changed'));
    return updated;
  },

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    const sb = requireSupabase();
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.fullName !== undefined) payload.full_name = data.fullName;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.city !== undefined) payload.city = data.city;
    if (data.state !== undefined) payload.state = data.state;
    if (data.accountType !== undefined) payload.account_type = data.accountType;
    if (data.cpf !== undefined) payload.cpf = data.cpf;
    if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
    if (data.companyName !== undefined) payload.company_name = data.companyName;
    if (data.tradeName !== undefined) payload.trade_name = data.tradeName;
    if (data.legalRepresentative !== undefined) payload.legal_representative = data.legalRepresentative;
    if (data.representativeCpf !== undefined) payload.representative_cpf = data.representativeCpf;
    if (data.termsAccepted !== undefined) {
      payload.terms_accepted = data.termsAccepted;
      payload.terms_accepted_at = new Date().toISOString();
      payload.terms_version = data.termsVersion || 'v2.1';
    }

    const { error } = await sb.from('profiles').update(payload).eq('id', userId);
    if (error) {
      throw describeDbError(error, 'atualizar seu cadastro');
    }

    const updated = await this.getCurrentUser();
    safeDispatchEvent(new Event('folha_auth_changed'));
    return updated;
  },

  async signOut(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Erro ao deslogar do Supabase', e);
      }
    }
    publishCurrentUser(null);
  },

  // 1. CONFIRMAÇÃO DE E-MAIL
  // O link oficial do Supabase valida o token antes de voltar ao portal e entrega a
  // sessão na URL; aqui apenas conferimos se a sessão resultante está confirmada.
  async confirmEmail(_tokenString: string, _emailParam?: string): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    try {
      const sb = requireSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        const user = await loadProfileForAuthUser(session.user);
        publishCurrentUser(user);
        return {
          success: true,
          message: 'Seu endereço de e-mail foi confirmado com sucesso! Sua conta está ativa.',
          user
        };
      }
    } catch (err) {
      console.warn('Erro ao verificar confirmação de e-mail:', err);
    }

    return {
      success: false,
      message: 'Não foi possível confirmar o e-mail: o link é inválido, expirou ou já foi utilizado. Solicite um novo link abaixo.'
    };
  },

  // 2. REENVIO DE E-MAIL DE CONFIRMAÇÃO COM LIMITADOR DE FREQUÊNCIA
  async resendConfirmationEmail(email: string): Promise<{ success: boolean; message: string; remainingSeconds?: number }> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, message: 'Informe um endereço de e-mail válido.' };
    }

    const rateCheck = checkEmailRateLimit(trimmedEmail, 'email_confirmation', 60);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `Por segurança, aguarde mais ${rateCheck.remainingSeconds} segundos antes de solicitar um novo link.`,
        remainingSeconds: rateCheck.remainingSeconds
      };
    }

    try {
      const sb = requireSupabase();
      const { error } = await sb.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: { emailRedirectTo: getAuthRedirectUrl('confirm-email') }
      });
      if (error) {
        return { success: false, message: translateAuthError(error.message) };
      }
    } catch (err: any) {
      return { success: false, message: translateAuthError(err?.message || '') };
    }

    return {
      success: true,
      message: 'Se existir uma conta com confirmação pendente para este e-mail, enviamos um novo link. Verifique sua caixa de entrada e a pasta de spam.'
    };
  },

  // 3. SOLICITAÇÃO DE RECUPERAÇÃO DE SENHA (ESQUECI MINHA SENHA)
  async resetPassword(email: string): Promise<{ success: boolean; message: string; remainingSeconds?: number }> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, message: 'Informe um e-mail válido para recuperação.' };
    }

    const rateCheck = checkEmailRateLimit(trimmedEmail, 'password_reset', 60);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `Por motivos de segurança, aguarde mais ${rateCheck.remainingSeconds} segundos antes de solicitar um novo link de recuperação de senha.`,
        remainingSeconds: rateCheck.remainingSeconds
      };
    }

    try {
      const sb = requireSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getAuthRedirectUrl('reset-password')
      });
      if (error) {
        return { success: false, message: translateAuthError(error.message) };
      }
    } catch (err: any) {
      return { success: false, message: translateAuthError(err?.message || '') };
    }

    return {
      success: true,
      message: 'Solicitação processada! Se existir uma conta associada a este e-mail, você receberá um link de recuperação em instantes. Verifique sua caixa de entrada e a pasta de spam.'
    };
  },

  // 4. VERIFICAÇÃO DO TOKEN DE REDEFINIÇÃO DE SENHA
  // Só existe o fluxo oficial do Supabase: o link abre o portal com uma sessão de recuperação.
  verifyResetToken(tokenString: string): { valid: boolean; message: string; email?: string } {
    if (tokenString === 'supabase_recovery') {
      const cur = getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
      return {
        valid: true,
        message: 'Sessão de recuperação autorizada pelo link oficial.',
        email: cur?.email
      };
    }
    return {
      valid: false,
      message: 'Link de recuperação inválido ou expirado. Solicite um novo link em "Esqueci minha senha".'
    };
  },

  // 5. CONCLUSÃO DA REDEFINIÇÃO COM ATUALIZAÇÃO SEGURA DA SENHA
  async completePasswordReset(_tokenString: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'A nova senha deve possuir no mínimo 6 caracteres.' };
    }

    try {
      const sb = requireSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        return {
          success: false,
          message: 'Sua sessão de recuperação expirou. Solicite um novo link em "Esqueci minha senha".'
        };
      }
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, message: translateAuthError(error.message) };
      }
    } catch (err: any) {
      return { success: false, message: translateAuthError(err?.message || '') };
    }

    return {
      success: true,
      message: 'Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.'
    };
  }
};

// ==========================================
// SERVIÇO DE NOTÍCIAS & ARTIGOS
// ==========================================
export const slugify = (text: string): string =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 120) || 'materia';

const DEFAULT_ARTICLE_IMAGE = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&h=600&fit=crop';

const mapArticleRow = (item: any): Article => ({
  id: item.id,
  title: item.title,
  subtitle: item.subtitle || undefined,
  slug: item.slug,
  content: item.content,
  category: item.category,
  imageUrl: item.image_url,
  videoUrl: item.video_url || undefined,
  isVideo: Boolean(item.is_video),
  isHero: Boolean(item.is_hero),
  isSecondary: Boolean(item.is_secondary),
  viewsCount: item.views_count || 0,
  author: item.author || 'Folha da Região',
  createdAt: item.created_at,
  updatedAt: item.updated_at || undefined,
  status: item.status || 'published'
});

const articleToRow = (a: Article): Record<string, any> => ({
  title: a.title,
  subtitle: a.subtitle || null,
  slug: a.slug,
  content: a.content,
  category: a.category,
  image_url: a.imageUrl,
  video_url: a.videoUrl || null,
  is_video: Boolean(a.isVideo || a.videoUrl),
  is_hero: Boolean(a.isHero),
  is_secondary: Boolean(a.isSecondary),
  author: a.author || 'Redação Folha da Região',
  status: a.status || 'published',
  updated_at: a.updatedAt || new Date().toISOString()
});

const withDefaultStatus = (articles: Article[]): Article[] =>
  articles.map(a => ({ ...a, status: a.status || 'published' }));

const cacheArticle = (article: Article): void => {
  const cached = getStored<Article[]>(STORAGE_KEYS.ARTICLES, []);
  const others = cached.filter(a => a.id !== article.id);
  const next = article.isHero ? others.map(a => ({ ...a, isHero: false })) : others;
  setStored(STORAGE_KEYS.ARTICLES, [article, ...next]);
};

const syncArticleWithServer = async (method: 'POST' | 'DELETE', payload: Article | string): Promise<void> => {
  if (!isBackendAvailable()) return;
  const headers = { 'Content-Type': 'application/json', ...(await getApiAuthHeaders()) };
  if (method === 'DELETE') {
    fireAndForgetApi(`/api/sync-article/${encodeURIComponent(payload as string)}`, { method, headers });
  } else {
    fireAndForgetApi('/api/sync-article', { method, headers, body: JSON.stringify(payload) });
  }
};

export const newsService = {
  // Enquanto o banco não tem nenhuma matéria, o portal exibe as matérias iniciais embutidas.
  // Use "Importar conteúdo local" no painel para gravá-las no Supabase.
  async getArticles(): Promise<Article[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const articles = data.length > 0 ? data.map(mapArticleRow) : withDefaultStatus(INITIAL_ARTICLES);
          setStored(STORAGE_KEYS.ARTICLES, articles);
          return articles;
        }
        console.warn('Erro buscando notícias no Supabase, usando cópia local:', error?.message);
      } catch (err) {
        console.warn('Erro buscando notícias no Supabase, usando cópia local:', err);
      }
    }

    return withDefaultStatus(getStored<Article[]>(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES));
  },

  async getArticleBySlug(slug: string): Promise<Article | null> {
    const articles = await this.getArticles();
    return articles.find(a => a.slug === slug) || null;
  },

  async saveArticle(article: Omit<Article, 'id' | 'createdAt' | 'viewsCount'> & { id?: string }): Promise<Article> {
    const sb = requireSupabase();
    const now = new Date().toISOString();
    const imageUrl = (await mediaService.ensureUploaded(article.imageUrl, 'articles')) || DEFAULT_ARTICLE_IMAGE;
    const videoUrl = await mediaService.ensureUploaded(article.videoUrl, 'articles');

    let saved: Article | null = null;

    if (article.id) {
      const cached = getStored<Article[]>(STORAGE_KEYS.ARTICLES, []).find(a => a.id === article.id);
      const merged: Article = {
        ...(cached || { viewsCount: 0, createdAt: now, author: 'Redação Folha da Região' }),
        ...article,
        id: article.id,
        imageUrl,
        videoUrl,
        slug: article.slug || slugify(article.title),
        status: article.status || cached?.status || 'published',
        updatedAt: now
      } as Article;

      const { data, error } = await sb.from('articles').update(articleToRow(merged)).eq('id', merged.id).select();
      if (error) throw describeDbError(error, 'salvar a matéria');

      if (data && data.length > 0) {
        saved = mapArticleRow(data[0]);
      } else {
        // Matéria inicial que ainda não existia no banco: cria com o mesmo id
        const { data: inserted, error: insertError } = await sb
          .from('articles')
          .insert([{ ...articleToRow(merged), id: merged.id, views_count: merged.viewsCount || 0, created_at: merged.createdAt || now }])
          .select()
          .single();
        if (insertError) throw describeDbError(insertError, 'salvar a matéria');
        saved = mapArticleRow(inserted);
      }
    } else {
      const draft: Article = {
        id: newId(),
        title: article.title,
        subtitle: article.subtitle,
        slug: article.slug || slugify(article.title),
        content: article.content,
        category: article.category,
        imageUrl,
        videoUrl,
        isVideo: Boolean(article.isVideo || videoUrl),
        isHero: Boolean(article.isHero),
        isSecondary: Boolean(article.isSecondary),
        viewsCount: 0,
        author: article.author || 'Redação Folha da Região',
        createdAt: now,
        updatedAt: now,
        status: article.status || 'published'
      };

      const insertRow = (slug: string) =>
        sb.from('articles')
          .insert([{ ...articleToRow({ ...draft, slug }), id: draft.id, views_count: 0, created_at: now }])
          .select()
          .single();

      let { data, error } = await insertRow(draft.slug);
      if (error?.code === '23505') {
        // Já existe uma matéria com este endereço: gera um slug único
        ({ data, error } = await insertRow(`${draft.slug}-${Math.random().toString(36).substring(2, 6)}`));
      }
      if (error) throw describeDbError(error, 'publicar a matéria');
      saved = mapArticleRow(data);
    }

    // Só pode existir uma manchete principal
    if (saved.isHero) {
      const { error: heroError } = await sb.from('articles').update({ is_hero: false }).eq('is_hero', true).neq('id', saved.id);
      if (heroError) console.warn('Aviso: não foi possível desmarcar a manchete anterior:', heroError.message);
    }

    cacheArticle(saved);
    syncArticleWithServer('POST', saved);
    return saved;
  },

  async deleteArticle(id: string): Promise<void> {
    const sb = requireSupabase();
    const { error } = await sb.from('articles').delete().eq('id', id);
    if (error) throw describeDbError(error, 'excluir a matéria');

    setStored(STORAGE_KEYS.ARTICLES, getStored<Article[]>(STORAGE_KEYS.ARTICLES, []).filter(a => a.id !== id));
    syncArticleWithServer('DELETE', id);
  },

  async incrementViews(id: string): Promise<number> {
    const cached = getStored<Article[]>(STORAGE_KEYS.ARTICLES, []);
    const target = cached.find(a => a.id === id);
    const nextCount = (target?.viewsCount || 0) + 1;
    if (target) {
      target.viewsCount = nextCount;
      setStored(STORAGE_KEYS.ARTICLES, cached);
    }

    if (supabase) {
      supabase.rpc('increment_article_views', { article_id: id }).then(({ error }) => {
        if (error) console.warn('Aviso: não foi possível registrar a visualização:', error.message);
      });
    }
    return nextCount;
  }
};

// ==========================================
// CONFIGURAÇÕES COMPARTILHADAS (tabela site_settings)
// Leitura síncrona pelo cache local; hydrate() atualiza o cache a partir do banco.
// ==========================================
type SiteSettingKey = 'portal' | 'ads_placement' | 'ads_format';

const SITE_SETTING_CACHE_KEYS: Record<SiteSettingKey, string> = {
  portal: STORAGE_KEYS.PORTAL_SETTINGS,
  ads_placement: STORAGE_KEYS.ADS_SETTINGS,
  ads_format: STORAGE_KEYS.ADS_FORMAT_SETTINGS
};

const saveSiteSetting = async (key: SiteSettingKey, value: unknown): Promise<void> => {
  const sb = requireSupabase();
  const { data: { session } } = await sb.auth.getSession();
  const { error } = await sb.from('site_settings').upsert(
    [{ key, value, updated_at: new Date().toISOString(), updated_by: session?.user?.id ?? null }],
    { onConflict: 'key' }
  );
  if (error) throw describeDbError(error, 'salvar as configurações');
  setStored(SITE_SETTING_CACHE_KEYS[key], value);
};

export const siteSettingsService = {
  async hydrate(): Promise<void> {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (error || !data) {
        if (error) console.warn('Aviso: não foi possível carregar as configurações do portal:', error.message);
        return;
      }
      for (const row of data as { key: SiteSettingKey; value: unknown }[]) {
        const cacheKey = SITE_SETTING_CACHE_KEYS[row.key];
        if (cacheKey) setStored(cacheKey, row.value);
      }
      safeDispatchEvent(new CustomEvent('folha_portal_settings_updated', { detail: portalSettingsService.getSettingsSync() }));
      safeDispatchEvent(new CustomEvent('folha_ads_updated', { detail: {} }));
    } catch (err) {
      console.warn('Aviso: falha ao carregar configurações do portal:', err);
    }
  }
};

// ==========================================
// SERVIÇO DE PUBLICIDADE E CARROSSEL POR FORMATO E ESPAÇO
// ==========================================
export const DEFAULT_PLACEMENT_SETTINGS: Record<AdPlacement, PlacementSetting> = {
  header: { placement: 'header', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '728x90' },
  feed: { placement: 'feed', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '728x90' },
  sidebar: { placement: 'sidebar', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '300x300' },
  sidebar_300x900: { placement: 'sidebar_300x900', mode: 'carousel', isPaused: false, defaultDurationSeconds: 8, preferredFormat: '300x600' },
  sidebar_300x600: { placement: 'sidebar_300x600', mode: 'carousel', isPaused: false, defaultDurationSeconds: 8, preferredFormat: '300x600' },
  sidebar_300x300_2: { placement: 'sidebar_300x300_2', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '300x300' },
  sidebar_300x300_3: { placement: 'sidebar_300x300_3', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '300x300' },
  article: { placement: 'article', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '300x300' },
  footer: { placement: 'footer', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5, preferredFormat: '728x90' }
};

export const DEFAULT_FORMAT_SETTINGS: Record<'300x300' | '300x900' | '300x600', FormatCarouselSetting> = {
  '300x300': { format: '300x300', durationSeconds: 5, isPaused: false, mode: 'carousel' },
  '300x900': { format: '300x900', durationSeconds: 8, isPaused: false, mode: 'carousel' },
  '300x600': { format: '300x600', durationSeconds: 8, isPaused: false, mode: 'carousel' }
};

// O formato vertical da lateral é 300x600; anúncios antigos gravados como 300x900 são convertidos
const AD_FORMAT_DIMENSIONS: Record<'300x300' | '300x600' | '728x90' | '970x90', { ratio: string; width: number; height: number; duration: number }> = {
  '300x300': { ratio: '1 / 1', width: 300, height: 300, duration: 5 },
  '300x600': { ratio: '1 / 2', width: 300, height: 600, duration: 8 },
  '728x90': { ratio: '728 / 90', width: 728, height: 90, duration: 5 },
  '970x90': { ratio: '970 / 90', width: 970, height: 90, duration: 5 }
};

// Deduz o formato a partir dos campos (inclui dados antigos sem ad_format)
const detectAdFormat = (ad: Partial<AdItem>): '300x300' | '300x600' | '728x90' | '970x90' => {
  if (ad.adFormat === '970x90' || ad.adFormat === '728x90' || ad.adFormat === '300x300') {
    return ad.adFormat;
  }
  if (ad.adFormat === '300x600' || ad.adFormat === '300x900' || ad.placement === 'sidebar_300x900' || ad.placement === 'sidebar_300x600') {
    return '300x600';
  }
  const is970 = ad.adFormat === '970x90' || ad.aspectRatio === '970 / 90' || ad.aspectRatio === '970/90' || ad.width === 970;
  if (is970) return '970x90';
  const is900 = ad.adFormat === '300x900' || ad.adFormat === '300x600' || ad.aspectRatio === '1 / 3' || ad.aspectRatio === '1 / 2' || ad.height === 900 || ad.height === 600;
  const is300 = ad.adFormat === '300x300' || ad.aspectRatio === '1 / 1' || ad.aspectRatio === '1/1' || ad.placement === 'sidebar' || ad.placement === 'article' || isExtraSidebarSquare(ad.placement);
  const is728 = ad.adFormat === '728x90' || ad.aspectRatio === '728 / 90' || ad.aspectRatio === '728/90' || ad.placement === 'header' || ad.placement === 'feed' || ad.placement === 'footer';
  if (is728 && !is900 && !is300) return '728x90';
  if (is900) return '300x600';
  return '300x300';
};

const normalizeAd = (ad: AdItem): AdItem => {
  const format = detectAdFormat(ad);
  const dims = AD_FORMAT_DIMENSIONS[format];
  return {
    ...ad,
    adFormat: format,
    aspectRatio: dims.ratio,
    width: dims.width,
    height: dims.height,
    maxWidth: dims.width,
    status: ad.status || (ad.active ? 'active' : 'paused'),
    durationSeconds: ad.durationSeconds || dims.duration,
    displayOrder: ad.displayOrder || 1,
    openInNewTab: ad.openInNewTab ?? true,
    altText: ad.altText || ad.title,
    impressionsCount: ad.impressionsCount || 0,
    clicksCount: ad.clicksCount || 0
  };
};

const mapAdRow = (item: any): AdItem => ({
  id: item.id,
  title: item.title,
  sponsorName: item.sponsor_name,
  linkUrl: item.link_url,
  mediaUrl: item.media_url,
  mediaType: item.media_type,
  placement: item.placement,
  adFormat: item.ad_format || undefined,
  aspectRatio: item.aspect_ratio || '1 / 1',
  maxWidth: item.max_width || undefined,
  width: item.width || undefined,
  height: item.height || undefined,
  active: item.active,
  status: item.status || undefined,
  startDate: item.start_date || undefined,
  endDate: item.end_date || undefined,
  createdAt: item.created_at,
  altText: item.alt_text || item.title,
  displayOrder: item.display_order || 1,
  durationSeconds: item.duration_seconds || undefined,
  openInNewTab: item.open_in_new_tab ?? true,
  campaignId: item.campaign_id || undefined,
  campaignName: item.campaign_name || undefined,
  impressionsCount: item.impressions_count || 0,
  clicksCount: item.clicks_count || 0
});

const adToRow = (ad: AdItem): Record<string, any> => ({
  title: ad.title,
  sponsor_name: ad.sponsorName,
  link_url: ad.linkUrl,
  media_url: ad.mediaUrl,
  media_type: ad.mediaType,
  placement: ad.placement,
  ad_format: ad.adFormat,
  aspect_ratio: ad.aspectRatio,
  max_width: ad.maxWidth ?? null,
  width: ad.width ?? null,
  height: ad.height ?? null,
  active: ad.active,
  status: ad.status || (ad.active ? 'active' : 'paused'),
  start_date: ad.startDate || null,
  end_date: ad.endDate || null,
  alt_text: ad.altText || ad.title,
  display_order: ad.displayOrder || 1,
  duration_seconds: ad.durationSeconds || 5,
  open_in_new_tab: ad.openInNewTab ?? true,
  campaign_id: ad.campaignId || null,
  campaign_name: ad.campaignName || null,
  updated_at: new Date().toISOString()
});

const notifyAdsUpdated = (detail: Record<string, unknown>): void => {
  safeDispatchEvent(new CustomEvent('folha_ads_updated', { detail }));
};

const updateAdOrders = async (orderedIds: string[]): Promise<void> => {
  const sb = requireSupabase();
  const results = await Promise.all(
    orderedIds.map((id, index) => sb.from('ads').update({ display_order: index + 1 }).eq('id', id))
  );
  const failed = results.find(r => r.error);
  if (failed?.error) throw describeDbError(failed.error, 'reordenar os anúncios');
};

export const adsService = {
  // Retorna configurações dos temporizadores e modos independentes por formato (300x300 e 300x900)
  getFormatSettings(): Record<'300x300' | '300x900' | '300x600', FormatCarouselSetting> {
    const stored = getStored<Partial<Record<'300x300' | '300x900' | '300x600', FormatCarouselSetting>>>(
      STORAGE_KEYS.ADS_FORMAT_SETTINGS,
      {}
    );
    return {
      '300x300': { ...DEFAULT_FORMAT_SETTINGS['300x300'], ...(stored['300x300'] || {}) },
      '300x900': { ...DEFAULT_FORMAT_SETTINGS['300x900'], ...(stored['300x900'] || {}) },
      '300x600': { ...DEFAULT_FORMAT_SETTINGS['300x600'], ...(stored['300x600'] || stored['300x900'] || {}) }
    };
  },

  async saveFormatSetting(
    format: '300x300' | '300x900' | '300x600',
    update: Partial<FormatCarouselSetting>
  ): Promise<FormatCarouselSetting> {
    const current = this.getFormatSettings();
    const updated: FormatCarouselSetting = { ...current[format], ...update, format };
    await saveSiteSetting('ads_format', { ...current, [format]: updated });
    notifyAdsUpdated({ format });
    return updated;
  },

  // Retorna configurações de modo (fixo vs carrossel), status e formato preferido para os espaços
  getPlacementSettings(): Record<AdPlacement, PlacementSetting> {
    const stored = getStored<Partial<Record<AdPlacement, PlacementSetting>>>(STORAGE_KEYS.ADS_SETTINGS, {});
    return {
      header: { ...DEFAULT_PLACEMENT_SETTINGS.header, ...(stored.header || {}) },
      feed: { ...DEFAULT_PLACEMENT_SETTINGS.feed, ...(stored.feed || {}) },
      sidebar: { ...DEFAULT_PLACEMENT_SETTINGS.sidebar, ...(stored.sidebar || {}) },
      sidebar_300x900: { ...DEFAULT_PLACEMENT_SETTINGS.sidebar_300x900, ...(stored.sidebar_300x900 || {}) },
      sidebar_300x600: { ...DEFAULT_PLACEMENT_SETTINGS.sidebar_300x600, ...(stored.sidebar_300x600 || {}) },
      sidebar_300x300_2: { ...DEFAULT_PLACEMENT_SETTINGS.sidebar_300x300_2, ...(stored.sidebar_300x300_2 || {}) },
      sidebar_300x300_3: { ...DEFAULT_PLACEMENT_SETTINGS.sidebar_300x300_3, ...(stored.sidebar_300x300_3 || {}) },
      article: { ...DEFAULT_PLACEMENT_SETTINGS.article, ...(stored.article || {}) },
      footer: { ...DEFAULT_PLACEMENT_SETTINGS.footer, ...(stored.footer || {}) }
    };
  },

  async savePlacementSetting(placement: AdPlacement, update: Partial<PlacementSetting>): Promise<PlacementSetting> {
    const current = this.getPlacementSettings();
    const updated: PlacementSetting = { ...current[placement], ...update, placement };
    await saveSiteSetting('ads_placement', { ...current, [placement]: updated });
    notifyAdsUpdated({ placement });
    return updated;
  },

  // Enquanto o banco não tem anúncios, exibe os banners iniciais embutidos
  async getAds(): Promise<AdItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && data) {
          const ads = (data.length > 0 ? data.map(mapAdRow) : INITIAL_ADS).map(normalizeAd);
          setStored(STORAGE_KEYS.ADS, ads);
          return ads;
        }
        console.warn('Erro ao carregar anúncios do Supabase, usando cópia local:', error?.message);
      } catch (err) {
        console.warn('Erro ao carregar anúncios do Supabase, usando cópia local:', err);
      }
    }

    return getStored<AdItem[]>(STORAGE_KEYS.ADS, INITIAL_ADS).map(normalizeAd);
  },

  async getAllAds(): Promise<AdItem[]> {
    return this.getAds();
  },

  // Retorna os anúncios de um formato específico ordenados
  async getAdsByFormat(format: '300x300' | '300x900' | '300x600' | '728x90' | '970x90'): Promise<AdItem[]> {
    const all = await this.getAds();
    return all
      .filter(a => {
        if (format === '300x900' || format === '300x600') {
          return a.adFormat === '300x900' || a.adFormat === '300x600' || a.placement === 'sidebar_300x900' || a.placement === 'sidebar_300x600' || a.aspectRatio === '1 / 3' || a.aspectRatio === '1 / 2';
        }
        if (format === '300x300') {
          return (a.adFormat === '300x300' || (a.aspectRatio === '1 / 1' && a.placement !== 'sidebar_300x900' && a.placement !== 'sidebar_300x600')) && !isExtraSidebarSquare(a.placement);
        }
        if (format === '970x90') {
          return a.adFormat === '970x90' || a.aspectRatio === '970 / 90';
        }
        if (format === '728x90') {
          return a.adFormat === '728x90' || a.aspectRatio === '728 / 90';
        }
        return false;
      })
      .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
  },

  // Retorna os anúncios de um espaço específico ordenados pela ordem de exibição
  async getAdsByPlacement(placement: AdPlacement): Promise<AdItem[]> {
    const all = await this.getAds();
    return all
      .filter(a => {
        if (placement === 'sidebar_300x900' || placement === 'sidebar_300x600') {
          return a.placement === 'sidebar_300x900' || a.placement === 'sidebar_300x600' || a.adFormat === '300x900' || a.adFormat === '300x600';
        }
        return a.placement === placement;
      })
      .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
  },

  async saveAd(ad: Omit<AdItem, 'id' | 'createdAt'> & { id?: string }): Promise<AdItem> {
    const sb = requireSupabase();
    const ads = await this.getAds();
    const format = detectAdFormat({ adFormat: ad.adFormat, placement: ad.placement });
    const dims = AD_FORMAT_DIMENSIONS[format];
    const mediaUrl = (await mediaService.ensureUploaded(ad.mediaUrl, 'ads')) || ad.mediaUrl;

    const base = {
      ...ad,
      mediaUrl,
      adFormat: format,
      aspectRatio: dims.ratio,
      width: dims.width,
      height: dims.height,
      maxWidth: dims.width,
      durationSeconds: Math.max(2, Math.min(60, Number(ad.durationSeconds) || dims.duration)),
      openInNewTab: ad.openInNewTab ?? true,
      altText: ad.altText || ad.title
    };

    let row: any;
    const existing = ad.id ? ads.find(a => a.id === ad.id) : undefined;

    if (ad.id) {
      const merged: AdItem = {
        ...(existing || ({} as AdItem)),
        ...base,
        id: ad.id,
        createdAt: existing?.createdAt || new Date().toISOString(),
        displayOrder: ad.displayOrder || existing?.displayOrder || 1
      };
      const { data, error } = await sb.from('ads').update(adToRow(merged)).eq('id', ad.id).select();
      if (error) throw describeDbError(error, 'salvar o anúncio');
      if (data && data.length > 0) {
        row = data[0];
      } else {
        // Banner inicial que ainda não existia no banco: cria com o mesmo id
        const { data: inserted, error: insertError } = await sb
          .from('ads')
          .insert([{ ...adToRow(merged), id: merged.id, created_at: merged.createdAt }])
          .select()
          .single();
        if (insertError) throw describeDbError(insertError, 'salvar o anúncio');
        row = inserted;
      }
    } else {
      // Criação: posiciona no fim do carrossel correspondente
      const nextOrder = ads.filter(a => a.placement === ad.placement || a.adFormat === format).length + 1;
      const created: AdItem = {
        ...base,
        id: newId(),
        displayOrder: ad.displayOrder || nextOrder,
        impressionsCount: 0,
        clicksCount: 0,
        createdAt: new Date().toISOString()
      };
      const { data, error } = await sb
        .from('ads')
        .insert([{ ...adToRow(created), id: created.id, created_at: created.createdAt }])
        .select()
        .single();
      if (error) throw describeDbError(error, 'criar o anúncio');
      row = data;
    }

    const saved = normalizeAd(mapAdRow(row));
    setStored(STORAGE_KEYS.ADS, [...ads.filter(a => a.id !== saved.id), saved]);
    notifyAdsUpdated({ placement: saved.placement, format: saved.adFormat });
    return saved;
  },

  async deleteAd(id: string): Promise<void> {
    const sb = requireSupabase();
    const ads = await this.getAds();
    const targetAd = ads.find(a => a.id === id);

    const { error } = await sb.from('ads').delete().eq('id', id);
    if (error) throw describeDbError(error, 'excluir o anúncio');

    const remaining = ads.filter(a => a.id !== id);
    setStored(STORAGE_KEYS.ADS, remaining);

    // Reajusta as ordens (1, 2...) dos que sobraram no mesmo formato/espaço
    if (targetAd) {
      const sameGroup = remaining
        .filter(a => a.placement === targetAd.placement || a.adFormat === targetAd.adFormat)
        .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1))
        .map(a => a.id);
      await updateAdOrders(sameGroup).catch(err => console.warn('Aviso:', err.message));
    }

    notifyAdsUpdated({ placement: targetAd?.placement, format: targetAd?.adFormat });
  },

  // Altera a ordem de exibição dos slides (1, 2, 3...) de um espaço ou formato
  async reorderAds(placement: AdPlacement, orderedIds: string[]): Promise<void> {
    await updateAdOrders(orderedIds);
    notifyAdsUpdated({ placement });
  },

  async reorderAdsByFormat(format: AdFormat, orderedIds: string[]): Promise<void> {
    await updateAdOrders(orderedIds);
    notifyAdsUpdated({ format });
  },

  // Registra impressão (quando o slide é ativado na tela)
  recordImpression(adId: string): void {
    if (!adId || !supabase) return;
    supabase.rpc('increment_ad_metric', { p_ad_id: adId, p_metric: 'impression' }).then(() => {});
  },

  // Registra clique no banner
  recordClick(adId: string): void {
    if (!adId || !supabase) return;
    supabase.rpc('increment_ad_metric', { p_ad_id: adId, p_metric: 'click' }).then(() => {});
  }
};

// ==========================================
// SERVIÇO DE GERENCIAMENTO E MODERAÇÃO DE USUÁRIOS
// As permissões são garantidas no banco (RLS + funções is_admin), não no navegador.
// ==========================================
const PROTECTED_ADMIN_EMAIL = 'tomsilvaconsignado@gmail.com';

const mapAuditRow = (row: any): UserAuditLog => ({
  id: row.id,
  userId: row.user_id,
  userEmail: row.user_email || '',
  userName: row.user_name || '',
  adminId: row.admin_id,
  adminEmail: row.admin_email || '',
  adminName: row.admin_name || '',
  action: row.action,
  previousStatus: row.previous_status || undefined,
  newStatus: row.new_status || undefined,
  reason: row.reason || '',
  result: row.result || 'success',
  createdAt: row.created_at
});

const fetchProfileById = async (userId: string): Promise<UserProfile> => {
  const sb = requireSupabase();
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw describeDbError(error, 'consultar o usuário');
  if (!data) throw new Error('Usuário não encontrado.');
  return mapProfileRow(data);
};

export const usersService = {
  // Alias de compatibilidade
  async getUsers(adminUser?: UserProfile): Promise<UserProfile[]> {
    return this.getAllUsers(adminUser);
  },

  async getAllUsers(adminUser?: UserProfile): Promise<UserProfile[]> {
    if (adminUser && adminUser.role !== 'admin' && adminUser.role !== 'editor') {
      throw new Error('Acesso restrito. Apenas administradores autorizados podem consultar os usuários do portal.');
    }
    const sb = requireSupabase();

    // RPC protegida por is_admin(): inclui confirmação de e-mail e último acesso do Supabase Auth
    const { data, error } = await sb.rpc('admin_list_users');
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        ...mapProfileRow(r.profile, {
          id: r.id,
          email: r.email,
          email_confirmed_at: r.email_confirmed_at,
          last_sign_in_at: r.last_sign_in_at,
          created_at: r.auth_created_at,
          user_metadata: {}
        }),
        hasProfile: Boolean(r.profile)
      }));
    }
    if (error) console.warn('Aviso: admin_list_users indisponível, lendo a tabela profiles:', error.message);

    const { data: profiles, error: profilesError } = await sb
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (profilesError) throw describeDbError(profilesError, 'listar os usuários');
    return (profiles || []).map((p: any) => mapProfileRow(p));
  },

  async getUserClassifiedsCount(userId: string): Promise<{ total: number; published: number; pending: number; rejected: number }> {
    const empty = { total: 0, published: 0, pending: 0, rejected: 0 };
    if (!supabase || !isUuid(userId)) return empty;
    const { data, error } = await supabase.from('classifieds').select('status').eq('user_id', userId);
    if (error || !data) return empty;
    return {
      total: data.length,
      published: data.filter(i => i.status === 'published').length,
      pending: data.filter(i => i.status === 'pending').length,
      rejected: data.filter(i => i.status === 'rejected').length
    };
  },

  async getUserReports(userId: string): Promise<ClassifiedReport[]> {
    if (!supabase || !isUuid(userId)) return [];
    const { data: items } = await supabase.from('classifieds').select('id').eq('user_id', userId);
    const ids = (items || []).map(i => i.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from('classified_reports').select('*').in('classified_id', ids);
    if (error || !data) return [];
    return data.map(mapReportRow);
  },

  async getAuditLogs(userId?: string): Promise<UserAuditLog[]> {
    if (!supabase) return [];
    let query = supabase.from('user_audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) {
      console.warn('Aviso: não foi possível carregar a auditoria:', error.message);
      return [];
    }
    return (data || []).map(mapAuditRow);
  },

  async recordAudit(logData: Omit<UserAuditLog, 'id' | 'createdAt'>): Promise<UserAuditLog> {
    const log: UserAuditLog = {
      id: newId(),
      ...logData,
      result: logData.result || 'success',
      createdAt: new Date().toISOString()
    };
    if (supabase) {
      const { error } = await supabase.from('user_audit_logs').insert([{
        id: log.id,
        user_id: isUuid(log.userId) ? log.userId : null,
        user_email: log.userEmail,
        user_name: log.userName,
        admin_id: isUuid(log.adminId) ? log.adminId : null,
        admin_email: log.adminEmail,
        admin_name: log.adminName,
        action: log.action,
        previous_status: log.previousStatus || null,
        new_status: log.newStatus || null,
        reason: log.reason,
        result: log.result,
        created_at: log.createdAt
      }]);
      if (error) console.warn('Aviso: não foi possível registrar a auditoria:', error.message);
    }
    return log;
  },

  async moderateUserStatus(
    targetUserId: string,
    newStatus: UserStatus,
    reason: string,
    adminUser: UserProfile
  ): Promise<UserProfile> {
    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Apenas administradores gerais possuem permissão para moderar contas.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('É obrigatório registrar uma justificativa clara (mínimo de 5 caracteres) para moderar a conta.');
    }

    const target = await fetchProfileById(targetUserId);
    if (target.id === adminUser.id) {
      throw new Error('Você não pode alterar o status ou aplicar restrições à sua própria conta de administrador.');
    }
    if (target.email.toLowerCase() === PROTECTED_ADMIN_EMAIL) {
      throw new Error('A conta do administrador principal é protegida pelo sistema e não pode ser suspensa ou bloqueada.');
    }

    const sb = requireSupabase();
    const { data, error } = await sb
      .from('profiles')
      .update({
        status: newStatus,
        moderation_reason: reason.trim(),
        moderation_at: new Date().toISOString(),
        moderated_by: adminUser.fullName,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)
      .select()
      .single();
    if (error) throw describeDbError(error, 'alterar o status da conta');

    await this.recordAudit({
      userId: target.id,
      userEmail: target.email,
      userName: target.fullName,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminName: adminUser.fullName,
      action: newStatus === 'active' ? 'reactivate' : newStatus === 'suspended' ? 'suspend' : 'block',
      previousStatus: target.status || 'active',
      newStatus,
      reason: reason.trim(),
      result: 'success'
    });

    return mapProfileRow(data);
  },

  async updateUserRoleProtected(
    targetUserId: string,
    newRole: UserRole,
    reason: string,
    adminUser: UserProfile
  ): Promise<void> {
    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Apenas o Administrador Geral pode alterar privilégios de acesso.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('É obrigatório registrar uma justificativa para alteração de privilégio administrativo.');
    }

    const target = await fetchProfileById(targetUserId);
    if (target.email.toLowerCase() === PROTECTED_ADMIN_EMAIL && newRole !== 'admin') {
      throw new Error('Os privilégios da conta do Administrador Geral não podem ser revogados.');
    }

    const sb = requireSupabase();
    const { error } = await sb
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);
    if (error) throw describeDbError(error, 'alterar o papel do usuário');

    await this.recordAudit({
      userId: target.id,
      userEmail: target.email,
      userName: target.fullName,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminName: adminUser.fullName,
      action: 'change_role',
      reason: `Alteração de papel de "${target.role}" para "${newRole}". Motivo: ${reason.trim()}`,
      result: 'success'
    });

    if (targetUserId === adminUser.id) {
      safeDispatchEvent(new Event('folha_auth_changed'));
    }
  },

  async adminResendConfirmation(targetUserId: string, adminUser: UserProfile): Promise<{ success: boolean; message: string }> {
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'editor')) {
      throw new Error('Acesso não autorizado.');
    }

    const target = await fetchProfileById(targetUserId);
    const res = await authService.resendConfirmationEmail(target.email);

    await this.recordAudit({
      userId: target.id,
      userEmail: target.email,
      userName: target.fullName,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminName: adminUser.fullName,
      action: 'resend_confirmation',
      reason: 'Reenvio de link de confirmação solicitado via painel administrativo.',
      result: res.success ? 'success' : 'failure'
    });
    return res;
  },

  async adminForceConfirmEmail(targetUserId: string, adminUser: UserProfile): Promise<void> {
    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Apenas o Administrador Geral pode validar manualmente o e-mail de um usuário.');
    }

    const target = await fetchProfileById(targetUserId);
    const sb = requireSupabase();
    const { error } = await sb.rpc('admin_confirm_user_email', { target_user: targetUserId });
    if (error) throw describeDbError(error, 'confirmar o e-mail do usuário');

    await this.recordAudit({
      userId: target.id,
      userEmail: target.email,
      userName: target.fullName,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminName: adminUser.fullName,
      action: 'confirm_email',
      reason: 'Confirmação manual de e-mail realizada pelo administrador após validação direta.',
      result: 'success'
    });
  }
};

// ==========================================
// SERVIÇO DE COMENTÁRIOS E NEWSLETTER
// ==========================================
export const commentsService = {
  async getComments(articleId: string): Promise<Comment[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((c: any) => ({
      id: c.id,
      articleId: c.article_id,
      userId: c.user_id,
      userName: c.user_name,
      userAvatar: c.user_avatar || undefined,
      content: c.content,
      createdAt: c.created_at
    }));
  },

  async addComment(articleId: string, content: string, user: UserProfile): Promise<Comment> {
    const sb = requireSupabase();
    const comment: Comment = {
      id: newId(),
      articleId,
      userId: user.id,
      userName: user.fullName,
      userAvatar: user.avatarUrl,
      content,
      createdAt: new Date().toISOString()
    };
    const { error } = await sb.from('comments').insert([{
      id: comment.id,
      article_id: articleId,
      user_id: user.id,
      user_name: comment.userName,
      user_avatar: comment.userAvatar || null,
      content
    }]);
    if (error?.code === '23503') {
      throw new Error('Esta matéria ainda não foi gravada no banco de dados, por isso não aceita comentários.');
    }
    if (error) throw describeDbError(error, 'publicar o comentário');
    return comment;
  }
};

export const newsletterService = {
  async subscribe(email: string): Promise<{ success: boolean; message: string }> {
    const sb = requireSupabase();
    const { error } = await sb.from('newsletter_subscribers').insert([{ email: email.trim().toLowerCase() }]);
    if (error?.code === '23505') {
      return { success: true, message: 'Você já está cadastrado em nossa lista VIP!' };
    }
    if (error) {
      return { success: false, message: describeDbError(error, 'concluir a inscrição').message };
    }
    return { success: true, message: 'Inscrição confirmada com sucesso! Fique atento ao seu e-mail.' };
  },

  async getSubscribers(): Promise<NewsletterSubscriber[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((s: any) => ({ id: s.id, email: s.email, createdAt: s.created_at }));
  }
};

// ==========================================
// SERVIÇO DE NOTIFICAÇÕES PARA USUÁRIOS
// As notificações de novas matérias são criadas no banco (trigger notify_readers_of_article)
// ==========================================
export const notificationsService = {
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    if (!supabase || !isUuid(userId)) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) {
      if (error) console.warn('Erro ao carregar notificações do Supabase', error.message);
      return [];
    }
    return data.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      articleId: n.article_id,
      articleSlug: n.article_slug,
      articleTitle: n.article_title,
      category: n.category,
      imageUrl: n.image_url,
      message: n.message,
      createdAt: n.created_at,
      read: n.read
    }));
  },

  async markAsRead(notificationId: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
      if (error) console.warn('Erro ao marcar notificação no Supabase', error.message);
    }
    safeDispatchEvent(new Event('folha_notifications_updated'));
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
      if (error) console.warn('Erro ao marcar todas notificações no Supabase', error.message);
    }
    safeDispatchEvent(new Event('folha_notifications_updated'));
  }
};

// ==========================================
// VALIDAÇÃO DE PERFIL E SERVIÇO DE CLASSIFICADOS
// ==========================================

export function isUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

export function checkProfileCompletion(user: UserProfile | null): { 
  isComplete: boolean; 
  missingFields: string[];
} {
  if (!user) {
    return { isComplete: false, missingFields: ['Usuário não autenticado'] };
  }
  
  const missing: string[] = [];
  
  if (!user.fullName?.trim()) {
    missing.push('Nome Completo');
  }
  
  const cleanPhone = (user.phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    missing.push('Telefone / WhatsApp com DDD');
  }
  
  if (!user.city?.trim()) {
    missing.push('Cidade');
  }

  if (user.accountType === 'pj') {
    if (!user.companyName?.trim()) {
      missing.push('Razão Social da Empresa');
    }
    const cleanCnpj = (user.cnpj || '').replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      missing.push('CNPJ Válido (14 dígitos)');
    }
    if (!user.legalRepresentative?.trim()) {
      missing.push('Nome do Representante Legal');
    }
  } else {
    // PF
    const cleanCpf = (user.cpf || '').replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      missing.push('CPF Válido (11 dígitos)');
    }
  }

  if (!user.termsAccepted) {
    missing.push('Aceite dos Termos de Uso e Política de Privacidade');
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing
  };
}

function mapClassifiedRowToItem(row: any): ClassifiedItem {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    section: row.section,
    type: row.type,
    category: row.category,
    title: row.title,
    slug: row.slug,
    description: row.description,
    priceType: row.price_type,
    price: row.price !== null && row.price !== undefined ? Number(row.price) : undefined,
    city: row.city,
    state: row.state || 'SE',
    advertiserName: row.advertiser_name,
    phone: row.phone,
    images: Array.isArray(row.images) ? row.images : [],
    jobRole: row.job_role || undefined,
    jobArea: row.job_area || undefined,
    contractType: row.contract_type || undefined,
    workload: row.workload || undefined,
    experience: row.experience || undefined,
    requirements: row.requirements || undefined,
    status: row.status,
    rejectionReason: row.rejection_reason || undefined,
    viewsCount: row.views_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at
  };
}

function mapClassifiedItemToRow(item: ClassifiedItem): any {
  return {
    id: item.id,
    code: item.code,
    user_id: item.userId,
    section: item.section,
    type: item.type,
    category: item.category,
    title: item.title,
    slug: item.slug,
    description: item.description,
    price_type: item.priceType,
    price: item.priceType === 'fixed' && item.price !== undefined ? item.price : null,
    city: item.city,
    state: item.state || 'SE',
    advertiser_name: item.advertiserName,
    phone: item.phone,
    images: item.images || [],
    job_role: item.jobRole || null,
    job_area: item.jobArea || null,
    contract_type: item.contractType || null,
    workload: item.workload || null,
    experience: item.experience || null,
    requirements: item.requirements || null,
    status: item.status,
    rejection_reason: item.rejectionReason || null,
    views_count: item.viewsCount || 0,
    created_at: item.createdAt,
    updated_at: item.updatedAt || item.createdAt,
    expires_at: item.expiresAt
  };
}

function mapReportRow(row: any): ClassifiedReport {
  return {
    id: row.id,
    classifiedId: row.classified_id,
    classifiedTitle: row.classified_title,
    reporterName: row.reporter_name || undefined,
    reporterEmail: row.reporter_email || undefined,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at
  };
}

const markExpired = (item: ClassifiedItem, now: Date): ClassifiedItem =>
  item.status === 'published' && new Date(item.expiresAt) < now
    ? { ...item, status: 'expired' as ClassifiedStatus }
    : item;

const generateClassifiedIdentity = (title: string): { code: string; slug: string } => {
  const code = `CL-${Math.floor(1000 + Math.random() * 9000)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
  return { code, slug: `${slugify(title || 'anuncio')}-${code.toLowerCase()}` };
};

export const classifiedsService = {
  // Configurações
  async getSettings(): Promise<ClassifiedsSettings> {
    if (supabase) {
      const { data, error } = await supabase.from('classified_settings').select('*').eq('id', 'default').maybeSingle();
      if (!error && data) {
        const settings: ClassifiedsSettings = {
          requireApproval: data.require_approval ?? true,
          defaultValidityDays: data.default_validity_days || 30
        };
        setStored(STORAGE_KEYS.CLASSIFIED_SETTINGS, settings);
        return settings;
      }
    }
    return getStored<ClassifiedsSettings>(STORAGE_KEYS.CLASSIFIED_SETTINGS, DEFAULT_CLASSIFIEDS_SETTINGS);
  },

  async updateSettings(newSettings: Partial<ClassifiedsSettings>): Promise<ClassifiedsSettings> {
    const sb = requireSupabase();
    const updated = { ...(await this.getSettings()), ...newSettings };
    const { error } = await sb.from('classified_settings').upsert([{
      id: 'default',
      require_approval: updated.requireApproval,
      default_validity_days: updated.defaultValidityDays,
      updated_at: new Date().toISOString()
    }], { onConflict: 'id' });
    if (error) throw describeDbError(error, 'salvar as regras dos classificados');
    setStored(STORAGE_KEYS.CLASSIFIED_SETTINGS, updated);
    return updated;
  },

  // Categorias
  async getCategories(section?: ClassifiedSection): Promise<ClassifiedCategory[]> {
    let all: ClassifiedCategory[] = getStored<ClassifiedCategory[]>(STORAGE_KEYS.CLASSIFIED_CATEGORIES, INITIAL_CLASSIFIED_CATEGORIES);
    if (supabase) {
      const { data, error } = await supabase.from('classified_categories').select('id, name, section').order('created_at', { ascending: true });
      if (!error && data) {
        all = data.length > 0 ? (data as ClassifiedCategory[]) : INITIAL_CLASSIFIED_CATEGORIES;
        setStored(STORAGE_KEYS.CLASSIFIED_CATEGORIES, all);
      }
    }
    return section ? all.filter(c => c.section === section) : all;
  },

  async saveCategory(category: Omit<ClassifiedCategory, 'id'> & { id?: string }): Promise<ClassifiedCategory> {
    const sb = requireSupabase();
    const saved: ClassifiedCategory = { id: category.id || newId(), name: category.name, section: category.section };
    const { error } = await sb.from('classified_categories').upsert([saved], { onConflict: 'id' });
    if (error) throw describeDbError(error, 'salvar a categoria');
    return saved;
  },

  async deleteCategory(id: string): Promise<void> {
    const sb = requireSupabase();
    const { error } = await sb.from('classified_categories').delete().eq('id', id);
    if (error) throw describeDbError(error, 'excluir a categoria');
  },

  // Consulta de anúncios. O RLS do banco decide o que cada pessoa enxerga:
  // visitantes veem só os publicados e válidos; donos e equipe veem também os demais.
  async getClassifieds(options?: {
    section?: ClassifiedSection;
    category?: string;
    type?: ClassifiedType;
    city?: string;
    search?: string;
    status?: ClassifiedStatus;
    sortBy?: 'recent' | 'price_asc' | 'price_desc';
    includeExpired?: boolean;
  }): Promise<ClassifiedItem[]> {
    let items: ClassifiedItem[] = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, []);
    if (supabase) {
      const { data, error } = await supabase.from('classifieds').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        items = data.map(mapClassifiedRowToItem);
        setStored(STORAGE_KEYS.CLASSIFIEDS, items);
      } else if (error) {
        console.warn('Aviso: Falha ao consultar classificados no Supabase, usando cópia local:', error.message);
      }
    }

    const now = new Date();
    items = items.map(item => markExpired(item, now));

    // Por padrão, apenas publicados para o público
    const targetStatus = options?.status ?? 'published';
    if (!options?.includeExpired) {
      items = items.filter(item => item.status === targetStatus);
    }

    if (options?.section) {
      items = items.filter(item => item.section === options.section);
    }

    if (options?.category && options.category !== 'todas') {
      items = items.filter(item => item.category.toLowerCase() === options.category!.toLowerCase());
    }

    if (options?.type && options.type !== ('todos' as any)) {
      items = items.filter(item => item.type === options.type);
    }

    if (options?.city && options.city !== 'todas') {
      items = items.filter(item => item.city.toLowerCase() === options.city!.toLowerCase());
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      items = items.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.jobRole && item.jobRole.toLowerCase().includes(q)) ||
        (item.advertiserName && item.advertiserName.toLowerCase().includes(q)) ||
        item.city.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    }

    if (options?.sortBy === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (options?.sortBy === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return items;
  },

  async getClassifiedById(id: string): Promise<ClassifiedItem | null> {
    if (supabase) {
      const { data, error } = await supabase.from('classifieds').select('*').eq('id', id).maybeSingle();
      if (!error) return data ? mapClassifiedRowToItem(data) : null;
    }
    return getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, []).find(item => item.id === id) || null;
  },

  async getClassifiedBySlug(slug: string): Promise<ClassifiedItem | null> {
    if (supabase) {
      const { data, error } = await supabase.from('classifieds').select('*').eq('slug', slug).maybeSingle();
      if (!error && data) return mapClassifiedRowToItem(data);
      if (!error) return this.getClassifiedById(slug);
    }
    return getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, []).find(item => item.slug === slug || item.id === slug) || null;
  },

  async getUserClassifieds(userId: string): Promise<ClassifiedItem[]> {
    if (!supabase || !isUuid(userId)) return [];
    const { data, error } = await supabase
      .from('classifieds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw describeDbError(error, 'carregar seus anúncios');
    const now = new Date();
    return (data || []).map(mapClassifiedRowToItem).map(item => markExpired(item, now));
  },

  // Cadastro e edição. Status e aprovação também são garantidos pelo trigger
  // protect_classified_moderation_fields no banco.
  async saveClassified(itemData: Partial<ClassifiedItem>, user: UserProfile): Promise<ClassifiedItem> {
    if (!user) throw new Error('Usuário não autenticado. Faça login para publicar anúncios.');
    if (!isUuid(user.id)) throw new Error('Sua sessão expirou. Faça login novamente para publicar anúncios.');

    if (user.status === 'suspended' || user.status === 'blocked' || user.status === 'inactive') {
      throw new Error('Sua conta está inativa ou com restrição administrativa e não pode publicar ou editar anúncios. Entre em contato com a moderação para revisão.');
    }

    if (!itemData.title?.trim()) {
      throw new Error('Informe o título do anúncio.');
    }
    if (!itemData.phone?.trim()) {
      throw new Error('Informe um telefone de contato para o anúncio.');
    }
    if (!itemData.city?.trim()) {
      throw new Error('Informe a cidade do anúncio.');
    }

    const sb = requireSupabase();
    // No máximo 3 imagens, enviadas ao Storage em vez de gravadas em base64
    const images = await mediaService.ensureAllUploaded((itemData.images || []).slice(0, 3), `classifieds/${user.id}`);
    const settings = await this.getSettings();
    const isAdmin = user.role === 'admin';

    if (itemData.id) {
      const existing = await this.getClassifiedById(itemData.id);
      if (!existing) throw new Error('Anúncio não encontrado.');
      if (existing.userId !== user.id && !isAdmin) {
        throw new Error('Você não tem permissão para editar este anúncio.');
      }

      const updated: ClassifiedItem = {
        ...existing,
        ...itemData,
        id: existing.id,
        userId: existing.userId,
        code: existing.code,
        images,
        updatedAt: new Date().toISOString()
      };
      // Edição feita pelo anunciante volta para análise quando a aprovação está ativa
      if (!isAdmin && settings.requireApproval && updated.status === 'published') {
        updated.status = 'pending';
      }

      const { data, error } = await sb
        .from('classifieds')
        .update(mapClassifiedItemToRow(updated))
        .eq('id', updated.id)
        .select()
        .single();
      if (error) throw describeDbError(error, 'salvar o anúncio');

      safeDispatchEvent(new Event('folha_classifieds_updated'));
      return mapClassifiedRowToItem(data);
    }

    const validityDays = settings.defaultValidityDays || 30;
    const createItem = (): ClassifiedItem => {
      const { code, slug } = generateClassifiedIdentity(itemData.title || '');
      return {
        id: newId(),
        code,
        userId: user.id,
        section: itemData.section || 'produtos_servicos',
        type: itemData.type || 'vendo',
        category: itemData.category || 'Outros produtos e serviços',
        title: itemData.title?.trim() || 'Sem título',
        slug,
        description: itemData.description?.trim() || '',
        priceType: itemData.priceType || 'fixed',
        price: itemData.priceType === 'fixed' ? Number(itemData.price || 0) : undefined,
        city: itemData.city?.trim() || user.city || 'Estância',
        state: itemData.state?.trim() || user.state || 'SE',
        advertiserName: itemData.advertiserName?.trim() || user.fullName,
        phone: itemData.phone?.trim() || user.phone || '',
        images,
        jobRole: itemData.jobRole?.trim(),
        jobArea: itemData.jobArea?.trim(),
        contractType: itemData.contractType,
        workload: itemData.workload,
        experience: itemData.experience?.trim(),
        requirements: itemData.requirements?.trim(),
        status: settings.requireApproval && !isAdmin ? 'pending' : 'published',
        viewsCount: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + validityDays * 24 * 3600 * 1000).toISOString()
      };
    };

    const insertItem = (item: ClassifiedItem) =>
      sb.from('classifieds').insert([mapClassifiedItemToRow(item)]).select().single();

    let { data, error } = await insertItem(createItem());
    if (error?.code === '23505') {
      // Colisão de código/slug: tenta novamente com outro código
      ({ data, error } = await insertItem(createItem()));
    }
    if (error) throw describeDbError(error, 'publicar o anúncio');

    safeDispatchEvent(new Event('folha_classifieds_updated'));
    return mapClassifiedRowToItem(data);
  },

  async deleteClassified(id: string, user: UserProfile): Promise<boolean> {
    const target = await this.getClassifiedById(id);
    if (!target) return false;
    if (target.userId !== user.id && user.role !== 'admin') {
      throw new Error('Você não tem permissão para excluir este anúncio.');
    }

    const sb = requireSupabase();
    const { error } = await sb.from('classifieds').delete().eq('id', id);
    if (error) throw describeDbError(error, 'excluir o anúncio');

    safeDispatchEvent(new Event('folha_classifieds_updated'));
    return true;
  },

  async updateClassifiedStatus(
    id: string,
    newStatus: ClassifiedStatus,
    user: UserProfile,
    rejectionReason?: string
  ): Promise<boolean> {
    const target = await this.getClassifiedById(id);
    if (!target) return false;

    const isStaff = user.role === 'admin' || user.role === 'editor';
    const isOwner = target.userId === user.id;
    if (!isStaff && !isOwner) {
      throw new Error('Permissão negada.');
    }

    // Usuário comum só pode pausar ou reativar (se já era publicado ou pausado)
    if (!isStaff) {
      if (newStatus !== 'paused' && newStatus !== 'published') {
        throw new Error('Você só pode pausar ou reativar seus anúncios.');
      }
      if (newStatus === 'published' && target.status !== 'paused') {
        throw new Error('Apenas anúncios pausados podem ser reativados diretamente.');
      }
    }

    const sb = requireSupabase();
    const { error } = await sb.from('classifieds').update({
      status: newStatus,
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw describeDbError(error, 'alterar o status do anúncio');

    safeDispatchEvent(new Event('folha_classifieds_updated'));
    return true;
  },

  async renewClassified(id: string, user: UserProfile): Promise<boolean> {
    const target = await this.getClassifiedById(id);
    if (!target) return false;
    if (target.userId !== user.id && user.role !== 'admin') {
      throw new Error('Permissão negada.');
    }

    const settings = await this.getSettings();
    const days = settings.defaultValidityDays || 30;
    // Se estava expirado, volta para publicado (ou para análise, se configurado)
    const status: ClassifiedStatus = target.status === 'expired' || new Date(target.expiresAt) < new Date()
      ? (settings.requireApproval && user.role !== 'admin' ? 'pending' : 'published')
      : target.status;

    const sb = requireSupabase();
    const { error } = await sb.from('classifieds').update({
      expires_at: new Date(Date.now() + days * 24 * 3600 * 1000).toISOString(),
      status,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw describeDbError(error, 'renovar o anúncio');

    safeDispatchEvent(new Event('folha_classifieds_updated'));
    return true;
  },

  async incrementViews(id: string): Promise<number> {
    const cached = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, []).find(i => i.id === id);
    if (supabase) {
      supabase.rpc('increment_classified_views', { classified_id: id }).then(({ error }) => {
        if (error) console.warn('Aviso: não foi possível registrar a visualização:', error.message);
      });
    }
    return (cached?.viewsCount || 0) + 1;
  },

  // Denúncias
  async getReports(): Promise<ClassifiedReport[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('classified_reports').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapReportRow);
  },

  async createReport(reportData: Omit<ClassifiedReport, 'id' | 'createdAt' | 'status'>): Promise<ClassifiedReport> {
    const sb = requireSupabase();
    const report: ClassifiedReport = {
      id: newId(),
      ...reportData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const { error } = await sb.from('classified_reports').insert([{
      id: report.id,
      classified_id: report.classifiedId,
      classified_title: report.classifiedTitle,
      reporter_name: report.reporterName || null,
      reporter_email: report.reporterEmail || null,
      reason: report.reason,
      details: report.details,
      status: 'pending'
    }]);
    if (error) throw describeDbError(error, 'enviar a denúncia');
    return report;
  },

  async updateReportStatus(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
    const sb = requireSupabase();
    const { error } = await sb.from('classified_reports').update({ status }).eq('id', reportId);
    if (error) throw describeDbError(error, 'atualizar a denúncia');
  }
};

// ==========================================
// CONFIGURAÇÕES DO PORTAL & CONTEÚDO INSTITUCIONAL
// ==========================================
export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  // 1. Identidade e Slogan
  officialName: 'Folha da Região',
  shortName: 'Folha da Região',
  customLogoUrl: 'vetor.svg',
  tagline: 'A NOTÍCIA ONDE VOCÊ ESTIVER',
  presentationPhrase: 'Jornalismo independente, ágil e com credibilidade em Sergipe',
  shortInstitutionalText: 'O portal Folha da Região é comprometido com a verdade e a informação de qualidade para todo o estado de Sergipe.',
  portalDescription: 'Portal de notícias e classificados de Estância e de todo o estado de Sergipe.',
  logoBadgeText: 'ONLINE',

  // 2. Contatos do Portal & Visibilidade
  contactEmail: 'itallomarketing@gmail.com',
  showContactEmail: true,
  contactPhone: '(79) 99977-6199',
  showContactPhone: true,
  whatsappNumber: '(79) 99977-6199',
  whatsappLink: 'https://wa.me/5579999776199',
  showWhatsapp: true,
  commercialAddress: 'Rua Divaldo Carvalho Costa, 304 B, 1º Andar',
  showCommercialAddress: true,
  city: 'Estância',
  state: 'SE',
  openingHours: 'Segunda a Sexta, das 08h às 18h',
  showOpeningHours: true,

  // 3. Informações Institucionais do Rodapé
  footerPresentation: 'O portal Folha da Região é comprometido com a verdade e a informação de qualidade para todo o estado de Sergipe.',
  footerAboutText: 'Cobertura em tempo real dos 75 municípios sergipanos, com política, cidades, economia, polícia e classificados.',
  footerClosingPhrase: 'A notícia onde você estiver.',
  copyrightText: 'Folha da Região Sergipe. Todos os direitos reservados.',
  referenceYear: '2026',
  responsibleCompany: 'Folha da Região Comunicação & Publicidade LTDA',
  additionalFooterInfo: 'Fundado em Estância - Sergipe',

  // 4. Redes Sociais
  facebookUrl: 'https://www.facebook.com/folhadaregiaose/?locale=pt_BR',
  showFacebook: true,
  instagramUrl: 'https://www.instagram.com/folhadaregiaose',
  showInstagram: true,
  twitterUrl: '',
  showTwitter: false,
  youtubeUrl: '',
  showYoutube: false,

  // 5. Páginas Institucionais
  institutionalPages: {
    sobreNos: {
      title: 'Sobre a Folha da Região',
      leadParagraph: 'A Folha da Região consolidou-se como a principal referência jornalística de Estância e de todo o estado de Sergipe. Nascido com o propósito de levar informação ágil, ética e com apuração rigorosa, nosso portal conecta os cidadãos aos acontecimentos que moldam a sociedade.',
      historyParagraphs: [
        'Com mais de uma década de presença comunicacional na região Sul e em todo o território sergipano, o portal acompanha diariamente as transformações econômicas, culturais e políticas.',
        'Nossa redação atua com independência e responsabilidade cívica, assegurando a pluralidade de vozes e a verdade apurada.'
      ],
      mission: 'Informar com imparcialidade, verdade e independência, promovendo o debate construtivo e o desenvolvimento regional.',
      values: 'Compromisso com o leitor, checagem de fatos, respeito à diversidade e valorização da cultura sergipana.',
      coverage: 'Presente diariamente nos 75 municípios de Sergipe e com audiência em todo o território nacional.'
    },
    expediente: {
      directorName: 'Ítallo Nascimento',
      directorRole: 'Direção Geral & Editor-Chefe',
      directorEmail: 'itallomarketing@gmail.com',
      commercialDept: 'Departamento Comercial & Marketing',
      commercialContact: '(79) 99977-6199',
      newsroomLocations: 'Aracaju, Estância, Lagarto e Itabaiana',
      coverageHours: 'Cobertura estadual 24 horas',
      administrativeHeadquarters: 'Rua Divaldo Carvalho Costa, 304 B, 1º Andar, Estância - Sergipe'
    },
    privacidade: {
      introText: 'A Folha da Região Online respeita a privacidade de seus leitores e usuários e cumpre as disposições da Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).',
      dataCollectionText: 'Coletamos informações cadastrais básicas (nome e e-mail) exclusivamente quando fornecidas voluntariamente para fins de autenticação, publicação de classificados ou subscrição da newsletter.',
      securityText: 'Os dados de usuários e credenciais são gerenciados com proteção e criptografia de ponta a ponta, garantindo que suas senhas e dados confidenciais nunca sejam expostos.',
      cookiesText: 'Utilizamos cookies estritamente para métricas estatísticas de visualização, sessão do usuário e preferências de leitura.',
      userRightsText: 'O titular dos dados tem o direito de solicitar a qualquer momento a confirmação, retificação ou exclusão de suas informações da nossa base.',
      dpoContact: 'itallomarketing@gmail.com'
    }
  },

  // 6. Configurações de E-mail do Portal e Comunicação
  emailConfig: {
    enabled: true,
    fromName: 'Folha da Região',
    fromEmail: 'contato@folhadaregiaoonline.com.br',
    replyTo: 'itallomarketing@gmail.com',
    provider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    notifyOnNewRegistration: true,
    notifyOnNewClassified: true
  }
};

// Credenciais SMTP ficam só no navegador do administrador (a tabela site_settings é pública)
interface SmtpSecret {
  smtpUser?: string;
  smtpPass?: string;
}

export const portalSettingsService = {
  getSettingsSync(): PortalSettings {
    const stored = getStored<Partial<PortalSettings>>(STORAGE_KEYS.PORTAL_SETTINGS, {});
    const secret = getStored<SmtpSecret>(STORAGE_KEYS.SMTP_SECRET, {});
    // Se o logo gravado for inválido ou o hash transitório do GitHub, garante vetor.svg
    let effectiveLogo = stored.customLogoUrl;
    if (effectiveLogo && (effectiveLogo.includes('39f8b6c0') || !effectiveLogo.trim())) {
      effectiveLogo = 'vetor.svg';
    }
    return {
      ...DEFAULT_PORTAL_SETTINGS,
      ...stored,
      customLogoUrl: effectiveLogo || DEFAULT_PORTAL_SETTINGS.customLogoUrl || 'vetor.svg',
      institutionalPages: {
        ...DEFAULT_PORTAL_SETTINGS.institutionalPages,
        ...(stored.institutionalPages || {}),
        sobreNos: {
          ...DEFAULT_PORTAL_SETTINGS.institutionalPages.sobreNos,
          ...(stored.institutionalPages?.sobreNos || {})
        },
        expediente: {
          ...DEFAULT_PORTAL_SETTINGS.institutionalPages.expediente,
          ...(stored.institutionalPages?.expediente || {})
        },
        privacidade: {
          ...DEFAULT_PORTAL_SETTINGS.institutionalPages.privacidade,
          ...(stored.institutionalPages?.privacidade || {})
        }
      },
      emailConfig: {
        ...DEFAULT_PORTAL_SETTINGS.emailConfig!,
        ...(stored.emailConfig || {}),
        smtpUser: secret.smtpUser || stored.emailConfig?.smtpUser || '',
        smtpPass: secret.smtpPass || ''
      }
    };
  },

  async getSettings(): Promise<PortalSettings> {
    return this.getSettingsSync();
  },

  async saveSettings(newSettings: PortalSettings): Promise<PortalSettings> {
    const customLogoUrl = await mediaService.ensureUploaded(newSettings.customLogoUrl, 'portal');
    const updated: PortalSettings = {
      ...newSettings,
      customLogoUrl,
      updatedAt: new Date().toISOString()
    };

    const { smtpUser, smtpPass, ...publicEmailConfig } = updated.emailConfig || ({} as NonNullable<PortalSettings['emailConfig']>);
    await saveSiteSetting('portal', {
      ...updated,
      emailConfig: updated.emailConfig ? publicEmailConfig : undefined
    });
    setStored<SmtpSecret>(STORAGE_KEYS.SMTP_SECRET, { smtpUser, smtpPass });

    const effective = this.getSettingsSync();
    safeDispatchEvent(new CustomEvent('folha_portal_settings_updated', { detail: effective }));
    return effective;
  },

  async resetToDefaults(): Promise<PortalSettings> {
    const { smtpUser: _u, smtpPass: _p, ...publicEmailConfig } = DEFAULT_PORTAL_SETTINGS.emailConfig!;
    await saveSiteSetting('portal', { ...DEFAULT_PORTAL_SETTINGS, emailConfig: publicEmailConfig });
    const effective = this.getSettingsSync();
    safeDispatchEvent(new CustomEvent('folha_portal_settings_updated', { detail: effective }));
    return effective;
  }
};

// ==========================================
// IMPORTAÇÃO DO CONTEÚDO DA VERSÃO ANTERIOR
// Antes desta versão, notícias, banners e configurações editados no painel ficavam
// apenas no localStorage do navegador de quem editou. Este serviço grava esse
// conteúdo (mais as matérias e banners iniciais) no Supabase, sem sobrescrever
// registros que já existam no banco.
// ==========================================
export interface LegacyImportResult {
  articles: number;
  ads: number;
  settings: number;
  errors: string[];
}

const mergeById = <T extends { id: string }>(base: T[], overrides: T[]): T[] => {
  const map = new Map<string, T>();
  base.forEach(item => map.set(item.id, item));
  overrides.forEach(item => map.set(item.id, item));
  return Array.from(map.values());
};

export const legacyContentService = {
  hasLegacyData(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return Object.values(LEGACY_STORAGE_KEYS).some(key => localStorage.getItem(key) !== null);
    } catch {
      return false;
    }
  },

  // true quando o banco ainda não tem nenhuma matéria (o portal está exibindo as iniciais)
  async isDatabaseEmpty(): Promise<boolean> {
    if (!supabase) return false;
    const { count, error } = await supabase.from('articles').select('id', { count: 'exact', head: true });
    return !error && count === 0;
  },

  async importToSupabase(): Promise<LegacyImportResult> {
    const sb = requireSupabase();
    const result: LegacyImportResult = { articles: 0, ads: 0, settings: 0, errors: [] };

    // 1. Matérias
    const articles = mergeById(INITIAL_ARTICLES, getStored<Article[]>(LEGACY_STORAGE_KEYS.ARTICLES, []));
    for (const article of articles) {
      try {
        const imageUrl = (await mediaService.ensureUploaded(article.imageUrl, 'articles')) || DEFAULT_ARTICLE_IMAGE;
        const videoUrl = await mediaService.ensureUploaded(article.videoUrl, 'articles');
        const row = {
          ...articleToRow({ ...article, imageUrl, videoUrl, slug: article.slug || slugify(article.title) }),
          id: article.id,
          views_count: article.viewsCount || 0,
          created_at: article.createdAt || new Date().toISOString()
        };
        const { data, error } = await sb.from('articles').upsert([row], { onConflict: 'id', ignoreDuplicates: true }).select('id');
        // Mesmo slug com outro id: a matéria já está no banco (ex.: importada do backup)
        if (error?.code === '23505') continue;
        if (error) throw error;
        if (data && data.length > 0) result.articles++;
      } catch (err: any) {
        result.errors.push(`Matéria "${article.title}": ${err?.message || err}`);
      }
    }

    // 2. Banners
    const ads = mergeById(INITIAL_ADS, getStored<AdItem[]>(LEGACY_STORAGE_KEYS.ADS, [])).map(normalizeAd);
    for (const ad of ads) {
      try {
        const mediaUrl = (await mediaService.ensureUploaded(ad.mediaUrl, 'ads')) || ad.mediaUrl;
        const row = {
          ...adToRow({ ...ad, mediaUrl }),
          id: ad.id,
          impressions_count: ad.impressionsCount || 0,
          clicks_count: ad.clicksCount || 0,
          created_at: ad.createdAt || new Date().toISOString()
        };
        const { data, error } = await sb.from('ads').upsert([row], { onConflict: 'id', ignoreDuplicates: true }).select('id');
        if (error) throw error;
        if (data && data.length > 0) result.ads++;
      } catch (err: any) {
        result.errors.push(`Banner "${ad.title}": ${err?.message || err}`);
      }
    }

    // 3. Configurações (só se existirem na versão anterior)
    const legacyPortal = getStored<PortalSettings | null>(LEGACY_STORAGE_KEYS.PORTAL_SETTINGS, null);
    if (legacyPortal) {
      try {
        setStored(STORAGE_KEYS.PORTAL_SETTINGS, legacyPortal);
        await portalSettingsService.saveSettings(portalSettingsService.getSettingsSync());
        result.settings++;
      } catch (err: any) {
        result.errors.push(`Configurações do portal: ${err?.message || err}`);
      }
    }
    const legacySiteSettings: [SiteSettingKey, string][] = [
      ['ads_placement', LEGACY_STORAGE_KEYS.ADS_SETTINGS],
      ['ads_format', LEGACY_STORAGE_KEYS.ADS_FORMAT_SETTINGS]
    ];
    for (const [key, legacyKey] of legacySiteSettings) {
      const value = getStored<unknown>(legacyKey, null);
      if (!value) continue;
      try {
        await saveSiteSetting(key, value);
        result.settings++;
      } catch (err: any) {
        result.errors.push(`Configurações de publicidade: ${err?.message || err}`);
      }
    }

    if (result.errors.length === 0 && typeof window !== 'undefined') {
      Object.values(LEGACY_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }

    safeDispatchEvent(new CustomEvent('folha_ads_updated', { detail: {} }));
    return result;
  }
};
