import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Article, AdItem, AdPlacement, AdStatus, PlacementSetting, PlacementMode, UserProfile, UserRole, UserStatus, UserAuditLog, Comment, NewsletterSubscriber, NotificationItem,
  ClassifiedItem, ClassifiedCategory, ClassifiedReport, ClassifiedsSettings,
  ClassifiedSection, ClassifiedType, ClassifiedStatus, PortalSettings
} from '../types/database';
import { INITIAL_ARTICLES, INITIAL_ADS } from '../data/initialData';
import { 
  INITIAL_CLASSIFIEDS, INITIAL_CLASSIFIED_CATEGORIES, DEFAULT_CLASSIFIEDS_SETTINGS 
} from '../data/initialClassifieds';
import { emailService, checkEmailRateLimit } from './emailService';
import { authSecurityService } from './authSecurityService';

// Configurações lidas do ambiente ou do localStorage (para configuração em tempo de execução)
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('folha_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('folha_supabase_anon_key') : null;

const SUPABASE_URL = storedUrl || envUrl;
const SUPABASE_KEY = storedKey || envKey;

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

// Instância do Supabase oficial
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ==========================================
// CAMADA DE PERSISTÊNCIA LOCAL (LOCAL STORAGE)
// Garante funcionamento completo mesmo antes de conectar as chaves
// ==========================================
const STORAGE_KEYS = {
  ARTICLES: 'folha_articles_v1',
  ADS: 'folha_ads_v1',
  USERS: 'folha_users_v1',
  CURRENT_USER: 'folha_current_user_v1',
  COMMENTS: 'folha_comments_v1',
  SUBSCRIBERS: 'folha_subscribers_v1',
  NOTIFICATIONS: 'folha_notifications_v1',
  CLASSIFIEDS: 'folha_classifieds_v1',
  CLASSIFIED_CATEGORIES: 'folha_classified_cats_v1',
  CLASSIFIED_REPORTS: 'folha_classified_reports_v1',
  CLASSIFIED_SETTINGS: 'folha_classified_settings_v1',
  USER_AUDIT_LOGS: 'folha_user_audit_logs_v1',
  PORTAL_SETTINGS: 'folha_portal_settings_v1',
  ADS_SETTINGS: 'folha_ads_settings_v1'
};

const getStored = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Erro ao ler do localStorage', e);
    return defaultValue;
  }
};

const setStored = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Erro ao salvar no localStorage', e);
  }
};

// Usuários demo pré-cadastrados para o modo local
const INITIAL_DEMO_USERS: (UserProfile & { passwordHash: string })[] = [
  {
    id: 'user-admin-1',
    email: 'tomsilvaconsignado@gmail.com',
    fullName: 'Administrador Tom Silva',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    interests: ['Política', 'Cidades', 'Eventos', 'Brasil'],
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    passwordHash: 'Folha@1234',
    emailConfirmed: true,
    emailConfirmedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99977-6199',
    city: 'Estância',
    state: 'SE',
    cpf: '123.456.789-00',
    isLegalAge: true,
    termsAccepted: true,
    termsAcceptedAt: '2026-01-01T00:00:00.000Z',
    termsVersion: 'v2.1'
  },
  {
    id: 'user-reader-1',
    email: 'leitor@folhadaregiao.com.br',
    fullName: 'Carlos Santana',
    role: 'reader',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    interests: ['Política', 'Cidades', 'Esporte'],
    createdAt: new Date('2026-01-15T10:30:00.000Z').toISOString(),
    passwordHash: 'leitor123',
    emailConfirmed: true,
    emailConfirmedAt: '2026-01-15T10:35:00.000Z',
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99881-2233',
    city: 'Aracaju',
    state: 'SE',
    cpf: '234.567.890-11',
    isLegalAge: true,
    termsAccepted: true,
    termsAcceptedAt: '2026-01-15T10:30:00.000Z',
    termsVersion: 'v2.1'
  },
  {
    id: 'user-pj-1',
    email: 'comercial@imobiliariasergipana.com.br',
    fullName: 'Imobiliária Sergipana Ltda',
    role: 'reader',
    avatarUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&h=100&fit=crop',
    interests: ['Cidades', 'Brasil'],
    createdAt: new Date('2026-02-01T14:20:00.000Z').toISOString(),
    passwordHash: 'imob2026',
    emailConfirmed: true,
    emailConfirmedAt: '2026-02-01T14:25:00.000Z',
    status: 'active',
    accountType: 'pj',
    phone: '(79) 98765-4321',
    city: 'Estância',
    state: 'SE',
    companyName: 'Imobiliária Sergipana Ltda',
    tradeName: 'Sergipe Imóveis & Terrenos',
    cnpj: '12.345.678/0001-90',
    legalRepresentative: 'Roberto Almeida Santos',
    representativeCpf: '345.678.901-22',
    termsAccepted: true,
    termsAcceptedAt: '2026-02-01T14:20:00.000Z',
    termsVersion: 'v2.1'
  },
  {
    id: 'user-pending-1',
    email: 'marina.novaes@gmail.com',
    fullName: 'Marina Novaes',
    role: 'reader',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    interests: ['Eventos', 'Cidades'],
    createdAt: new Date('2026-03-10T09:15:00.000Z').toISOString(),
    passwordHash: 'marina2026',
    emailConfirmed: false,
    status: 'active',
    accountType: 'pf',
    phone: '(79) 99112-3344',
    city: 'Itabaiana',
    state: 'SE',
    cpf: '456.789.012-33',
    isLegalAge: true,
    termsAccepted: true,
    termsAcceptedAt: '2026-03-10T09:15:00.000Z',
    termsVersion: 'v2.1'
  }
];

// Inicialização segura
if (typeof window !== 'undefined') {
  if (!localStorage.getItem(STORAGE_KEYS.ARTICLES)) {
    setStored(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ADS)) {
    setStored(STORAGE_KEYS.ADS, INITIAL_ADS);
  }
  // Inicializa ou atualiza o usuário admin nas credenciais solicitadas
  const existingUsers = getStored<(UserProfile & { passwordHash: string })[]>(STORAGE_KEYS.USERS, []);
  if (!existingUsers || existingUsers.length === 0) {
    setStored(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
  } else {
    // Garante que o administrador tomsilvaconsignado@gmail.com com Folha@1234 esteja presente e confirmado
    const adminIndex = existingUsers.findIndex(u => 
      u.email.toLowerCase() === 'tomsilvaconsignado@gmail.com' || 
      u.email.toLowerCase() === 'admin@folhadaregiao.com.br' ||
      u.id === 'user-admin-1'
    );
    if (adminIndex >= 0) {
      existingUsers[adminIndex] = {
        ...existingUsers[adminIndex],
        id: 'user-admin-1',
        email: 'tomsilvaconsignado@gmail.com',
        fullName: existingUsers[adminIndex].fullName === 'Editor Chefe' ? 'Administrador Tom Silva' : existingUsers[adminIndex].fullName,
        role: 'admin',
        passwordHash: 'Folha@1234',
        emailConfirmed: true,
        emailConfirmedAt: existingUsers[adminIndex].emailConfirmedAt || '2026-01-01T00:00:00.000Z'
      };
    } else {
      existingUsers.unshift(INITIAL_DEMO_USERS[0]);
    }
    setStored(STORAGE_KEYS.USERS, existingUsers);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLASSIFIEDS)) {
    setStored(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLASSIFIED_CATEGORIES)) {
    setStored(STORAGE_KEYS.CLASSIFIED_CATEGORIES, INITIAL_CLASSIFIED_CATEGORIES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLASSIFIED_SETTINGS)) {
    setStored(STORAGE_KEYS.CLASSIFIED_SETTINGS, DEFAULT_CLASSIFIEDS_SETTINGS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLASSIFIED_REPORTS)) {
    setStored(STORAGE_KEYS.CLASSIFIED_REPORTS, []);
  }
}

