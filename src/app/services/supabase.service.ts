import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  profession?: string;
  country?: string;
  country_code?: string;
  active_days?: number[];
  selected_avatar?: string;
  selected_theme?: 'samurai' | 'cyberpunk' | 'aurora' | 'zen';
  selected_weapon?: string;
  is_premium?: boolean;
  pro_coins?: number;
  focus_points?: number;
  focus_tomatoes?: number;
  streak_days?: number;
  longest_streak?: number;
  podium_wins?: number;
  gold_medals?: number;
  silver_medals?: number;
  bronze_medals?: number;
  onboarding_completed?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  
  // Estado reactivo de autenticación
  currentUser = signal<User | null>(null);
  currentSession = signal<Session | null>(null);
  isLoadingAuth = signal<boolean>(true);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // Escuchar cambios de sesión de Supabase
    if (this.isConfigured()) {
      this.supabase.auth.getSession().then(({ data: { session } }) => {
        this.currentSession.set(session);
        this.currentUser.set(session?.user || null);
        this.isLoadingAuth.set(false);
      });

      this.supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        this.currentSession.set(session);
        this.currentUser.set(session?.user || null);
        this.isLoadingAuth.set(false);
      });
    } else {
      this.isLoadingAuth.set(false);
    }
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.isConfigured()) return null;
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async getSession(): Promise<Session | null> {
    if (!this.isConfigured()) return null;
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  // Verifica si las credenciales de Supabase fueron configuradas
  isConfigured(): boolean {
    return (
      !!environment.supabaseUrl &&
      !environment.supabaseUrl.includes('YOUR_PROJECT_ID') &&
      !!environment.supabaseAnonKey &&
      !environment.supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
    );
  }

  // ==========================================
  // AUTENTICACIÓN (LOGIN & REGISTRO)
  // ==========================================

  async isEmailRegistered(email: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  }

  async signUp(email: string, password: string, username?: string): Promise<{ user: User | null; error: string | null }> {
    if (!this.isConfigured()) {
      return { user: null, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    const emailClean = email.toLowerCase().trim();

    // 1. Verificación previa en profiles
    const alreadyExists = await this.isEmailRegistered(emailClean);
    if (alreadyExists) {
      return { user: null, error: 'Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.' };
    }

    const { data, error } = await this.supabase.auth.signUp({
      email: emailClean,
      password,
      options: {
        data: {
          user_name: username || emailClean.split('@')[0],
          full_name: username || emailClean.split('@')[0]
        }
      }
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('For security purposes')) {
        msg = 'Por motivos de seguridad, espera unos segundos antes de intentar crear otra cuenta.';
      } else if (
        msg.includes('User already registered') || 
        msg.includes('already registered') || 
        msg.includes('already in use') || 
        msg.includes('duplicate key')
      ) {
        msg = 'Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'La contraseña debe tener al menos 8 caracteres.';
      }
      return { user: null, error: msg };
    }

    // 2. Detección de identidad duplicada (Supabase retorna identities vacías si el correo ya existe)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { user: null, error: 'Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.' };
    }

    return { user: data.user, error: null };
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: string | null }> {
    if (!this.isConfigured()) {
      return { user: null, session: null, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        msg = 'El correo o la contraseña son incorrectos.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Debes confirmar tu correo electrónico antes de iniciar sesión.';
      }
      return { user: null, session: null, error: msg };
    }

    return { user: data.user, session: data.session, error: null };
  }

  async signInWithGoogle(): Promise<{ error: string | null }> {
    if (!this.isConfigured()) {
      return { error: 'SUPABASE_NOT_CONFIGURED' };
    }

    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/home'
      }
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  }

  async signOut(): Promise<{ error: string | null }> {
    if (!this.isConfigured()) {
      return { error: null };
    }

    const { error } = await this.supabase.auth.signOut();
    if (error) return { error: error.message };
    return { error: null };
  }

  // ==========================================
  // PERFIL DE USUARIO
  // ==========================================

  async getProfile(userId: string): Promise<{ profile: UserProfile | null; error: string | null }> {
    if (!this.isConfigured()) {
      return { profile: null, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { profile: null, error: error.message };
    }

    return { profile: data as UserProfile, error: null };
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ error: string | null }> {
    if (!this.isConfigured()) {
      return { error: 'SUPABASE_NOT_CONFIGURED' };
    }

    const { error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  }
}
