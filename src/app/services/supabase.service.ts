import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface MultilingualText {
  es: string;
  en: string;
  [lang: string]: string;
}

export interface CatalogItem {
  id: string;
  category: 'avatar' | 'weapon' | 'theme' | 'timer';
  tier: 'Común' | 'Raro' | 'Épico' | 'Legendario';
  stars: number;
  emoji: string;
  color: string;
  cost_coins: number;
  is_initial: boolean;
  has_evolution: boolean;
  required_quality_id?: string | null;
  coins_per_pomodoro: number;
  pause_penalty_coins: number;
  boss_damage_points: number;
  boss_heal_points: number;
  name: MultilingualText;
  description?: MultilingualText;
  species?: MultilingualText;
  role?: MultilingualText;
  archetype?: MultilingualText;
  weapon_name?: MultilingualText;
  focus_application?: MultilingualText;
  tactical_quote?: MultilingualText;
  passive_name?: MultilingualText;
  passive_advantage?: MultilingualText;
  quality_name?: MultilingualText;
  quality_req?: MultilingualText;
  is_active: boolean;
  created_at?: string;
}

export interface MasterQuality {
  id: string;
  animal_id: string;
  associated_avatar_id?: string;
  target_total: number;
  metric_type: string;
  icon: string;
  color: string;
  display_order: number;
  name: MultilingualText;
  description: MultilingualText;
  unlock_requirement: MultilingualText;
  is_active: boolean;
  created_at?: string;
}

export interface UserQualityProgress {
  id: string;
  user_id: string;
  quality_id: string;
  current_progress: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  updated_at?: string;
}