// ==========================================
// SERVIÇO DE AUTENTICAÇÃO
// ==========================================
export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

export const authService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;
        
        // Busca perfil estendido
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          return {
            id: profile.id,
            email: profile.email || session.user.email || '',
            fullName: profile.full_name || 'Usuário',
            role: profile.role || 'reader',
            avatarUrl: profile.avatar_url,
            interests: profile.interests || ['Política', 'Cidades'],
            createdAt: profile.created_at || session.user.created_at
          };
        }

        return {
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || 'Usuário',
          role: (session.user.user_metadata?.role as any) || 'reader',
          avatarUrl: session.user.user_metadata?.avatar_url,
          interests: session.user.user_metadata?.interests || ['Política', 'Cidades'],
          createdAt: session.user.created_at
        };
      } catch (err) {
        console.warn('Erro ao checar sessão Supabase, utilizando fallback local', err);
      }
    }

    return getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  async signUp(
    email: string, 
    password: string, 
    fullName: string, 
    role: 'admin' | 'editor' | 'reader' = 'reader',
    additionalData?: Partial<UserProfile>
  ): Promise<AuthResponse> {
    const defaultInterests = ['Política', 'Cidades'];
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              interests: defaultInterests,
              ...additionalData
            }
          }
        });

        if (error) {
          return { user: null, error: error.message };
        }

        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName,
            role,
            interests: defaultInterests,
            createdAt: new Date().toISOString(),
            status: 'active',
            ...additionalData
          };

          // Tenta salvar profile
          await supabase.from('profiles').upsert([
            {
              id: profile.id,
              email: profile.email,
              full_name: profile.fullName,
              role: profile.role,
              interests: profile.interests,
              created_at: profile.createdAt,
              account_type: profile.accountType,
              phone: profile.phone,
              city: profile.city,
              state: profile.state,
              cpf: profile.cpf,
              cnpj: profile.cnpj
            }
          ]);

          return { user: profile, error: null };
        }
      } catch (err: any) {
        return { user: null, error: err.message || 'Falha no cadastro' };
      }
    }

    // Modo local / Fallback
    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      return { user: null, error: 'Já existe uma conta com este e-mail.' };
    }

    const isConfirmed = role === 'admin';
    const newUser: UserProfile & { passwordHash: string } = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      interests: defaultInterests,
      createdAt: new Date().toISOString(),
      passwordHash: password,
      status: 'active',
      emailConfirmed: isConfirmed,
      emailConfirmedAt: isConfirmed ? new Date().toISOString() : undefined,
      ...additionalData
    };

    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);

    const safeProfile: UserProfile = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl,
      interests: newUser.interests,
      createdAt: newUser.createdAt,
      accountType: newUser.accountType,
      phone: newUser.phone,
      city: newUser.city,
      state: newUser.state,
      cpf: newUser.cpf,
      isLegalAge: newUser.isLegalAge,
      companyName: newUser.companyName,
      tradeName: newUser.tradeName,
      cnpj: newUser.cnpj,
      legalRepresentative: newUser.legalRepresentative,
      representativeCpf: newUser.representativeCpf,
      termsAccepted: newUser.termsAccepted,
      termsAcceptedAt: newUser.termsAcceptedAt,
      termsVersion: newUser.termsVersion,
      status: newUser.status || 'active',
      emailConfirmed: newUser.emailConfirmed,
      emailConfirmedAt: newUser.emailConfirmedAt
    };

    // Gera token e envia e-mail de confirmação automaticamente caso não seja admin
    if (!isConfirmed) {
      try {
        const securityToken = authSecurityService.createToken(newUser.id, newUser.email, 'email_confirmation');
        await emailService.sendEmailConfirmation(safeProfile, securityToken.token);
      } catch (e) {
        console.error('Erro ao gerar token/enviar e-mail de confirmação:', e);
      }
    }

    setStored(STORAGE_KEYS.CURRENT_USER, safeProfile);
    window.dispatchEvent(new Event('folha_auth_changed'));

    return { user: safeProfile, error: null };
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return { user: null, error: error.message };
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: profile?.full_name || data.user.user_metadata?.full_name || 'Usuário',
            role: profile?.role || data.user.user_metadata?.role || 'reader',
            avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url,
            interests: profile?.interests || data.user.user_metadata?.interests || ['Política', 'Cidades'],
            createdAt: data.user.created_at,
            emailConfirmed: true,
            emailConfirmedAt: data.user.created_at
          };

          return { user: userProfile, error: null };
        }
      } catch (err: any) {
        return { user: null, error: err.message || 'Erro ao conectar com o Supabase' };
      }
    }

    // Modo local / Fallback
    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const found = users.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === password
    );

    if (!found) {
      return { user: null, error: 'E-mail ou senha incorretos.' };
    }

    if (found.status === 'suspended') {
      return { user: null, error: 'Esta conta está temporariamente suspensa por moderação da administração.' };
    }

    const safeProfile: UserProfile = {
      id: found.id,
      email: found.email,
      fullName: found.fullName,
      role: found.role,
      avatarUrl: found.avatarUrl,
      interests: found.interests || ['Política', 'Cidades'],
      createdAt: found.createdAt,
      accountType: found.accountType || 'pf',
      phone: found.phone,
      city: found.city,
      state: found.state,
      cpf: found.cpf,
      isLegalAge: found.isLegalAge,
      companyName: found.companyName,
      tradeName: found.tradeName,
      cnpj: found.cnpj,
      legalRepresentative: found.legalRepresentative,
      representativeCpf: found.representativeCpf,
      termsAccepted: found.termsAccepted,
      termsAcceptedAt: found.termsAcceptedAt,
      termsVersion: found.termsVersion,
      status: found.status || 'active',
      emailConfirmed: found.emailConfirmed ?? (found.role === 'admin'),
      emailConfirmedAt: found.emailConfirmedAt
    };

    setStored(STORAGE_KEYS.CURRENT_USER, safeProfile);
    window.dispatchEvent(new Event('folha_auth_changed'));

    return { user: safeProfile, error: null };
  },

  async signInAdmin(email: string, password: string): Promise<AuthResponse> {
    const res = await this.signIn(email, password);
    if (res.error) {
      return res;
    }
    if (!res.user) {
      return { user: null, error: 'Credenciais inválidas.' };
    }
    // Verificação estrita de permissão administrativa
    if (res.user.role !== 'admin' && res.user.role !== 'editor') {
      // Faz logout preventivo pois o usuário tentou acessar um painel não autorizado
      await this.signOut();
      return { 
        user: null, 
        error: 'Acesso negado. Esta credencial não possui privilégios de administração ou edição no portal.' 
      };
    }
    return res;
  },

  async updateInterests(userId: string, newInterests: string[]): Promise<UserProfile | null> {
    const currentUser = getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!currentUser) return null;

    const updatedUser: UserProfile = {
      ...currentUser,
      interests: newInterests
    };

    setStored(STORAGE_KEYS.CURRENT_USER, updatedUser);

    // Atualiza também na lista de usuários
    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const uIndex = users.findIndex(u => u.id === userId);
    if (uIndex !== -1) {
      users[uIndex] = { ...users[uIndex], interests: newInterests };
      setStored(STORAGE_KEYS.USERS, users);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('profiles').update({ interests: newInterests }).eq('id', userId);
      } catch (e) {
        console.warn('Erro ao atualizar interesses no Supabase', e);
      }
    }

    window.dispatchEvent(new Event('folha_auth_changed'));
    window.dispatchEvent(new Event('folha_interests_changed'));
    return updatedUser;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Erro ao deslogar do Supabase', e);
      }
    }

    setStored(STORAGE_KEYS.CURRENT_USER, null);
    window.dispatchEvent(new Event('folha_auth_changed'));
  },

  // 1. CONFIRMAÇÃO DE E-MAIL VIA TOKEN SEGURO
  async confirmEmail(tokenString: string): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const verification = authSecurityService.verifyToken(tokenString, 'email_confirmation');
    if (!verification.valid || !verification.token) {
      return { success: false, message: verification.message };
    }

    const token = verification.token;
    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const userIndex = users.findIndex(u => u.id === token.userId || u.email.toLowerCase() === token.email.toLowerCase());

    if (userIndex === -1) {
      return { success: false, message: 'Conta de usuário correspondente ao token não foi encontrada.' };
    }

    // Atualiza o estado da conta para confirmada
    const nowIso = new Date().toISOString();
    users[userIndex].emailConfirmed = true;
    users[userIndex].emailConfirmedAt = nowIso;
    setStored(STORAGE_KEYS.USERS, users);

    // Invalida o token para impedir reutilização
    authSecurityService.consumeToken(tokenString);

    // Se o usuário logado atualmente for este mesmo usuário, sincroniza a sessão
    const currentUser = getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && (currentUser.id === token.userId || currentUser.email.toLowerCase() === token.email.toLowerCase())) {
      const updatedCurrent: UserProfile = {
        ...currentUser,
        emailConfirmed: true,
        emailConfirmedAt: nowIso
      };
      setStored(STORAGE_KEYS.CURRENT_USER, updatedCurrent);
    }

    window.dispatchEvent(new Event('folha_auth_changed'));

    return { 
      success: true, 
      message: 'Seu endereço de e-mail foi confirmado com sucesso! Sua conta está 100% ativada.',
      user: users[userIndex]
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

    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const found = users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (found && !found.emailConfirmed) {
      try {
        const securityToken = authSecurityService.createToken(found.id, found.email, 'email_confirmation');
        await emailService.sendResendConfirmation(found, securityToken.token);
      } catch (err) {
        console.error('Erro ao reenviar e-mail de confirmação:', err);
      }
    }

    // Mensagem neutra para proteção de privacidade
    return {
      success: true,
      message: 'Se existir uma conta cadastrada com este endereço com confirmação pendente, enviamos um novo link de confirmação para sua caixa de entrada.'
    };
  },

  // 3. SOLICITAÇÃO DE RECUPERAÇÃO DE SENHA (ESQUECI MINHA SENHA)
  async resetPassword(email: string): Promise<{ success: boolean; message: string; remainingSeconds?: number }> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, message: 'Informe um e-mail válido.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: window.location.origin
        });
        if (error) return { success: false, message: error.message };
        return { 
          success: true, 
          message: 'Se existir uma conta associada a esse endereço, você receberá um e-mail com as instruções para redefinir sua senha.' 
        };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    }

    const rateCheck = checkEmailRateLimit(trimmedEmail, 'password_reset', 60);
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        message: `Aguarde ${rateCheck.remainingSeconds} segundos para solicitar outro link de recuperação de senha.`,
        remainingSeconds: rateCheck.remainingSeconds
      };
    }

    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const found = users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (found) {
      try {
        const securityToken = authSecurityService.createToken(found.id, found.email, 'password_reset');
        await emailService.sendPasswordReset(found, securityToken.token);
      } catch (err) {
        console.error('Erro ao gerar token/enviar e-mail de recuperação:', err);
      }
    }

    // Mensagem neutra de segurança conforme exigência
    return {
      success: true,
      message: 'Se existir uma conta associada a esse endereço, você receberá um e-mail com as instruções para redefinir sua senha.'
    };
  },

  // 4. VERIFICAÇÃO DO TOKEN DE REDEFINIÇÃO DE SENHA
  verifyResetToken(tokenString: string): { valid: boolean; message: string; email?: string } {
    const verification = authSecurityService.verifyToken(tokenString, 'password_reset');
    return {
      valid: verification.valid,
      message: verification.message,
      email: verification.token?.email
    };
  },

  // 5. CONCLUSÃO DA REDEFINIÇÃO COM ATUALIZAÇÃO SEGURA DA SENHA
  async completePasswordReset(tokenString: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    const verification = authSecurityService.verifyToken(tokenString, 'password_reset');
    if (!verification.valid || !verification.token) {
      return { success: false, message: verification.message };
    }

    const token = verification.token;
    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const userIndex = users.findIndex(u => u.id === token.userId || u.email.toLowerCase() === token.email.toLowerCase());

    if (userIndex === -1) {
      return { success: false, message: 'Usuário não encontrado para atualizar a senha.' };
    }

    // Atualiza a senha no registro do usuário
    users[userIndex].passwordHash = newPassword;
    // Opcionalmente confirma o e-mail também caso estivesse pendente
    users[userIndex].emailConfirmed = true;
    if (!users[userIndex].emailConfirmedAt) {
      users[userIndex].emailConfirmedAt = new Date().toISOString();
    }
    setStored(STORAGE_KEYS.USERS, users);

    // Consome e invalida o token para uso único
    authSecurityService.consumeToken(tokenString);

    // Envia e-mail de notificação de segurança de senha alterada
    try {
      await emailService.sendPasswordChangedNotification(users[userIndex]);
    } catch (e) {
      console.warn('Erro ao disparar aviso de senha alterada:', e);
    }

    // Invalida sessão ativa por segurança para exigir novo login
    setStored(STORAGE_KEYS.CURRENT_USER, null);
    window.dispatchEvent(new Event('folha_auth_changed'));

    return {
      success: true,
      message: 'Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.'
    };
  }
};

