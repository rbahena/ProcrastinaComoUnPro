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

export interface CommunityBossData {
  id: string;
  name: MultilingualText;
  description: MultilingualText;
  boss_type: string;
  max_hp: number;
  current_hp: number;
  status: 'active' | 'defeated';
  community_shield: number;
  max_community_shield: number;
  defeat_reward_coins: number;
  is_current_active: boolean;
  defeated_at?: string;
  respawn_at?: string;
  updated_at?: string;
}

export interface BossAttackEvent {
  id: string;
  boss_id: string;
  user_id?: string;
  user_name: string;
  user_avatar?: string;
  event_type: 'attack' | 'critical' | 'heal' | 'shield_absorb' | 'shield_break' | 'victory' | 'spawn';
  damage_dealt: number;
  hp_healed: number;
  shield_damage: number;
  message: string;
  created_at?: string;
}

export interface TemporalDeadline {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  deadline_at: string;
  priority: 'baja' | 'media' | 'alta' | 'critica';
  category: string;
  is_completed: boolean;
  completed_at?: string;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  created_at?: string;
  updated_at?: string;
}

export interface FirewallBlockedSite {
  id?: string;
  user_id?: string;
  domain: string;
  category: string;
  is_active: boolean;
  blocked_attempts_count: number;
  last_blocked_at?: string;
  created_at?: string;
}

export interface CapturedIdea {
  id?: string;
  user_id?: string;
  content: string;
  is_converted_to_objective: boolean;
  converted_at?: string;
  display_order: number;
  created_at?: string;
}

export interface CommunityLeaderboardUser {
  id: string;
  username: string;
  selected_avatar: string;
  selected_theme?: string;
  focus_points?: number;
  focus_tomatoes?: number;
  streak_days?: number;
  podium_wins?: number;
  gold_medals?: number;
  silver_medals?: number;
  bronze_medals?: number;
}

export interface CommunityHomeDashboardData {
  total_users: number;
  completed_today: number;
  user_rank: number;
  podium: CommunityLeaderboardUser[];
  top_records: CommunityLeaderboardUser[];
  recent_avatars: CommunityLeaderboardUser[];
}

export interface MedalleroBrokenRecordHolder {
  holder: string;
  avatar: string;
  flag: string;
  streak?: number;
  tomatoes?: number;
  coins?: number;
  podiums?: number;
  user_id?: string;
}

export interface MedalleroRankingObjectivesItem {
  id: string;
  username: string;
  selected_avatar: string;
  country_code: string;
  focus_points: number;
  focus_tomatoes?: number;
  podium_wins?: number;
  streak_days?: number;
}

export interface MedalleroRankingPomodorosItem {
  id: string;
  username: string;
  selected_avatar: string;
  country_code: string;
  focus_tomatoes: number;
  focus_points?: number;
  streak_days?: number;
}

export interface MedalleroRankingStreaksItem {
  id: string;
  username: string;
  selected_avatar: string;
  country_code: string;
  streak_count: number;
  streak_days?: number;
}

export interface MedalleroRankingBossItem {
  id: string;
  username: string;
  selected_avatar: string;
  country_code: string;
  total_damage: number;
}

export interface MedalleroDashboardData {
  records: {
    best_streak: MedalleroBrokenRecordHolder | null;
    most_tomatoes: MedalleroBrokenRecordHolder | null;
    most_coins: MedalleroBrokenRecordHolder | null;
    most_podiums: MedalleroBrokenRecordHolder | null;
  };
  rankings: {
    objectives: MedalleroRankingObjectivesItem[];
    pomodoros: MedalleroRankingPomodorosItem[];
    streaks: MedalleroRankingStreaksItem[];
    boss: MedalleroRankingBossItem[];
  };
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

  // ==========================================
  // JEFES DE RAID COMUNITARIOS & REALTIME
  // ==========================================