export interface FocusSessionData {
  id?: string;
  nonce_id: string;
  user_id?: string;
  objective_text: string;
  status: 'completed' | 'abandoned' | 'interrupted';
  methodology: 'normal' | 'sapo' | 'pareto';
  coworking_mode: 'individual' | 'comunitario';
  energy_level: 'low' | 'medium' | 'high';
  planned_duration_seconds: number;
  actual_duration_seconds: number;
  pause_count: number;
  total_pause_seconds: number;
  objective_completed: 'yes' | 'no' | 'progress' | 'partial';
  avatar_id: string;
  coins_earned?: number;
  coins_penalized?: number;
  xp_earned?: number;
  boss_damage_dealt?: number;
  boss_hp_healed?: number;
  is_critical_hit?: boolean;
  grit_bonus_applied?: boolean;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface FocusLogEntry {
  id?: string;
  user_id?: string;
  session_id?: string;
  title: string;
  learnings?: string;
  distractions_recorded?: any[];
  mood_score?: number;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  profession?: string;
  country?: string;
  country_code?: string;
  language?: 'es' | 'en';
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
      this.supabase.auth.getSession()
        .then(({ data }) => {
          this.currentSession.set(data?.session || null);
          this.currentUser.set(data?.session?.user || null);
          this.isLoadingAuth.set(false);
        })
        .catch(() => {
          this.currentSession.set(null);
          this.currentUser.set(null);
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

    // 3. Garantizar sesión activa inmediata
    let session = data.session;
    let user = data.user;
    if (!session && user) {
      const signInRes = await this.signIn(emailClean, password);
      if (signInRes.session) {
        session = signInRes.session;
        user = signInRes.user;
      }
    }

    if (session) {
      this.currentSession.set(session);
      this.currentUser.set(user);
    }

    return { user, error: null };
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

  // ==========================================
  // CATÁLOGO MAESTRO DE ARTÍCULOS
  // ==========================================

  async getCatalogItems(): Promise<{ items: CatalogItem[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { items: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('catalog_items')
        .select('*')
        .eq('is_active', true)
        .order('cost_coins', { ascending: true });

      if (error) {
        return { items: [], error: error.message };
      }

      return { items: (data || []) as CatalogItem[], error: null };
    } catch (e: any) {
      return { items: [], error: e.message || 'Error al obtener catálogo' };
    }
  }

  // ==========================================
  // COSMÉTICOS E INVENTARIO DESBLOQUEADO
  // ==========================================

  async getUnlockedItems(userId: string): Promise<{ items: string[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { items: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('user_unlocked_items')
        .select('item_id')
        .eq('user_id', userId);

      if (error) {
        return { items: [], error: error.message };
      }

      const items = (data || []).map((row: any) => row.item_id);
      return { items, error: null };
    } catch (e: any) {
      return { items: [], error: e.message || 'Error al obtener inventario' };
    }
  }

  async buyCatalogItem(itemId: string): Promise<{ success: boolean; error?: string; remainingCoins?: number }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('buy_catalog_item', { p_item_id: itemId });
      if (error) {
        // Fallback si la función RPC aún no está creada en Supabase
        const user = await this.getCurrentUser();
        if (user) {
          const { error: insertErr } = await this.supabase
            .from('user_unlocked_items')
            .insert({ user_id: user.id, item_id: itemId });
          if (insertErr && !insertErr.message.includes('duplicate key')) {
            return { success: false, error: insertErr.message };
          }
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Error al comprar cosmético' };
      }

      return { success: true, remainingCoins: data?.remaining_coins };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al comprar cosmético' };
    }
  }

  async unlockItemDirectly(userId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { error } = await this.supabase
        .from('user_unlocked_items')
        .upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id, item_id' });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==========================================
  // CUALIDADES MAESTRAS Y PROGRESO DE RETOS
  // ==========================================

  async getMasterQualities(): Promise<{ qualities: MasterQuality[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { qualities: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('master_qualities')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        return { qualities: [], error: error.message };
      }

      return { qualities: (data || []) as MasterQuality[], error: null };
    } catch (e: any) {
      return { qualities: [], error: e.message || 'Error al obtener cualidades maestras' };
    }
  }

  async getUserQualityProgress(userId: string): Promise<{ progress: UserQualityProgress[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { progress: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('user_quality_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        return { progress: [], error: error.message };
      }

      return { progress: (data || []) as UserQualityProgress[], error: null };
    } catch (e: any) {
      return { progress: [], error: e.message || 'Error al obtener progreso de cualidades' };
    }
  }

  async advanceQualityProgress(qualityId: string, increment: number = 1): Promise<{ success: boolean; error?: string; result?: any }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('advance_user_quality_progress', {
        p_quality_id: qualityId,
        p_increment: increment
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Error al avanzar cualidad' };
      }

      return { success: true, result: data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al avanzar cualidad' };
    }
  }

  // ==========================================
  // SESIONES DE ENFOQUE & BITÁCORA ANTI-EXPLOITS
  // ==========================================

  async settleFocusSession(
    data: FocusSessionData,
    logLearnings?: string,
    distractions: any[] = []
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data: rpcData, error } = await this.supabase.rpc('settle_focus_session', {
        p_nonce_id: data.nonce_id,
        p_avatar_id: data.avatar_id,
        p_methodology: data.methodology,
        p_coworking_mode: data.coworking_mode,
        p_energy_level: data.energy_level,
        p_objective_text: data.objective_text,
        p_planned_seconds: data.planned_duration_seconds,
        p_actual_seconds: data.actual_duration_seconds,
        p_pause_count: data.pause_count,
        p_total_pause_seconds: data.total_pause_seconds,
        p_status: data.status,
        p_objective_completed: data.objective_completed,
        p_log_learnings: logLearnings || null,
        p_distractions: distractions
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (rpcData && rpcData.success === false) {
        return { success: false, error: rpcData.error || 'Error al liquidar sesión' };
      }

      return { success: true, result: rpcData };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al liquidar sesión' };
    }
  }

  async getFocusSessions(userId: string, limit: number = 20): Promise<{ sessions: FocusSessionData[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { sessions: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { sessions: [], error: error.message };
      }

      return { sessions: (data || []) as FocusSessionData[], error: null };
    } catch (e: any) {
      return { sessions: [], error: e.message || 'Error al obtener sesiones' };
    }
  }

  async addFocusLog(
    title: string,
    learnings: string,
    distractions: any[] = [],
    moodScore: number = 4
  ): Promise<{ success: boolean; error?: string; logId?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('add_focus_log_entry', {
        p_title: title,
        p_learnings: learnings,
        p_distractions: distractions,
        p_mood_score: moodScore
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, logId: data?.log_id };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al guardar bitácora' };
    }
  }

  async getFocusLogs(userId: string, limit: number = 30): Promise<{ logs: FocusLogEntry[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { logs: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('focus_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { logs: [], error: error.message };
      }

      return { logs: (data || []) as FocusLogEntry[], error: null };
    } catch (e: any) {
      return { logs: [], error: e.message || 'Error al obtener bitácora' };
    }
  }
}