// ==========================================
// SERVIÇO DE NOTÍCIAS & ARTIGOS
// ==========================================
export const newsService = {
  async getArticles(): Promise<Article[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            slug: item.slug,
            content: item.content,
            category: item.category,
            imageUrl: item.image_url,
            videoUrl: item.video_url,
            isVideo: item.is_video,
            isHero: item.is_hero,
            isSecondary: item.is_secondary,
            viewsCount: item.views_count || 0,
            author: item.author || 'Folha da Região',
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            status: item.status || 'published'
          }));
        }
      } catch (err) {
        console.warn('Erro buscando no Supabase, usando dados locais', err);
      }
    }

    const localArticles = getStored<Article[]>(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
    const resolved = localArticles.map(a => ({
      ...a,
      status: a.status || 'published'
    }));

    // Sincroniza em segundo plano com o servidor SSR para metadados Open Graph
    if (typeof fetch !== 'undefined') {
      fetch('/api/sync-all-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolved)
      }).catch(() => {});
    }

    return resolved;
  },

  async getArticleBySlug(slug: string): Promise<Article | null> {
    const articles = await this.getArticles();
    return articles.find(a => a.slug === slug) || null;
  },

  async saveArticle(article: Omit<Article, 'id' | 'createdAt' | 'viewsCount'> & { id?: string }): Promise<Article> {
    const articles = getStored<Article[]>(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);

    if (article.id) {
      // Atualizar existente
      const index = articles.findIndex(a => a.id === article.id);
      if (index !== -1) {
        const updated: Article = {
          ...articles[index],
          ...article,
          status: article.status || articles[index].status || 'published',
          updatedAt: new Date().toISOString()
        };
        articles[index] = updated;
        setStored(STORAGE_KEYS.ARTICLES, articles);

        // Se Supabase conectado, sincroniza
        if (isSupabaseConfigured() && supabase) {
          await supabase.from('articles').update({
            title: updated.title,
            subtitle: updated.subtitle,
            slug: updated.slug,
            content: updated.content,
            category: updated.category,
            image_url: updated.imageUrl,
            video_url: updated.videoUrl,
            is_video: updated.isVideo,
            is_hero: updated.isHero,
            is_secondary: updated.isSecondary,
            author: updated.author,
            updated_at: updated.updatedAt
          }).eq('id', updated.id);
        }

        // Sincroniza com o servidor para OpenGraph instantâneo
        if (typeof fetch !== 'undefined') {
          fetch('/api/sync-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).catch(() => {});
        }

        return updated;
      }
    }

    // Criar novo
    const newArticle: Article = {
      id: 'art-' + Math.random().toString(36).substring(2, 9),
      title: article.title,
      subtitle: article.subtitle,
      slug: article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: article.content,
      category: article.category,
      imageUrl: article.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&h=600&fit=crop',
      videoUrl: article.videoUrl,
      isVideo: Boolean(article.isVideo || article.videoUrl),
      isHero: Boolean(article.isHero),
      isSecondary: Boolean(article.isSecondary),
      viewsCount: 1,
      author: article.author || 'Redação Folha da Região',
      createdAt: new Date().toISOString(),
      status: article.status || 'published'
    };

    // Se marcado como hero, desmarca os anteriores
    if (newArticle.isHero) {
      articles.forEach(a => { a.isHero = false; });
    }

    articles.unshift(newArticle);
    setStored(STORAGE_KEYS.ARTICLES, articles);

    // Dispara notificações automáticas para usuários com interesse na categoria
    notificationsService.notifyUsersForArticle(newArticle).catch(console.error);

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('articles').insert([{
        id: newArticle.id,
        title: newArticle.title,
        subtitle: newArticle.subtitle,
        slug: newArticle.slug,
        content: newArticle.content,
        category: newArticle.category,
        image_url: newArticle.imageUrl,
        video_url: newArticle.videoUrl,
        is_video: newArticle.isVideo,
        is_hero: newArticle.isHero,
        is_secondary: newArticle.isSecondary,
        views_count: 1,
        author: newArticle.author,
        created_at: newArticle.createdAt
      }]);
    }

    // Sincroniza com o servidor para OpenGraph instantâneo
    if (typeof fetch !== 'undefined') {
      fetch('/api/sync-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArticle)
      }).catch(() => {});
    }

    return newArticle;
  },

  async deleteArticle(id: string): Promise<void> {
    const articles = getStored<Article[]>(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
    const filtered = articles.filter(a => a.id !== id);
    setStored(STORAGE_KEYS.ARTICLES, filtered);

    if (typeof fetch !== 'undefined') {
      fetch(`/api/sync-article/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('articles').delete().eq('id', id);
    }
  },

  async incrementViews(id: string): Promise<number> {
    const articles = getStored<Article[]>(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
    const target = articles.find(a => a.id === id);
    if (target) {
      target.viewsCount = (target.viewsCount || 0) + 1;
      setStored(STORAGE_KEYS.ARTICLES, articles);

      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.rpc('increment_article_views', { article_id: id });
          if (error) {
            await supabase.from('articles').update({ views_count: target.viewsCount }).eq('id', id);
          }
        } catch {
          // fallback silencioso
        }
      }
      return target.viewsCount;
    }
    return 1;
  }
};

// ==========================================
// SERVIÇO DE PUBLICIDADE E CARROSSEL POR ESPAÇO
// ==========================================
export const DEFAULT_PLACEMENT_SETTINGS: Record<AdPlacement, PlacementSetting> = {
  header: { placement: 'header', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5 },
  feed: { placement: 'feed', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5 },
  sidebar: { placement: 'sidebar', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5 },
  article: { placement: 'article', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5 },
  footer: { placement: 'footer', mode: 'carousel', isPaused: false, defaultDurationSeconds: 5 }
};

export const adsService = {
  // Retorna configurações de modo (fixo vs carrossel) e status para os 5 espaços
  getPlacementSettings(): Record<AdPlacement, PlacementSetting> {
    const stored = getStored<Partial<Record<AdPlacement, PlacementSetting>>>(
      STORAGE_KEYS.ADS_SETTINGS, 
      {}
    );
    return {
      header: { ...DEFAULT_PLACEMENT_SETTINGS.header, ...(stored.header || {}) },
      feed: { ...DEFAULT_PLACEMENT_SETTINGS.feed, ...(stored.feed || {}) },
      sidebar: { ...DEFAULT_PLACEMENT_SETTINGS.sidebar, ...(stored.sidebar || {}) },
      article: { ...DEFAULT_PLACEMENT_SETTINGS.article, ...(stored.article || {}) },
      footer: { ...DEFAULT_PLACEMENT_SETTINGS.footer, ...(stored.footer || {}) }
    };
  },

  async savePlacementSetting(placement: AdPlacement, update: Partial<PlacementSetting>): Promise<PlacementSetting> {
    const current = this.getPlacementSettings();
    const updated: PlacementSetting = {
      ...current[placement],
      ...update,
      placement
    };
    const newSettings = {
      ...current,
      [placement]: updated
    };
    setStored(STORAGE_KEYS.ADS_SETTINGS, newSettings);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('folha_ads_updated', { detail: { placement } }));
    }
    return updated;
  },

  async getAds(): Promise<AdItem[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            sponsorName: item.sponsor_name,
            linkUrl: item.link_url,
            mediaUrl: item.media_url,
            mediaType: item.media_type,
            placement: item.placement,
            aspectRatio: item.aspect_ratio || '1 / 1',
            maxWidth: item.max_width,
            active: item.active,
            status: item.status || 'active',
            startDate: item.start_date,
            endDate: item.end_date,
            createdAt: item.created_at,
            altText: item.alt_text || item.title,
            displayOrder: item.display_order || 1,
            durationSeconds: item.duration_seconds || 5,
            openInNewTab: item.open_in_new_tab ?? true,
            campaignId: item.campaign_id,
            campaignName: item.campaign_name,
            impressionsCount: item.impressions_count || 0,
            clicksCount: item.clicks_count || 0
          }));
        }
      } catch (err) {
        console.warn('Erro ao carregar anúncios do Supabase, utilizando armazenamento local', err);
      }
    }

    const rawAds = getStored<AdItem[]>(STORAGE_KEYS.ADS, INITIAL_ADS);
    // Normaliza dados para garantir campos de carrossel em anúncios legados
    return rawAds.map(ad => ({
      ...ad,
      status: ad.status || (ad.active ? 'active' : 'paused'),
      durationSeconds: ad.durationSeconds || 5,
      displayOrder: ad.displayOrder || 1,
      openInNewTab: ad.openInNewTab ?? true,
      altText: ad.altText || ad.title,
      impressionsCount: ad.impressionsCount || 0,
      clicksCount: ad.clicksCount || 0
    }));
  },

  async getAllAds(): Promise<AdItem[]> {
    return this.getAds();
  },

  // Retorna os anúncios de um espaço específico ordenados pela ordem de exibição
  async getAdsByPlacement(placement: AdPlacement): Promise<AdItem[]> {
    const all = await this.getAds();
    return all
      .filter(a => a.placement === placement)
      .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
  },

  async saveAd(ad: Omit<AdItem, 'id' | 'createdAt'> & { id?: string }): Promise<AdItem> {
    const ads = await this.getAds();

    if (ad.id) {
      // Edição de anúncio existente
      const index = ads.findIndex(a => a.id === ad.id);
      if (index !== -1) {
        const oldAd = ads[index];
        // Se mudou de placement, verifica limite de 3 no novo placement
        if (oldAd.placement !== ad.placement) {
          const adsInNewPlacement = ads.filter(a => a.placement === ad.placement && a.id !== ad.id);
          if (adsInNewPlacement.length >= 3) {
            throw new Error(`O limite máximo de 3 anúncios para o espaço ${ad.placement} já foi atingido. Edite ou remova um anúncio existente antes de transferir outro.`);
          }
        }
        ads[index] = {
          ...oldAd,
          ...ad,
          displayOrder: ad.displayOrder || oldAd.displayOrder || 1,
          durationSeconds: Math.max(2, Math.min(60, Number(ad.durationSeconds) || 5)),
          openInNewTab: ad.openInNewTab ?? true,
          altText: ad.altText || ad.title
        };
        setStored(STORAGE_KEYS.ADS, ads);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('folha_ads_updated', { detail: { placement: ad.placement } }));
        }
        return ads[index];
      }
    }

    // Criação de novo anúncio: REGRA OBRIGATÓRIA - LIMITE DE ATÉ 3 ANÚNCIOS POR ESPAÇO
    const adsInPlacement = ads.filter(a => a.placement === ad.placement);
    if (adsInPlacement.length >= 3) {
      throw new Error(`Limite de 3 anúncios atingido para este espaço (${ad.placement}). Para adicionar um novo patrocinador, edite ou exclua um dos anúncios existentes.`);
    }

    const nextOrder = adsInPlacement.length + 1;
    const newAd: AdItem = {
      id: 'ad-' + Math.random().toString(36).substring(2, 9),
      ...ad,
      displayOrder: ad.displayOrder || nextOrder,
      durationSeconds: Math.max(2, Math.min(60, Number(ad.durationSeconds) || 5)),
      openInNewTab: ad.openInNewTab ?? true,
      altText: ad.altText || ad.title,
      impressionsCount: 0,
      clicksCount: 0,
      createdAt: new Date().toISOString()
    };

    ads.push(newAd);
    setStored(STORAGE_KEYS.ADS, ads);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('folha_ads_updated', { detail: { placement: ad.placement } }));
    }
    return newAd;
  },

  async deleteAd(id: string): Promise<void> {
    const ads = await this.getAds();
    const targetAd = ads.find(a => a.id === id);
    const filtered = ads.filter(a => a.id !== id);
    
    // Reajusta ordens (1, 2) dos que sobraram no mesmo espaço
    if (targetAd) {
      let orderIndex = 1;
      filtered
        .filter(a => a.placement === targetAd.placement)
        .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1))
        .forEach(a => {
          a.displayOrder = orderIndex++;
        });
    }

    setStored(STORAGE_KEYS.ADS, filtered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('folha_ads_updated', { detail: { placement: targetAd?.placement } }));
    }
  },

  // Altera a ordem de exibição dos slides (1, 2 ou 3) de um espaço
  async reorderAds(placement: AdPlacement, orderedIds: string[]): Promise<void> {
    const ads = await this.getAds();
    orderedIds.forEach((id, index) => {
      const found = ads.find(a => a.id === id && a.placement === placement);
      if (found) {
        found.displayOrder = index + 1;
      }
    });
    setStored(STORAGE_KEYS.ADS, ads);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('folha_ads_updated', { detail: { placement } }));
    }
  },

  // Registra impressão confiável (quando o slide é ativado na tela)
  recordImpression(adId: string): void {
    if (!adId || typeof window === 'undefined') return;
    try {
      const ads = getStored<AdItem[]>(STORAGE_KEYS.ADS, INITIAL_ADS);
      const ad = ads.find(a => a.id === adId);
      if (ad) {
        ad.impressionsCount = (ad.impressionsCount || 0) + 1;
        setStored(STORAGE_KEYS.ADS, ads);
      }
    } catch {
      // Não interrompe a navegação
    }
  },

  // Registra clique no banner
  recordClick(adId: string): void {
    if (!adId || typeof window === 'undefined') return;
    try {
      const ads = getStored<AdItem[]>(STORAGE_KEYS.ADS, INITIAL_ADS);
      const ad = ads.find(a => a.id === adId);
      if (ad) {
        ad.clicksCount = (ad.clicksCount || 0) + 1;
        setStored(STORAGE_KEYS.ADS, ads);
      }
    } catch {
      // Não interrompe a navegação
    }
  }
};

// ==========================================
// SERVIÇO DE GERENCIAMENTO E MODERAÇÃO DE USUÁRIOS
// ==========================================
export const usersService = {
  async getAllUsers(adminUser?: UserProfile): Promise<UserProfile[]> {
    // Verificação de permissão: somente administradores autorizados
    if (adminUser && adminUser.role !== 'admin' && adminUser.role !== 'editor') {
      throw new Error('Acesso restrito. Apenas administradores autorizados podem consultar os usuários do portal.');
    }

    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    return users.map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role || 'reader',
      avatarUrl: u.avatarUrl,
      interests: u.interests || ['Política', 'Cidades'],
      createdAt: u.createdAt || new Date().toISOString(),
      accountType: u.accountType || 'pf',
      phone: u.phone || '',
      city: u.city || '',
      state: u.state || '',
      cpf: u.cpf,
      isLegalAge: u.isLegalAge,
      companyName: u.companyName,
      tradeName: u.tradeName,
      cnpj: u.cnpj,
      legalRepresentative: u.legalRepresentative,
      representativeCpf: u.representativeCpf,
      termsAccepted: u.termsAccepted,
      termsAcceptedAt: u.termsAcceptedAt,
      termsVersion: u.termsVersion,
      status: (u.status || 'active') as UserStatus,
      moderationReason: u.moderationReason,
      moderationAt: u.moderationAt,
      moderatedBy: u.moderatedBy,
      emailConfirmed: u.emailConfirmed ?? (u.role === 'admin'),
      emailConfirmedAt: u.emailConfirmedAt
    }));
  },

  async getUserClassifiedsCount(userId: string): Promise<{ total: number; published: number; pending: number; rejected: number }> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const userItems = items.filter(i => i.userId === userId);
    return {
      total: userItems.length,
      published: userItems.filter(i => i.status === 'published').length,
      pending: userItems.filter(i => i.status === 'pending').length,
      rejected: userItems.filter(i => i.status === 'rejected').length
    };
  },

  async getUserReports(userId: string): Promise<ClassifiedReport[]> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const userClassifiedIds = new Set(items.filter(i => i.userId === userId).map(i => i.id));
    const allReports = getStored<ClassifiedReport[]>(STORAGE_KEYS.CLASSIFIED_REPORTS, []);
    return allReports.filter(r => userClassifiedIds.has(r.classifiedId));
  },

  async getAuditLogs(userId?: string): Promise<UserAuditLog[]> {
    const logs = getStored<UserAuditLog[]>(STORAGE_KEYS.USER_AUDIT_LOGS, []);
    if (userId) {
      return logs.filter(l => l.userId === userId);
    }
    return logs;
  },

  async recordAudit(logData: Omit<UserAuditLog, 'id' | 'createdAt'>): Promise<UserAuditLog> {
    const logs = getStored<UserAuditLog[]>(STORAGE_KEYS.USER_AUDIT_LOGS, []);
    const newLog: UserAuditLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      ...logData,
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStored(STORAGE_KEYS.USER_AUDIT_LOGS, logs);
    return newLog;
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

    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const target = users.find(u => u.id === targetUserId);

    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    // Proteção rigorosa: Não permitir bloquear ou suspender a própria conta
    if (target.id === adminUser.id) {
      throw new Error('Você não pode alterar o status ou aplicar restrições à sua própria conta de administrador.');
    }

    // Proteção rigorosa: O administrador principal não pode ser bloqueado
    if (target.email.toLowerCase() === 'tomsilvaconsignado@gmail.com') {
      throw new Error('A conta do administrador principal é protegida pelo sistema e não pode ser suspensa ou bloqueada.');
    }

    const previousStatus = (target.status || 'active') as UserStatus;
    target.status = newStatus;
    target.moderationReason = reason.trim();
    target.moderationAt = new Date().toISOString();
    target.moderatedBy = adminUser.fullName;

    setStored(STORAGE_KEYS.USERS, users);

    // Registra auditoria com segurança
    await this.recordAudit({
      userId: target.id,
      userEmail: target.email,
      userName: target.fullName,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminName: adminUser.fullName,
      action: newStatus === 'active' ? 'reactivate' : newStatus === 'suspended' ? 'suspend' : 'block',
      previousStatus,
      newStatus,
      reason: reason.trim()
    });

    // Se o usuário afetado estiver na sessão local atual de alguém, sincroniza
    const current = getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (current && current.id === targetUserId) {
      current.status = newStatus;
      current.moderationReason = reason.trim();
      setStored(STORAGE_KEYS.CURRENT_USER, current);
      window.dispatchEvent(new Event('folha_auth_changed'));
    }

    return {
      id: target.id,
      email: target.email,
      fullName: target.fullName,
      role: target.role,
      avatarUrl: target.avatarUrl,
      createdAt: target.createdAt,
      accountType: target.accountType,
      phone: target.phone,
      city: target.city,
      state: target.state,
      cpf: target.cpf,
      isLegalAge: target.isLegalAge,
      companyName: target.companyName,
      tradeName: target.tradeName,
      cnpj: target.cnpj,
      legalRepresentative: target.legalRepresentative,
      representativeCpf: target.representativeCpf,
      termsAccepted: target.termsAccepted,
      termsAcceptedAt: target.termsAcceptedAt,
      termsVersion: target.termsVersion,
      status: target.status,
      moderationReason: target.moderationReason,
      moderationAt: target.moderationAt,
      moderatedBy: target.moderatedBy,
      emailConfirmed: target.emailConfirmed,
      emailConfirmedAt: target.emailConfirmedAt
    };
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

    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const target = users.find(u => u.id === targetUserId);

    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    if (target.email.toLowerCase() === 'tomsilvaconsignado@gmail.com' && newRole !== 'admin') {
      throw new Error('Os privilégios da conta do Administrador Geral não podem ser revogados.');
    }

    const oldRole = target.role;
    target.role = newRole;
    setStored(STORAGE_KEYS.USERS, users);

    await this.recordAudit({
      userId: target.id,
      userEmail: target.email,
      userName: target.fullName,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminName: adminUser.fullName,
      action: 'change_role',
      reason: `Alteração de papel de "${oldRole}" para "${newRole}". Motivo: ${reason.trim()}`
    });

    const current = getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (current && current.id === targetUserId) {
      current.role = newRole;
      setStored(STORAGE_KEYS.CURRENT_USER, current);
      window.dispatchEvent(new Event('folha_auth_changed'));
    }
  },

  async adminResendConfirmation(targetUserId: string, adminUser: UserProfile): Promise<{ success: boolean; message: string }> {
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'editor')) {
      throw new Error('Acesso não autorizado.');
    }

    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const target = users.find(u => u.id === targetUserId);

    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    const res = await authService.resendConfirmationEmail(target.email);

    if (res.success) {
      await this.recordAudit({
        userId: target.id,
        userEmail: target.email,
        userName: target.fullName,
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.fullName,
        action: 'resend_confirmation',
        reason: 'Reenvio de link de confirmação solicitado via painel administrativo.'
      });
    }

    return res;
  },

  async adminForceConfirmEmail(targetUserId: string, adminUser: UserProfile): Promise<void> {
    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Apenas o Administrador Geral pode validar manualmente o e-mail de um usuário.');
    }

    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const target = users.find(u => u.id === targetUserId);

    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    target.emailConfirmed = true;
    target.emailConfirmedAt = new Date().toISOString();
    setStored(STORAGE_KEYS.USERS, users);

    await this.recordAudit({
      userId: target.id,
      userEmail: target.email,
      userName: target.fullName,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminName: adminUser.fullName,
      action: 'confirm_email',
      reason: 'Confirmação manual de e-mail realizada pelo administrador após validação direta.'
    });

    const current = getStored<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (current && current.id === targetUserId) {
      current.emailConfirmed = true;
      current.emailConfirmedAt = target.emailConfirmedAt;
      setStored(STORAGE_KEYS.CURRENT_USER, current);
      window.dispatchEvent(new Event('folha_auth_changed'));
    }
  }
};

// ==========================================
// SERVIÇO DE COMENTÁRIOS E NEWSLETTER
// ==========================================
export const commentsService = {
  async getComments(articleId: string): Promise<Comment[]> {
    const all = getStored<Comment[]>(STORAGE_KEYS.COMMENTS, []);
    return all.filter(c => c.articleId === articleId);
  },

  async addComment(articleId: string, content: string, user: UserProfile): Promise<Comment> {
    const comments = getStored<Comment[]>(STORAGE_KEYS.COMMENTS, []);
    const newComment: Comment = {
      id: 'cmt-' + Math.random().toString(36).substring(2, 9),
      articleId,
      userId: user.id,
      userName: user.fullName,
      userAvatar: user.avatarUrl,
      content,
      createdAt: new Date().toISOString()
    };

    comments.unshift(newComment);
    setStored(STORAGE_KEYS.COMMENTS, comments);
    return newComment;
  }
};

export const newsletterService = {
  async subscribe(email: string): Promise<{ success: boolean; message: string }> {
    const subscribers = getStored<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, []);
    const existing = subscribers.find(s => s.email.toLowerCase() === email.trim().toLowerCase());
    
    if (existing) {
      return { success: true, message: 'Você já está cadastrado em nossa lista VIP!' };
    }

    subscribers.push({
      id: 'sub-' + Math.random().toString(36).substring(2, 9),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString()
    });

    setStored(STORAGE_KEYS.SUBSCRIBERS, subscribers);

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('newsletter_subscribers').insert([{ email: email.trim().toLowerCase() }]);
    }

    return { success: true, message: 'Inscrição confirmada com sucesso! Fique atento ao seu e-mail.' };
  },

  async getSubscribers(): Promise<NewsletterSubscriber[]> {
    return getStored<NewsletterSubscriber[]>(STORAGE_KEYS.SUBSCRIBERS, []);
  }
};

// ==========================================
// SERVIÇO DE NOTIFICAÇÕES PARA USUÁRIOS
// ==========================================
export const notificationsService = {
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
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
        }
      } catch (e) {
        console.warn('Erro ao carregar notificações do Supabase', e);
      }
    }

    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return all.filter(n => n.userId === userId);
  },

  async markAsRead(notificationId: string): Promise<void> {
    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const target = all.find(n => n.id === notificationId);
    if (target) {
      target.read = true;
      setStored(STORAGE_KEYS.NOTIFICATIONS, all);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
      } catch (e) {
        console.warn('Erro ao marcar notificação no Supabase', e);
      }
    }

    window.dispatchEvent(new Event('folha_notifications_updated'));
  },

  async markAllAsRead(userId: string): Promise<void> {
    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    all.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    setStored(STORAGE_KEYS.NOTIFICATIONS, all);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
      } catch (e) {
        console.warn('Erro ao marcar todas notificações no Supabase', e);
      }
    }

    window.dispatchEvent(new Event('folha_notifications_updated'));
  },

  async notifyUsersForArticle(article: Article): Promise<void> {
    const users = getStored<any[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const notifications = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const newNotificationsCreated: NotificationItem[] = [];

    for (const user of users) {
      const userInterests = user.interests || ['Política', 'Cidades'];
      // Verifica se o usuário tem interesse nesta categoria (ou 'todos')
      const matchesInterest = userInterests.some((int: string) => 
        int.toLowerCase() === article.category.toLowerCase() ||
        (int.toLowerCase() === 'vídeos' && article.isVideo)
      );

      if (matchesInterest) {
        const notif: NotificationItem = {
          id: 'notif-' + Math.random().toString(36).substring(2, 9),
          userId: user.id,
          articleId: article.id,
          articleSlug: article.slug,
          articleTitle: article.title,
          category: article.category,
          imageUrl: article.imageUrl,
          message: `Nova matéria em ${article.category}: "${article.title}"`,
          createdAt: new Date().toISOString(),
          read: false
        };

        notifications.unshift(notif);
        newNotificationsCreated.push(notif);

        // Se Supabase conectado, salva também lá
        if (isSupabaseConfigured() && supabase) {
          try {
            await supabase.from('notifications').insert([{
              id: notif.id,
              user_id: notif.userId,
              article_id: notif.articleId,
              article_slug: notif.articleSlug,
              article_title: notif.articleTitle,
              category: notif.category,
              image_url: notif.imageUrl,
              message: notif.message,
              created_at: notif.createdAt,
              read: notif.read
            }]);
          } catch {
            // fallback
          }
        }
      }
    }

    if (newNotificationsCreated.length > 0) {
      setStored(STORAGE_KEYS.NOTIFICATIONS, notifications);
      window.dispatchEvent(new CustomEvent('folha_new_notification', { 
        detail: newNotificationsCreated 
      }));
      window.dispatchEvent(new Event('folha_notifications_updated'));
    }
  },

  async seedInitialNotificationsIfEmpty(user: UserProfile, articles: Article[]): Promise<void> {
    const all = getStored<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const userNotifs = all.filter(n => n.userId === user.id);

    // Se ainda não tiver nenhuma notificação para este usuário, gera notificações a partir de notícias recentes das categorias dele
    if (userNotifs.length === 0) {
      const userInterests = user.interests || ['Política', 'Cidades'];
      const matchingArticles = articles.filter(a => 
        userInterests.some(cat => cat.toLowerCase() === a.category.toLowerCase())
      ).slice(0, 3);

      matchingArticles.forEach((art, index) => {
        const notif: NotificationItem = {
          id: 'notif-init-' + user.id + '-' + index,
          userId: user.id,
          articleId: art.id,
          articleSlug: art.slug,
          articleTitle: art.title,
          category: art.category,
          imageUrl: art.imageUrl,
          message: `Destaque em ${art.category}: "${art.title}"`,
          createdAt: new Date(Date.now() - (index + 1) * 3600 * 1000).toISOString(),
          read: index > 1 // a última já lida, as outras não lidas para o usuário ver o badge
        };
        all.unshift(notif);
      });

      setStored(STORAGE_KEYS.NOTIFICATIONS, all);
      window.dispatchEvent(new Event('folha_notifications_updated'));
    }
  }
};

// ==========================================
// SERVIÇO DE CLASSIFICADOS
// ==========================================
export const classifiedsService = {
  // Configurações
  async getSettings(): Promise<ClassifiedsSettings> {
    return getStored<ClassifiedsSettings>(STORAGE_KEYS.CLASSIFIED_SETTINGS, DEFAULT_CLASSIFIEDS_SETTINGS);
  },

  async updateSettings(newSettings: Partial<ClassifiedsSettings>): Promise<ClassifiedsSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    setStored(STORAGE_KEYS.CLASSIFIED_SETTINGS, updated);
    return updated;
  },

  // Categorias
  async getCategories(section?: ClassifiedSection): Promise<ClassifiedCategory[]> {
    const all = getStored<ClassifiedCategory[]>(STORAGE_KEYS.CLASSIFIED_CATEGORIES, INITIAL_CLASSIFIED_CATEGORIES);
    if (section) {
      return all.filter(c => c.section === section);
    }
    return all;
  },

  async saveCategory(category: Omit<ClassifiedCategory, 'id'> & { id?: string }): Promise<ClassifiedCategory> {
    const categories = getStored<ClassifiedCategory[]>(STORAGE_KEYS.CLASSIFIED_CATEGORIES, INITIAL_CLASSIFIED_CATEGORIES);
    if (category.id) {
      const idx = categories.findIndex(c => c.id === category.id);
      if (idx !== -1) {
        categories[idx] = { ...categories[idx], ...category };
        setStored(STORAGE_KEYS.CLASSIFIED_CATEGORIES, categories);
        return categories[idx];
      }
    }
    const newCat: ClassifiedCategory = {
      id: 'cat-clf-' + Math.random().toString(36).substring(2, 9),
      name: category.name,
      section: category.section
    };
    categories.push(newCat);
    setStored(STORAGE_KEYS.CLASSIFIED_CATEGORIES, categories);
    return newCat;
  },

  async deleteCategory(id: string): Promise<void> {
    const categories = getStored<ClassifiedCategory[]>(STORAGE_KEYS.CLASSIFIED_CATEGORIES, INITIAL_CLASSIFIED_CATEGORIES);
    setStored(STORAGE_KEYS.CLASSIFIED_CATEGORIES, categories.filter(c => c.id !== id));
  },

  // Consulta de Anúncios com Checagem de Expiração
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
    let items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const now = new Date();
    let hasUpdates = false;

    // Verificar e atualizar automaticamente expirados
    items = items.map(item => {
      if (item.status === 'published' && new Date(item.expiresAt) < now) {
        hasUpdates = true;
        return { ...item, status: 'expired' as ClassifiedStatus };
      }
      return item;
    });

    if (hasUpdates) {
      setStored(STORAGE_KEYS.CLASSIFIEDS, items);
    }

    // Filtrar por status (por padrão, apenas publicados para o público)
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

    // Ordenação
    if (options?.sortBy === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (options?.sortBy === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      // recent
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return items;
  },

  async getClassifiedById(id: string): Promise<ClassifiedItem | null> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    return items.find(item => item.id === id) || null;
  },

  async getClassifiedBySlug(slug: string): Promise<ClassifiedItem | null> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    return items.find(item => item.slug === slug || item.id === slug) || null;
  },

  async getUserClassifieds(userId: string): Promise<ClassifiedItem[]> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    return items
      .filter(item => item.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Cadastro e Edição com Validações de Segurança
  async saveClassified(itemData: Partial<ClassifiedItem>, user: UserProfile): Promise<ClassifiedItem> {
    if (!user) throw new Error('Usuário não autenticado.');

    // Bloqueio de segurança obrigatório: validação nas regras de segurança do sistema
    if (user.status === 'suspended' || user.status === 'blocked') {
      throw new Error('Sua conta está com restrição administrativa e não pode publicar ou editar anúncios. Entre em contato com a moderação para revisão.');
    }

    if (user.role !== 'admin' && !user.emailConfirmed) {
      throw new Error('Para publicar classificados, confirme primeiro seu endereço de e-mail. Enviamos uma mensagem com o link de confirmação para o endereço cadastrado.');
    }

    // Limitar rigorosamente upload a 3 imagens
    const sanitizedImages = (itemData.images || []).slice(0, 3);

    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const settings = await this.getSettings();

    if (itemData.id) {
      // Edição
      const index = items.findIndex(i => i.id === itemData.id);
      if (index === -1) throw new Error('Anúncio não encontrado.');

      const existing = items[index];

      // Verificação de permissão: apenas o próprio dono ou administrador
      if (existing.userId !== user.id && user.role !== 'admin') {
        throw new Error('Você não tem permissão para editar este anúncio.');
      }

      const updated: ClassifiedItem = {
        ...existing,
        ...itemData,
        images: sanitizedImages,
        updatedAt: new Date().toISOString()
      };

      // Se editou e requer aprovação (e não é admin), volta para pendente
      if (user.role !== 'admin' && settings.requireApproval && updated.status === 'published') {
        updated.status = 'pending';
      }

      items[index] = updated;
      setStored(STORAGE_KEYS.CLASSIFIEDS, items);
      window.dispatchEvent(new Event('folha_classifieds_updated'));
      return updated;
    }

    // Criação de Novo Anúncio
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const code = `CL-${codeNum}`;
    const baseSlug = (itemData.title || 'anuncio')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${code.toLowerCase()}`;

    // Status inicial: se requireApproval ativado e não é admin -> pending
    let initialStatus: ClassifiedStatus = 'published';
    if (settings.requireApproval && user.role !== 'admin') {
      initialStatus = 'pending';
    }

    const validityDays = settings.defaultValidityDays || 30;
    const expiresAt = new Date(Date.now() + validityDays * 24 * 3600 * 1000).toISOString();

    const newItem: ClassifiedItem = {
      id: 'clf-' + Math.random().toString(36).substring(2, 9),
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
      city: itemData.city?.trim() || 'Estância',
      state: itemData.state?.trim() || 'SE',
      advertiserName: itemData.advertiserName?.trim() || user.fullName,
      phone: itemData.phone?.trim() || '',
      images: sanitizedImages,
      // Campos de emprego
      jobRole: itemData.jobRole?.trim(),
      jobArea: itemData.jobArea?.trim(),
      contractType: itemData.contractType,
      workload: itemData.workload,
      experience: itemData.experience?.trim(),
      requirements: itemData.requirements?.trim(),
      status: initialStatus,
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt
    };

    items.unshift(newItem);
    setStored(STORAGE_KEYS.CLASSIFIEDS, items);
    window.dispatchEvent(new Event('folha_classifieds_updated'));
    return newItem;
  },

  async deleteClassified(id: string, user: UserProfile): Promise<boolean> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const target = items.find(i => i.id === id);
    if (!target) return false;

    // Apenas dono ou administrador pode deletar
    if (target.userId !== user.id && user.role !== 'admin') {
      throw new Error('Você não tem permissão para excluir este anúncio.');
    }

    const filtered = items.filter(i => i.id !== id);
    setStored(STORAGE_KEYS.CLASSIFIEDS, filtered);
    window.dispatchEvent(new Event('folha_classifieds_updated'));
    return true;
  },

  async updateClassifiedStatus(
    id: string, 
    newStatus: ClassifiedStatus, 
    user: UserProfile, 
    rejectionReason?: string
  ): Promise<boolean> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const target = items.find(i => i.id === id);
    if (!target) return false;

    const isAdmin = user.role === 'admin' || user.role === 'editor';
    const isOwner = target.userId === user.id;

    if (!isAdmin && !isOwner) {
      throw new Error('Permissão negada.');
    }

    // Usuário comum só pode pausar ou reativar (se já era publicado ou pausado)
    if (!isAdmin) {
      if (newStatus !== 'paused' && newStatus !== 'published') {
        throw new Error('Você só pode pausar ou reativar seus anúncios.');
      }
      if (newStatus === 'published' && target.status !== 'paused') {
        throw new Error('Apenas anúncios pausados podem ser reativados diretamente.');
      }
    }

    target.status = newStatus;
    if (rejectionReason) {
      target.rejectionReason = rejectionReason;
    }
    target.updatedAt = new Date().toISOString();

    setStored(STORAGE_KEYS.CLASSIFIEDS, items);
    window.dispatchEvent(new Event('folha_classifieds_updated'));
    return true;
  },

  async renewClassified(id: string, user: UserProfile): Promise<boolean> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const target = items.find(i => i.id === id);
    if (!target) return false;

    if (target.userId !== user.id && user.role !== 'admin') {
      throw new Error('Permissão negada.');
    }

    const settings = await this.getSettings();
    const days = settings.defaultValidityDays || 30;
    target.expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
    
    // Se estava expirado, volta para published (ou pending se configurado)
    if (target.status === 'expired') {
      target.status = settings.requireApproval && user.role !== 'admin' ? 'pending' : 'published';
    }
    target.updatedAt = new Date().toISOString();

    setStored(STORAGE_KEYS.CLASSIFIEDS, items);
    window.dispatchEvent(new Event('folha_classifieds_updated'));
    return true;
  },

  async incrementViews(id: string): Promise<number> {
    const items = getStored<ClassifiedItem[]>(STORAGE_KEYS.CLASSIFIEDS, INITIAL_CLASSIFIEDS);
    const target = items.find(i => i.id === id);
    if (target) {
      target.viewsCount = (target.viewsCount || 0) + 1;
      setStored(STORAGE_KEYS.CLASSIFIEDS, items);
      return target.viewsCount;
    }
    return 1;
  },

  // Denúncias
  async getReports(): Promise<ClassifiedReport[]> {
    return getStored<ClassifiedReport[]>(STORAGE_KEYS.CLASSIFIED_REPORTS, []);
  },

  async createReport(reportData: Omit<ClassifiedReport, 'id' | 'createdAt' | 'status'>): Promise<ClassifiedReport> {
    const reports = getStored<ClassifiedReport[]>(STORAGE_KEYS.CLASSIFIED_REPORTS, []);
    const newReport: ClassifiedReport = {
      id: 'rep-' + Math.random().toString(36).substring(2, 9),
      ...reportData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    reports.unshift(newReport);
    setStored(STORAGE_KEYS.CLASSIFIED_REPORTS, reports);
    return newReport;
  },

  async updateReportStatus(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
    const reports = getStored<ClassifiedReport[]>(STORAGE_KEYS.CLASSIFIED_REPORTS, []);
    const target = reports.find(r => r.id === reportId);
    if (target) {
      target.status = status;
      setStored(STORAGE_KEYS.CLASSIFIED_REPORTS, reports);
    }
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
  }
};

export const portalSettingsService = {
  getSettingsSync(): PortalSettings {
    const stored = getStored<Partial<PortalSettings>>(STORAGE_KEYS.PORTAL_SETTINGS, {});
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
      }
    };
  },

  async getSettings(): Promise<PortalSettings> {
    return this.getSettingsSync();
  },

  async saveSettings(newSettings: PortalSettings): Promise<PortalSettings> {
    const updated: PortalSettings = {
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    setStored(STORAGE_KEYS.PORTAL_SETTINGS, updated);
    window.dispatchEvent(new CustomEvent('folha_portal_settings_updated', { detail: updated }));
    return updated;
  },

  async resetToDefaults(): Promise<PortalSettings> {
    setStored(STORAGE_KEYS.PORTAL_SETTINGS, DEFAULT_PORTAL_SETTINGS);
    window.dispatchEvent(new CustomEvent('folha_portal_settings_updated', { detail: DEFAULT_PORTAL_SETTINGS }));
    return DEFAULT_PORTAL_SETTINGS;
  }
};