  async getActiveBoss(): Promise<{ boss: CommunityBossData | null; error: string | null }> {
    if (!this.isConfigured()) {
      return { boss: null, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('community_bosses')
        .select('*')
        .eq('is_current_active', true)
        .maybeSingle();

      if (error) {
        return { boss: null, error: error.message };
      }

      return { boss: data as CommunityBossData, error: null };
    } catch (e: any) {
      return { boss: null, error: e.message || 'Error al obtener jefe activo' };
    }
  }

  async dealBossDamage(
    bossId: string,
    damage: number,
    isCritical: boolean = false,
    userName: string = 'Guerrero'
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('deal_boss_damage', {
        p_boss_id: bossId,
        p_damage: damage,
        p_is_critical: isCritical,
        p_user_name: userName
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, result: data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al asestar daño al jefe' };
    }
  }

  async healBossFromDistraction(
    bossId: string,
    playerName: string = 'Un Guerrero'
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('heal_boss_from_distraction', {
        p_boss_id: bossId,
        p_player_name: playerName
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, result: data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al curar al jefe' };
    }
  }

  async getRecentBossEvents(bossId: string, limit: number = 30): Promise<{ events: BossAttackEvent[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { events: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('community_boss_attacks')
        .select('*')
        .eq('boss_id', bossId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { events: [], error: error.message };
      }

      return { events: (data || []) as BossAttackEvent[], error: null };
    } catch (e: any) {
      return { events: [], error: e.message || 'Error al obtener eventos de combate' };
    }
  }

  async switchActiveBoss(bossType: string): Promise<{ success: boolean; error?: string; result?: any }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('switch_active_boss', {
        p_boss_type: bossType
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, result: data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al cambiar jefe' };
    }
  }

  // ==========================================
  // ARENA TEMPORAL, CORTAFUEGOS & BAÚL DE IDEAS
  // ==========================================

  // --- ARENA TEMPORAL (/fechas) ---
  async getDeadlines(userId: string): Promise<{ deadlines: TemporalDeadline[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { deadlines: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('temporal_deadlines')
        .select('*')
        .eq('user_id', userId)
        .order('deadline_at', { ascending: true });

      if (error) {
        return { deadlines: [], error: error.message };
      }

      return { deadlines: (data || []) as TemporalDeadline[], error: null };
    } catch (e: any) {
      return { deadlines: [], error: e.message || 'Error al obtener deadlines' };
    }
  }

  async createDeadline(deadline: Omit<TemporalDeadline, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; deadline?: TemporalDeadline }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) return { success: false, error: 'No autenticado' };

      const { data, error } = await this.supabase
        .from('temporal_deadlines')
        .insert({ ...deadline, user_id: user.id })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, deadline: data as TemporalDeadline };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al crear deadline' };
    }
  }

  async updateDeadline(id: string, updates: Partial<TemporalDeadline>): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { error } = await this.supabase
        .from('temporal_deadlines')
        .update(updates)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al actualizar deadline' };
    }
  }

  async toggleDeadlineCompleted(id: string, isCompleted: boolean): Promise<{ success: boolean; error?: string }> {
    return this.updateDeadline(id, {
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : undefined
    });
  }

  async deleteDeadline(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { error } = await this.supabase
        .from('temporal_deadlines')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al eliminar deadline' };
    }
  }

  // --- CORTAFUEGOS (/bloqueador) ---
  async getBlockedSites(userId: string): Promise<{ sites: FirewallBlockedSite[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { sites: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('firewall_blocked_sites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { sites: [], error: error.message };
      }

      return { sites: (data || []) as FirewallBlockedSite[], error: null };
    } catch (e: any) {
      return { sites: [], error: e.message || 'Error al obtener sitios bloqueados' };
    }
  }

  async addBlockedSite(domain: string, category: string = 'redes_sociales'): Promise<{ success: boolean; error?: string; site?: FirewallBlockedSite }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) return { success: false, error: 'No autenticado' };

      const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();

      const { data, error } = await this.supabase
        .from('firewall_blocked_sites')
        .insert({
          user_id: user.id,
          domain: cleanDomain,
          category,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, site: data as FirewallBlockedSite };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al agregar sitio bloqueado' };
    }
  }

  async toggleBlockedSite(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { error } = await this.supabase
        .from('firewall_blocked_sites')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al cambiar estado de bloqueo' };
    }
  }

  async deleteBlockedSite(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { error } = await this.supabase
        .from('firewall_blocked_sites')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al eliminar sitio bloqueado' };
    }
  }

  async registerFirewallBlock(domain: string): Promise<{ success: boolean; error?: string; result?: any }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('register_firewall_block', {
        p_domain: domain
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, result: data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al registrar bloqueo' };
    }
  }

  // --- BAÚL DE IDEAS (/ideas) ---
  async getCapturedIdeas(userId: string): Promise<{ ideas: CapturedIdea[]; error: string | null }> {
    if (!this.isConfigured()) {
      return { ideas: [], error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase
        .from('captured_ideas')
        .select('*')
        .eq('user_id', userId)
        .eq('is_converted_to_objective', false)
        .order('created_at', { ascending: false });

      if (error) {
        return { ideas: [], error: error.message };
      }

      return { ideas: (data || []) as CapturedIdea[], error: null };
    } catch (e: any) {
      return { ideas: [], error: e.message || 'Error al obtener ideas' };
    }
  }

  async saveCapturedIdea(content: string, displayOrder: number = 1): Promise<{ success: boolean; error?: string; idea?: CapturedIdea }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const user = await this.getCurrentUser();
      if (!user) return { success: false, error: 'No autenticado' };

      const { data, error } = await this.supabase
        .from('captured_ideas')
        .insert({
          user_id: user.id,
          content: content.trim(),
          display_order: displayOrder
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, idea: data as CapturedIdea };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al guardar idea' };
    }
  }

  async deleteCapturedIdea(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { error } = await this.supabase
        .from('captured_ideas')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al eliminar idea' };
    }
  }

  async convertIdeaToObjective(ideaId: string): Promise<{ success: boolean; error?: string; objectiveText?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await this.supabase.rpc('convert_idea_to_objective', {
        p_idea_id: ideaId
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'Error al convertir idea' };
      }

      return { success: true, objectiveText: data?.objective_text };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al convertir idea' };
    }
  }

  // ==========================================
  // DASHBOARD DE LA COMUNIDAD (HOME)
  // ==========================================

  async getCommunityHomeDashboard(): Promise<{ data: CommunityHomeDashboardData | null; error: string | null }> {
    if (!this.isConfigured()) {
      return { data: null, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      // 1. Intentar llamar al RPC get_community_home_dashboard
      const { data: rpcData, error: rpcError } = await this.supabase.rpc('get_community_home_dashboard');
      if (!rpcError && rpcData && rpcData.success) {
        return {
          data: {
            total_users: rpcData.total_users ?? 0,
            completed_today: rpcData.completed_today ?? 0,
            user_rank: rpcData.user_rank ?? 1,
            podium: rpcData.podium ?? [],
            top_records: rpcData.top_records ?? [],
            recent_avatars: rpcData.recent_avatars ?? []
          },
          error: null
        };
      }

      // 2. Fallback con queries directas a profiles y focus_sessions
      const currentUser = await this.getCurrentUser();
      
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id, username, selected_avatar, selected_theme, focus_points, focus_tomatoes, streak_days, podium_wins, gold_medals, silver_medals, bronze_medals, updated_at')
        .order('focus_points', { ascending: false });

      if (profilesError) {
        return { data: null, error: profilesError.message };
      }

      const allProfiles: CommunityLeaderboardUser[] = profiles || [];
      const totalUsers = allProfiles.length;

      // Calcular user_rank
      let userRank = 1;
      if (currentUser) {
        const foundIdx = allProfiles.findIndex(p => p.id === currentUser.id);
        if (foundIdx !== -1) {
          userRank = foundIdx + 1;
        }
      }

      // Podio: Top 3 por focus_points
      const podium = allProfiles.slice(0, 3);

      // Top récords: Top 5 por focus_tomatoes
      const topRecords = [...allProfiles]
        .sort((a, b) => (b.focus_tomatoes || 0) - (a.focus_tomatoes || 0))
        .slice(0, 5);

      // Recientes
      const recentAvatars = allProfiles.slice(0, 6);

      // Conteo de sesiones hoy
      const todayISO = new Date().toISOString().split('T')[0];
      const { count: completedToday } = await this.supabase
        .from('focus_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', todayISO);

      return {
        data: {
          total_users: totalUsers,
          completed_today: completedToday || 0,
          user_rank: userRank,
          podium,
          top_records: topRecords,
          recent_avatars: recentAvatars
        },
        error: null
      };
    } catch (e: any) {
      return { data: null, error: e.message || 'Error al obtener dashboard de comunidad' };
    }
  }

  // ==========================================
  // SALÓN DE LA FAMA & RÉCORDS HISTÓRICOS (MEDALLERO)
  // ==========================================

  async getMedalleroData(): Promise<{ data: MedalleroDashboardData | null; error: string | null }> {
    if (!this.isConfigured()) {
      return { data: null, error: 'SUPABASE_NOT_CONFIGURED' };
    }

    try {
      // 1. Intentar llamar al RPC get_medallero_records_dashboard
      const { data: rpcData, error: rpcError } = await this.supabase.rpc('get_medallero_records_dashboard');
      if (!rpcError && rpcData && rpcData.success) {
        return {
          data: {
            records: {
              best_streak: rpcData.records?.best_streak || null,
              most_tomatoes: rpcData.records?.most_tomatoes || null,
              most_coins: rpcData.records?.most_coins || null,
              most_podiums: rpcData.records?.most_podiums || null
            },
            rankings: {
              objectives: rpcData.rankings?.objectives || [],
              pomodoros: rpcData.rankings?.pomodoros || [],
              streaks: rpcData.rankings?.streaks || [],
              boss: rpcData.rankings?.boss || []
            }
          },
          error: null
        };
      }

      // 2. Fallback con queries directas a profiles y community_boss_attacks
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id, username, selected_avatar, country_code, pro_coins, focus_points, focus_tomatoes, streak_days, longest_streak, podium_wins, gold_medals, created_at');

      if (profilesError) {
        return { data: null, error: profilesError.message };
      }

      const allProfiles = profiles || [];

      // A. Récords
      const sortedByStreak = [...allProfiles].sort((a, b) => 
        Math.max(b.longest_streak || 0, b.streak_days || 0) - Math.max(a.longest_streak || 0, a.streak_days || 0)
      );
      const topStreak = sortedByStreak[0];

      const sortedByTomatoes = [...allProfiles].sort((a, b) => 
        (b.focus_tomatoes || 0) - (a.focus_tomatoes || 0)
      );
      const topTomatoes = sortedByTomatoes[0];

      const sortedByCoins = [...allProfiles].sort((a, b) => 
        (b.pro_coins || 0) - (a.pro_coins || 0)
      );
      const topCoins = sortedByCoins[0];

      const sortedByPodiums = [...allProfiles].sort((a, b) => 
        (b.podium_wins || 0) - (a.podium_wins || 0)
      );
      const topPodiums = sortedByPodiums[0];

      // B. Rankings
      const objectives = [...allProfiles]
        .sort((a, b) => (b.focus_points || 0) - (a.focus_points || 0))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          username: p.username || 'Guerrero',
          selected_avatar: p.selected_avatar || 'gato',
          country_code: (p.country_code || 'mx').toLowerCase(),
          focus_points: p.focus_points || 0,
          focus_tomatoes: p.focus_tomatoes || 0,
          podium_wins: p.podium_wins || 0,
          streak_days: p.streak_days || 0
        }));

      const pomodoros = [...allProfiles]
        .sort((a, b) => (b.focus_tomatoes || 0) - (a.focus_tomatoes || 0))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          username: p.username || 'Guerrero',
          selected_avatar: p.selected_avatar || 'gato',
          country_code: (p.country_code || 'mx').toLowerCase(),
          focus_tomatoes: p.focus_tomatoes || 0,
          focus_points: p.focus_points || 0,
          streak_days: p.streak_days || 0
        }));

      const streaks = [...allProfiles]
        .sort((a, b) => Math.max(b.longest_streak || 0, b.streak_days || 0) - Math.max(a.longest_streak || 0, a.streak_days || 0))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          username: p.username || 'Guerrero',
          selected_avatar: p.selected_avatar || 'gato',
          country_code: (p.country_code || 'mx').toLowerCase(),
          streak_count: Math.max(p.longest_streak || 0, p.streak_days || 0),
          streak_days: p.streak_days || 0
        }));

      // C. Boss damage ranking
      const { data: bossAttacks } = await this.supabase
        .from('community_boss_attacks')
        .select('user_id, user_name, user_avatar, damage_dealt')
        .gt('damage_dealt', 0);

      const bossDamageMap = new Map<string, { id: string; username: string; selected_avatar: string; total_damage: number }>();
      (bossAttacks || []).forEach((att: any) => {
        const key = att.user_id || att.user_name || 'Desconocido';
        const existing = bossDamageMap.get(key);
        if (existing) {
          existing.total_damage += att.damage_dealt;
        } else {
          bossDamageMap.set(key, {
            id: att.user_id || key,
            username: att.user_name || 'Guerrero',
            selected_avatar: att.user_avatar || 'lobo',
            total_damage: att.damage_dealt
          });
        }
      });

      const bossRanking: MedalleroRankingBossItem[] = Array.from(bossDamageMap.values())
        .sort((a, b) => b.total_damage - a.total_damage)
        .slice(0, 10)
        .map(b => ({
          id: b.id,
          username: b.username,
          selected_avatar: b.selected_avatar,
          country_code: 'mx',
          total_damage: b.total_damage
        }));

      return {
        data: {
          records: {
            best_streak: topStreak ? {
              holder: topStreak.username || 'Guerrero',
              avatar: topStreak.selected_avatar || 'panda',
              flag: (topStreak.country_code || 'mx').toLowerCase(),
              streak: Math.max(topStreak.longest_streak || 0, topStreak.streak_days || 0),
              user_id: topStreak.id
            } : null,
            most_tomatoes: topTomatoes ? {
              holder: topTomatoes.username || 'Guerrero',
              avatar: topTomatoes.selected_avatar || 'tortuga',
              flag: (topTomatoes.country_code || 'pe').toLowerCase(),
              tomatoes: topTomatoes.focus_tomatoes || 0,
              user_id: topTomatoes.id
            } : null,
            most_coins: topCoins ? {
              holder: topCoins.username || 'Guerrero',
              avatar: topCoins.selected_avatar || 'rana',
              flag: (topCoins.country_code || 'es').toLowerCase(),
              coins: topCoins.pro_coins || 0,
              user_id: topCoins.id
            } : null,
            most_podiums: topPodiums ? {
              holder: topPodiums.username || 'Guerrero',
              avatar: topPodiums.selected_avatar || 'zorro',
              flag: (topPodiums.country_code || 'cl').toLowerCase(),
              podiums: topPodiums.podium_wins || 0,
              user_id: topPodiums.id
            } : null
          },
          rankings: {
            objectives,
            pomodoros,
            streaks,
            boss: bossRanking
          }
        },
        error: null
      };
    } catch (e: any) {
      return { data: null, error: e.message || 'Error al obtener récords del medallero' };
    }
  }
}




