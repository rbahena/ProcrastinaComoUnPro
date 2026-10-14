import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService, CatalogItem, MultilingualText, CapturedIdea, IdeaPriority } from './supabase.service';

export function normalizeCapturedIdeas(raw: any[]): CapturedIdea[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `local-${index}-${Date.now()}`,
        content: item,
        is_converted_to_objective: false,
        is_completed: false,
        display_order: index + 1,
        priority: 'media' as IdeaPriority,
        dedicated_minutes: 0,
        created_at: new Date().toISOString()
      };
    }
    return {
      id: item.id || `local-${index}-${Date.now()}`,
      content: item.content || '',
      is_converted_to_objective: item.is_converted_to_objective || false,
      converted_at: item.converted_at,
      is_completed: item.is_completed || false,
      completed_at: item.completed_at,
      display_order: item.display_order || (index + 1),
      priority: (item.priority as IdeaPriority) || 'media',
      dedicated_minutes: Number(item.dedicated_minutes) || 0,
      created_at: item.created_at || new Date().toISOString()
    };
  }).filter(i => !!i.content);
}

export interface AvatarItem {
  id: string;
  name: string;
  quality?: string;
  slogan?: string;
  icon: string;
  color: string;
  isUnlocked: boolean;
  isInitial?: boolean;
}

export interface QualityItem {
  id: string;
  animal: string;
  name: string;
  description: string;
  unlockRequirement: string;
  isUnlocked: boolean;
  unlockProgress: number;
  unlockTotal: number;
  unlockedAt?: string;
}

export const DEFAULT_FOCUS_PREFERENCES: Record<string, string> = {
  'focus-timer-style': 'digital',
  'focus-active-bg': 'theme_autumn',
  'focus-bg-sound': 'off',
  'focus-break-bg-sound': 'off',
  'focus-long-break-bg-sound': 'off',
  'focus-bg-volume': '1.0',
  'focus-end-sound': 'tone',
  'focus-break-sound-enabled': 'true',
  'focus-break-sound': 'electronic_chime',
  'focus-long-break-sound': 'electronic_chime',
  'focus-duration': '25',
  'break-duration': '5',
  'long-break-interval': '4',
  'long-break-duration': '15',
  'desktop-notifications-enabled': 'true',
  'tab-notifications-enabled': 'true',
  'focus-notification-enabled': 'true',
  'break-notification-enabled': 'true',
  'long-break-notification-enabled': 'true',
  'motivation-notification-enabled': 'true',
  'abandon-sound-enabled': 'true',
  'show-battery-button-in-arena': 'true'
};

function cleanQuotedString(val: string): string {
  if (!val) return '';
  let str = String(val).trim();
  while (
    (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
    (str.startsWith("'") && str.endsWith("'") && str.length >= 2) ||
    (str.startsWith('\\"') && str.endsWith('\\"')) ||
    (str.startsWith('\\') && str.length > 1)
  ) {
    if (str.startsWith('\\"') && str.endsWith('\\"')) {
      str = str.slice(2, -2).trim();
    } else if (
      (str.startsWith('"') && str.endsWith('"')) ||
      (str.startsWith("'") && str.endsWith("'"))
    ) {
      str = str.slice(1, -1).trim();
    } else if (str.startsWith('\\')) {
      str = str.replace(/^\\+|\\+$/g, '').trim();
    }
  }
  return str.replace(/["'\\]+/g, '').replace(/[\/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export const INITIAL_AVATARS_LIST = [
  'gato', 'perro', 'conejo', 'loro', 'hamster', 'raton'
];

export const ALL_AVATARS_LIST = [
  'gato', 'perro', 'conejo', 'loro', 'hamster', 'raton', 'tortuga', 'hormiga', 'buho', 'rana', 
  'aguila', 'abeja', 'castor', 'zorro', 'lince', 'panda', 'oso', 'elefante', 'leon', 'tigre', 
  'lobo', 'dragon', 'fenix', 'grifo'
];

@Injectable({
  providedIn: 'root',
})
export class MembershipService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // Estado de membresía (Pro/Premium Desbloqueado al 100%)
  isPremium = signal<boolean>(true);

  // Estado del sidebar global
  sidebarCollapsed = signal<boolean>(
    localStorage.getItem('sidebar-collapsed') === 'true'
  );

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
    localStorage.setItem('sidebar-collapsed', String(this.sidebarCollapsed()));
  }

  // Estado del menú desplegable del avatar (perfil/cerrar sesión)
  avatarMenuOpen = signal<boolean>(false);

  toggleAvatarMenu(event: Event) {
    event.stopPropagation();
    this.avatarMenuOpen.set(!this.avatarMenuOpen());
  }

  closeAvatarMenu() {
    this.avatarMenuOpen.set(false);
  }

  // Estado de bloqueo de navegación por Pomodoro activo (Solo durante enfoque, no en descansos)
  isFocusActive = signal<boolean>(false);

  // Puntos de enfoque (para ranking)
  focusPoints = signal<number>(0);

  // Pro Coins
  proCoins = signal<number>(0);

  // Tomates de enfoque (1 por sesión de concentración)
  focusTomatoes = signal<number>(0);

  // Objetivos completados y sesiones abandonadas (Métricas de Calidad y Disciplina)
  completedObjectives = signal<number>(0);
  abandonedSessions = signal<number>(0);

  // Score y Puntos de Disciplina Semanales (Se reinicia cada Lunes a las 00:00)
  weeklyHonorPoints = signal<number>(0);
  lastWeekStart = signal<string>('');

  // Tasa de Efectividad / Disciplina (0% - 100%)
  effectivenessRate = computed<number>(() => {
    const totalSessions = this.focusTomatoes();
    const abandons = this.abandonedSessions();
    const totalAttempts = totalSessions + abandons;
    if (totalAttempts === 0) return 100;
    const rate = Math.round((totalSessions / totalAttempts) * 100);
    return Math.max(0, Math.min(100, rate));
  });

  // Racha de días de enfoque
  streak = signal<number>(0);
  lastFocusDate = signal<string>('');
  userCreatedAt = signal<string>('');

  getCurrentMondayString(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  }

  validateWeeklyPointsIntegrity() {
    const currentMonday = this.getCurrentMondayString();
    if (this.lastWeekStart() && this.lastWeekStart() !== currentMonday) {
      this.weeklyHonorPoints.set(0);
      this.lastWeekStart.set(currentMonday);
    } else if (!this.lastWeekStart()) {
      this.lastWeekStart.set(currentMonday);
    }
  }

  addWeeklyHonorPoints(points: number) {
    this.validateWeeklyPointsIntegrity();
    this.weeklyHonorPoints.update(p => Math.max(0, p + points));
  }

  addFocusTomatoes(tomatoes: number) {
    this.focusTomatoes.update(t => t + tomatoes);
    this.queueGamificationSync();
  }

  addCompletedObjective() {
    this.completedObjectives.update(c => c + 1);
    this.queueGamificationSync();
  }

  addAbandonedSession() {
    this.abandonedSessions.update(a => a + 1);
    this.queueGamificationSync();
  }

  // Cosméticos desbloqueados (Solo los 6 iniciales por defecto)
  unlockedAvatars = signal<string[]>([...INITIAL_AVATARS_LIST]);
  unlockedThemes = signal<string[]>(['samurai']);
  unlockedTimers = signal<string[]>(['digital']);

  // Perfil del usuario
  userName = signal<string>('Guerrero');
  userProfession = signal<string>('');
  // Días activos de la semana (1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb, 7: Dom)
  userActiveDays = signal<number[]>([1, 2, 3, 4, 5]);
  userCountry = signal<string>('');
  userCountryCode = signal<string>('');
  selectedAvatar = signal<string>('gato');
  selectedTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>('samurai');
  themeMode = signal<'dark' | 'light'>('dark');

  // Medallas ganadas en podios
  podiumWins = signal<number>(0);
  goldMedals = signal<number>(0);
  silverMedals = signal<number>(0);
  bronzeMedals = signal<number>(0);

  // Estado de onboarding completado
  onboardingCompleted = signal<boolean>(true);

  // Control global para abrir el modal de configuración de identidad
  showSettingsModal = signal<boolean>(false);

  // Idioma de la interfaz ('es' por defecto o 'en')
  userLanguage = signal<'es' | 'en'>('es');

  // Preferencias centralizadas de la Arena de Enfoque
  focusPreferences = signal<Record<string, string>>({ ...DEFAULT_FOCUS_PREFERENCES });

  // Ideas capturadas durante sesiones de enfoque
  capturedIdeas = signal<CapturedIdea[]>([]);

  // Contador de ideas y tareas pendientes (no completadas)
  pendingCapturedIdeasCount = computed(() =>
    this.capturedIdeas().filter(i => !i.is_completed).length
  );

  // Catálogo dinámico cargado desde Supabase
  catalogItems = signal<CatalogItem[]>([]);

  // Catálogo completo de avatares disponibles (generado dinámicamente desde Supabase)
  avatarsCatalog = computed<AvatarItem[]>(() => {
    const items = this.catalogItems().filter(i => i.category === 'avatar' && i.id !== 'tortuga_evolved');
    const unlocked = this.unlockedAvatars();
    const lang = this.userLanguage();

    if (items.length > 0) {
      return items.map(item => ({
        id: item.id,
        name: item.name?.[lang] || item.name?.['es'] || item.id,
        icon: this.getAvatarIconById(item.id),
        color: item.color || '#10b981',
        isUnlocked: unlocked.includes(item.id),
        isInitial: item.is_initial
      }));
    }
    return [];
  });

  // ==============================================================================
  // ALMACENAMIENTO SEGURO Y PROTECCIÓN DE AVATARES (SUPABASE STORAGE BUCKET 'avatars')
  // ==============================================================================
  private avatarSignedUrls = new Map<string, string>();

  /**
   * Asegura que la imagen de un avatar esté cargada desde el bucket protegido de Supabase.
   * Si está desbloqueada o es inicial, inyecta la variable CSS --avatar-img-<avatarId> en el DOM.
   */
  async ensureAvatarLoaded(avatarId: string): Promise<string | null> {
    if (!avatarId) return null;
    if (this.avatarSignedUrls.has(avatarId)) {
      return this.avatarSignedUrls.get(avatarId)!;
    }

    try {
      const signedUrl = await this.supabaseService.getAvatarSignedUrl(avatarId);
      if (signedUrl) {
        this.avatarSignedUrls.set(avatarId, signedUrl);
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty(`--avatar-img-${avatarId}`, `url("${signedUrl}")`);
        }
        return signedUrl;
      }
    } catch (e) {
      console.warn(`[MembershipService] Error cargando URL firmada para avatar ${avatarId}:`, e);
    }
    return null;
  }

  /**
   * Sincroniza y descarga las URLs firmadas para todos los avatares que el usuario tiene desbloqueados.
   */
  async syncUnlockedAvatarUrls() {
    const list = Array.from(new Set([...this.unlockedAvatars(), this.selectedAvatar()]));
    await Promise.all(list.map(id => this.ensureAvatarLoaded(id)));
  }

  /**
   * Retorna la URL directa de la imagen de un avatar.
   * Si ya tiene URL firmada en caché la retorna.
   * Si está desbloqueado y es inicial, retorna el asset local.
   * Si está bloqueado, retorna la silueta (_locked.webp).
   */
  getAvatarImageUrl(avatarId: string, isUnlocked?: boolean): string {
    if (!avatarId) return '/assets/images/avatars/gato_locked.webp';
    if (this.avatarSignedUrls.has(avatarId)) {
      return this.avatarSignedUrls.get(avatarId)!;
    }

    const unlocked = isUnlocked ?? this.unlockedAvatars().includes(avatarId);
    if (unlocked) {
      this.ensureAvatarLoaded(avatarId);
    }
    return `/assets/images/avatars/${avatarId}_locked.webp`;
  }

  // Catálogo completo de Cualidades (Bloqueadas por defecto para desbloqueo por mérito/retos)
  qualitiesCatalog = signal<QualityItem[]>([
    { id: 'constancia', animal: 'tortuga', name: 'Constancia', description: 'Cada día cuenta.', unlockRequirement: 'Mantener una racha de 7 días consecutivos.', isUnlocked: false, unlockProgress: 0, unlockTotal: 7 },
    { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar 15 pomodoros en total.', isUnlocked: false, unlockProgress: 0, unlockTotal: 15 },
    { id: 'sabiduria', animal: 'buho', name: 'Sabiduría', description: 'La estrategia supera a la fuerza bruta.', unlockRequirement: 'Completar 5 pomodoros con la metodología Pareto.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
    { id: 'superacion', animal: 'rana', name: 'Superación', description: 'Enfréntate a lo más difícil de inmediato.', unlockRequirement: 'Completar 5 pomodoros con la metodología Sapo/Rana.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
    { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar 5 pomodoros con la metodología Normal.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
    { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas en comunidad.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
    { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Completar 3 pomodoros al hilo para un mismo objetivo en un día.', isUnlocked: false, unlockProgress: 0, unlockTotal: 3 }
  ]);

  // Registro de sesiones procesadas para idempotencia
  private rewardedSessions = new Set<string>();

  getCurrentUserEmail(): string {
    return localStorage.getItem('procrastina-current-user-email') || this.supabaseService.currentUser()?.email || '';
  }

  // Limpiar todas las claves residuales sueltas de localStorage
  cleanupLegacyLocalStorageKeys() {
    if (typeof localStorage === 'undefined') return;
    const email = this.getCurrentUserEmail();
    const preserved = new Set<string>([
      'procrastina-current-user-email'
    ]);
    if (email) {
      preserved.add(`user:${email}:data`);
    }

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-')) continue; // Token de autenticación de Supabase
      if (preserved.has(key)) continue;
      if (key.startsWith('focus-session-') || key.startsWith('activeObjective') || key.startsWith('campfire-pos-')) continue;
      keysToRemove.push(key);
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  }

  // Guardar paquete consolidado unificado del usuario en localStorage
  saveConsolidatedUserData() {
    const email = this.getCurrentUserEmail();
    if (!email) return;

    const bundle = {
      profile: {
        userName: this.userName(),
        profession: this.userProfession(),
        country: this.userCountry(),
        countryCode: this.userCountryCode(),
        activeDays: this.userActiveDays(),
        avatar: this.selectedAvatar(),
        theme: this.selectedTheme(),
        themeMode: this.themeMode(),
        onboardingCompleted: this.onboardingCompleted(),
        language: this.userLanguage(),
        isPremium: this.isPremium()
      },
      gamification: {
        proCoins: this.proCoins(),
        focusPoints: this.focusPoints(),
        focusTomatoes: this.focusTomatoes(),
        completedObjectives: this.completedObjectives(),
        abandonedSessions: this.abandonedSessions(),
        weeklyHonorPoints: this.weeklyHonorPoints(),
        lastWeekStart: this.lastWeekStart(),
        streak: this.streak(),
        lastFocusDate: this.lastFocusDate(),
        goldMedals: this.goldMedals(),
        silverMedals: this.silverMedals(),
        bronzeMedals: this.bronzeMedals(),
        podiumWins: this.podiumWins(),
        rewardedSessions: Array.from(this.rewardedSessions)
      },
      inventory: {
        unlockedAvatars: this.unlockedAvatars(),
        unlockedThemes: this.unlockedThemes(),
        unlockedTimers: this.unlockedTimers()
      },
      focusPreferences: this.focusPreferences(),
      capturedIdeas: this.capturedIdeas()
    };

    try {
      localStorage.setItem(`user:${email}:data`, JSON.stringify(bundle));
    } catch (e) {
      console.warn('[MembershipService] Error saving consolidated user data:', e);
    }
  }

  getFocusSetting(key: string, defaultValue: string): string {
    const prefs = this.focusPreferences();
    if (prefs && prefs[key] !== undefined && prefs[key] !== null && prefs[key] !== '') {
      return String(prefs[key]);
    }
    return defaultValue;
  }

  private focusSyncTimeout: any = null;

  setFocusSetting(key: string, value: string): void {
    this.focusPreferences.update(p => ({ ...p, [key]: value }));
    this.saveConsolidatedUserData();
    this.queueFocusPreferencesSync();
  }

  queueFocusPreferencesSync() {
    if (!this.supabaseService.isConfigured()) return;
    if (this.focusSyncTimeout) {
      clearTimeout(this.focusSyncTimeout);
    }
    this.focusSyncTimeout = setTimeout(() => {
      this.syncFocusPreferencesToSupabase();
    }, 1200);
  }

  async syncFocusPreferencesToSupabase() {
    if (!this.supabaseService.isConfigured()) return;
    const user = this.supabaseService.currentUser();
    if (!user) return;

    const prefs = {
      timer_style: this.getFocusSetting('focus-timer-style', 'digital'),
      active_background: this.getFocusSetting('focus-active-bg', 'theme_autumn'),
      background_sound: this.getFocusSetting('focus-bg-sound', 'off'),
      break_background_sound: this.getFocusSetting('focus-break-bg-sound', 'off'),
      long_break_background_sound: this.getFocusSetting('focus-long-break-bg-sound', 'off'),
      background_volume: parseFloat(this.getFocusSetting('focus-bg-volume', '1.0')),
      end_session_sound: this.getFocusSetting('focus-end-sound', 'off'),
      break_sound_enabled: this.getFocusSetting('focus-break-sound-enabled', 'false') === 'true',
      break_end_sound: this.getFocusSetting('focus-break-sound', 'off'),
      long_break_end_sound: this.getFocusSetting('focus-long-break-sound', 'off'),
      focus_duration: parseInt(this.getFocusSetting('focus-duration', '25'), 10),
      break_duration: parseInt(this.getFocusSetting('break-duration', '5'), 10),
      long_break_interval: parseInt(this.getFocusSetting('long-break-interval', '4'), 10),
      long_break_duration: parseInt(this.getFocusSetting('long-break-duration', '15'), 10),
      desktop_notifications_enabled: this.getFocusSetting('desktop-notifications-enabled', 'true') !== 'false',
      tab_notifications_enabled: this.getFocusSetting('tab-notifications-enabled', 'true') !== 'false',
      focus_notification_enabled: this.getFocusSetting('focus-notification-enabled', 'true') !== 'false',
      break_notification_enabled: this.getFocusSetting('break-notification-enabled', 'true') !== 'false',
      long_break_notification_enabled: this.getFocusSetting('long-break-notification-enabled', 'true') !== 'false',
      motivation_notification_enabled: this.getFocusSetting('motivation-notification-enabled', 'true') !== 'false',
      abandon_sound_enabled: this.getFocusSetting('abandon-sound-enabled', 'false') === 'true',
      show_battery_button_in_arena: this.getFocusSetting('show-battery-button-in-arena', 'true') !== 'false'
    };

    try {
      await this.supabaseService.updateProfile(user.id, {
        focus_preferences: prefs,
        selected_timer: prefs.timer_style
      });
    } catch (e) {
      console.warn('[MembershipService] Error sincronizando preferencias de enfoque con Supabase:', e);
    }
  }

  private gamificationSyncTimeout: any = null;

  queueGamificationSync() {
    if (!this.supabaseService.isConfigured()) return;
    const user = this.supabaseService.currentUser();
    if (!user) return;

    if (this.gamificationSyncTimeout) {
      clearTimeout(this.gamificationSyncTimeout);
    }
    this.gamificationSyncTimeout = setTimeout(async () => {
      await this.syncGamificationToSupabase();
    }, 600);
  }

  async syncGamificationToSupabase() {
    if (!this.supabaseService.isConfigured()) return;
    const user = this.supabaseService.currentUser();
    if (!user) return;

    try {
      await this.supabaseService.updateProfile(user.id, {
        focus_points: this.focusPoints(),
        pro_coins: this.proCoins(),
        focus_tomatoes: this.focusTomatoes(),
        completed_objectives: this.completedObjectives(),
        abandoned_sessions: this.abandonedSessions(),
        streak_days: this.streak()
      });
    } catch (e) {
      console.warn('[MembershipService] Error sincronizando estadísticas de gamificación con Supabase:', e);
    }
  }

  constructor() {
    // Cerrar menú de avatar al hacer click fuera
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => {
        this.closeAvatarMenu();
      });
    }

    // Limpiar claves legacy sueltas y cargar datos del usuario si existe sesión
    const email = this.getCurrentUserEmail();
    if (email) {
      this.loadUserData(email);
    } else {
      this.cleanupLegacyLocalStorageKeys();
    }

    // Cargar catálogo de artículos desde Supabase (solo en memoria)
    this.loadCatalogFromSupabase();

    // Sincronizar perfil e inventario automáticamente cuando Supabase tenga sesión activa
    effect(() => {
      const user = this.supabaseService.currentUser();
      if (user && this.supabaseService.isConfigured()) {
        if (user.email) {
          localStorage.setItem('procrastina-current-user-email', user.email);
        }
        this.supabaseService.getProfile(user.id).then(({ profile }) => {
          if (profile) {
            this.applySupabaseProfile(profile);
          }
        });
        this.supabaseService.getUnlockedItems(user.id).then(({ items, error }) => {
          if (!error && items) {
            this.applySupabaseUnlockedItems(items);
          }
        });
        this.supabaseService.getUserQualityProgress(user.id).then(({ progress, error }) => {
          if (!error && progress) {
            this.applySupabaseQualityProgress(progress);
          }
        });
        this.supabaseService.getCapturedIdeas(user.id).then(({ ideas, error }) => {
          if (!error && ideas) {
            this.capturedIdeas.set(normalizeCapturedIdeas(ideas));
          }
        });
        this.loadCatalogFromSupabase();
      }
    });

    // Sincronizar automáticamente el paquete consolidado cuando cambien las señales reactivas
    effect(() => {
      this.userName();
      this.userProfession();
      this.userCountry();
      this.userCountryCode();
      this.userActiveDays();
      this.selectedAvatar();
      this.selectedTheme();
      this.themeMode();
      this.onboardingCompleted();
      this.userLanguage();
      this.isPremium();
      this.proCoins();
      this.focusPoints();
      this.focusTomatoes();
      this.completedObjectives();
      this.abandonedSessions();
      this.weeklyHonorPoints();
      this.lastWeekStart();
      this.streak();
      this.lastFocusDate();
      this.goldMedals();
      this.silverMedals();
      this.bronzeMedals();
      this.podiumWins();
      this.unlockedAvatars();
      this.unlockedThemes();
      this.unlockedTimers();
      this.focusPreferences();
      this.capturedIdeas();

      const currentEmail = this.getCurrentUserEmail();
      if (!currentEmail) return;

      this.saveConsolidatedUserData();
      this.applyGlobalTheme();
    });
  }

  getActiveDaysSummary(): string {
    const raw = this.userActiveDays() || [];
    const days = [...raw].sort((a, b) => a - b);
    if (days.length === 0) return 'Sin días configurados';
    if (days.length === 7) return 'Lunes a Domingo';
    
    // Consecutivos Lunes a Viernes [1,2,3,4,5]
    if (days.length === 5 && days[0] === 1 && days[1] === 2 && days[2] === 3 && days[3] === 4 && days[4] === 5) {
      return 'Lunes a Viernes';
    }
    // Consecutivos Lunes a Sábado [1,2,3,4,5,6]
    if (days.length === 6 && days[0] === 1 && days[1] === 2 && days[2] === 3 && days[3] === 4 && days[4] === 5 && days[5] === 6) {
      return 'Lunes a Sábado';
    }
    // Fines de semana [6,7]
    if (days.length === 2 && days.includes(6) && days.includes(7)) {
      return 'Sábado y Domingo';
    }

    const dayNames: { [k: number]: string } = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
      7: 'Domingo'
    };

    return days.map(d => dayNames[d]).filter(Boolean).join(', ');
  }

  getTotalCompletedPomodoros(): number {
    return Array.from(this.rewardedSessions).filter(id => id.startsWith('session-')).length;
  }

  async addIdea(ideaText: string, priority: IdeaPriority = 'media') {
    if (!ideaText || !ideaText.trim()) return;
    const cleanContent = ideaText.trim();
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}`;
    const newIdea: CapturedIdea = {
      id: tempId,
      content: cleanContent,
      is_converted_to_objective: false,
      display_order: 1,
      priority: priority,
      created_at: new Date().toISOString()
    };

    this.capturedIdeas.update(list => [newIdea, ...list]);

    if (this.supabaseService.isConfigured()) {
      try {
        const res = await this.supabaseService.saveCapturedIdea(cleanContent, 1, priority);
        if (res.success && res.idea) {
          this.capturedIdeas.update(list =>
            list.map(item => item.id === tempId ? { ...res.idea!, priority: res.idea!.priority || priority } : item)
          );
        }
      } catch (err) {
        console.warn('[Supabase Idea Save Error]', err);
      }
    }
  }

  async updateIdea(idOrIndex: string | number, newContent: string, newPriority?: IdeaPriority) {
    if (!newContent || !newContent.trim()) return;
    const cleanContent = newContent.trim();
    let targetId: string | undefined;

    this.capturedIdeas.update(list => {
      if (typeof idOrIndex === 'number') {
        const item = list[idOrIndex];
        if (item) {
          targetId = item.id;
          return list.map((it, idx) => idx === idOrIndex ? { 
            ...it, 
            content: cleanContent, 
            priority: newPriority !== undefined ? newPriority : it.priority 
          } : it);
        }
        return list;
      } else {
        targetId = idOrIndex;
        return list.map(it => it.id === idOrIndex ? { 
          ...it, 
          content: cleanContent, 
          priority: newPriority !== undefined ? newPriority : it.priority 
        } : it);
      }
    });

    if (targetId && !targetId.startsWith('local-') && !targetId.startsWith('temp-') && this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.updateCapturedIdea(targetId, cleanContent, newPriority);
      } catch (err) {
        console.warn('[Supabase Idea Update Error]', err);
      }
    }
  }

  async setIdeaPriority(idOrIndex: string | number, priority: IdeaPriority) {
    let targetId: string | undefined;

    this.capturedIdeas.update(list => {
      if (typeof idOrIndex === 'number') {
        const item = list[idOrIndex];
        if (item) {
          targetId = item.id;
          return list.map((it, idx) => idx === idOrIndex ? { ...it, priority } : it);
        }
        return list;
      } else {
        targetId = idOrIndex;
        return list.map(it => it.id === idOrIndex ? { ...it, priority } : it);
      }
    });

    if (targetId && !targetId.startsWith('local-') && !targetId.startsWith('temp-') && this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.updateCapturedIdea(targetId, undefined, priority);
      } catch (err) {
        console.warn('[Supabase Idea Priority Update Error]', err);
      }
    }
  }

  async addDedicatedTimeToIdea(idOrIndex: string | number, minutes: number) {
    if (!minutes || minutes <= 0) return;
    let targetId: string | undefined;

    this.capturedIdeas.update(list => {
      if (typeof idOrIndex === 'number') {
        const item = list[idOrIndex];
        if (item) {
          targetId = item.id;
          return list.map((it, idx) => idx === idOrIndex ? { 
            ...it, 
            dedicated_minutes: (it.dedicated_minutes || 0) + minutes 
          } : it);
        }
        return list;
      } else {
        targetId = idOrIndex;
        return list.map(it => it.id === idOrIndex ? { 
          ...it, 
          dedicated_minutes: (it.dedicated_minutes || 0) + minutes 
        } : it);
      }
    });

    if (targetId && !targetId.startsWith('local-') && !targetId.startsWith('temp-') && this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.addDedicatedTimeToIdea(targetId, minutes);
      } catch (err) {
        console.warn('[Supabase Idea Dedicated Time Error]', err);
      }
    }
  }

  async completeIdea(idOrIndex: string | number) {
    let targetId: string | undefined;
    const now = new Date().toISOString();

    this.capturedIdeas.update(list => {
      if (typeof idOrIndex === 'number') {
        const item = list[idOrIndex];
        if (item) targetId = item.id;
        return list.map((it, idx) => idx === idOrIndex ? { 
          ...it, 
          is_completed: true, 
          completed_at: now 
        } : it);
      } else {
        targetId = idOrIndex;
        return list.map(it => it.id === idOrIndex ? { 
          ...it, 
          is_completed: true, 
          completed_at: now 
        } : it);
      }
    });

    if (targetId && !targetId.startsWith('local-') && !targetId.startsWith('temp-') && this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.completeCapturedIdea(targetId);
      } catch (err) {
        console.warn('[Supabase Idea Complete Error]', err);
      }
    }
  }

  async reactivateIdea(idOrIndex: string | number) {
    let targetId: string | undefined;

    this.capturedIdeas.update(list => {
      if (typeof idOrIndex === 'number') {
        const item = list[idOrIndex];
        if (item) targetId = item.id;
        return list.map((it, idx) => idx === idOrIndex ? { 
          ...it, 
          is_completed: false, 
          completed_at: undefined 
        } : it);
      } else {
        targetId = idOrIndex;
        return list.map(it => it.id === idOrIndex ? { 
          ...it, 
          is_completed: false, 
          completed_at: undefined 
        } : it);
      }
    });

    if (targetId && !targetId.startsWith('local-') && !targetId.startsWith('temp-') && this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.reactivateCapturedIdea(targetId);
      } catch (err) {
        console.warn('[Supabase Idea Reactivate Error]', err);
      }
    }
  }

  async convertIdeaToObjective(idOrIndex: string | number) {
    let targetId: string | undefined;
    const now = new Date().toISOString();

    this.capturedIdeas.update(list => {
      if (typeof idOrIndex === 'number') {
        const item = list[idOrIndex];
        if (item) targetId = item.id;
        return list.map((it, idx) => idx === idOrIndex ? { 
          ...it, 
          is_converted_to_objective: true, 
          converted_at: now 
        } : it);
      } else {
        targetId = idOrIndex;
        return list.map(it => it.id === idOrIndex ? { 
          ...it, 
          is_converted_to_objective: true, 
          converted_at: now 
        } : it);
      }
    });

    if (targetId && !targetId.startsWith('local-') && !targetId.startsWith('temp-') && this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.convertIdeaToObjective(targetId);
      } catch (err) {
        console.warn('[Supabase Convert Idea Error]', err);
      }
    }
  }

  async removeIdea(idOrIndex: string | number) {
    let targetId: string | undefined;

    this.capturedIdeas.update(list => {
      if (typeof idOrIndex === 'number') {
        const item = list[idOrIndex];
        if (item) targetId = item.id;
        return list.filter((_, idx) => idx !== idOrIndex);
      } else {
        targetId = idOrIndex;
        return list.filter(it => it.id !== idOrIndex);
      }
    });

    if (targetId && !targetId.startsWith('local-') && !targetId.startsWith('temp-') && this.supabaseService.isConfigured()) {
      try {
        await this.supabaseService.deleteCapturedIdea(targetId);
      } catch (err) {
        console.warn('[Supabase Idea Delete Error]', err);
      }
    }
  }

  async clearAllIdeas() {
    this.capturedIdeas.set([]);

    if (this.supabaseService.isConfigured()) {
      try {
        const user = await this.supabaseService.getCurrentUser();
        if (user) {
          await this.supabaseService.clearAllCapturedIdeas(user.id);
        }
      } catch (err) {
        console.warn('[Supabase Clear Ideas Error]', err);
      }
    }
  }

  // Obtener avatares dinámicamente con su estado de bloqueo actualizado
  getAvatars(): AvatarItem[] {
    return this.avatarsCatalog();
  }

  // Equipar avatar seleccionado y sincronizar en Supabase + local
  async equipAvatar(avatarId: string): Promise<boolean> {
    this.selectedAvatar.set(avatarId);
    this.ensureAvatarLoaded(avatarId);
    this.saveConsolidatedUserData();

    if (this.supabaseService.isConfigured()) {
      try {
        const user = this.supabaseService.currentUser();
        if (user) {
          await this.supabaseService.updateProfile(user.id, { selected_avatar: avatarId });
        }
      } catch (e) {
        console.warn('[MembershipService] Error persistiendo avatar seleccionado en Supabase:', e);
      }
    }
    return true;
  }

  // Persistencia en Supabase (profiles table)
  async saveSupabaseProfile(
    username: string, 
    avatarId: string, 
    country?: string, 
    countryCode?: string, 
    profession?: string, 
    activeDays?: number[],
    theme?: 'samurai' | 'cyberpunk' | 'aurora' | 'zen'
  ): Promise<{ success: boolean; error?: string }> {
    const cleanProf = profession !== undefined ? cleanQuotedString(profession) : undefined;
    
    // Si Supabase está configurado y hay usuario activo, guardar en base de datos real
    if (this.supabaseService.isConfigured()) {
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        const updates: any = {
          username,
          selected_avatar: avatarId,
          onboarding_completed: true
        };
        if (theme) updates.selected_theme = theme;
        if (country) updates.country = country;
        if (countryCode) updates.country_code = countryCode;
        if (cleanProf !== undefined) updates.profession = cleanProf;
        if (activeDays !== undefined) updates.active_days = activeDays;

        const { error } = await this.supabaseService.updateProfile(user.id, updates);
        if (error) {
          console.error('[Supabase Profile Update Error]', error);
        }
      }
    }

    this.userName.set(username);
    this.selectedAvatar.set(avatarId as any);
    if (theme) this.selectedTheme.set(theme);
    if (country) this.userCountry.set(country);
    if (countryCode) this.userCountryCode.set(countryCode);
    if (cleanProf !== undefined) this.userProfession.set(cleanProf);
    if (activeDays !== undefined) this.userActiveDays.set(activeDays);
    this.onboardingCompleted.set(true);
    this.saveConsolidatedUserData();
    this.applyGlobalTheme();

    return { success: true };
  }

  // Activar/desactivar Premium
  async setPremium(premium: boolean) {
    this.isPremium.set(premium);
    this.saveConsolidatedUserData();

    // Sincronizar estado en Supabase profiles si está conectado
    if (this.supabaseService.isConfigured()) {
      try {
        const user = this.supabaseService.currentUser();
        if (user) {
          await this.supabaseService.updateProfile(user.id, { is_premium: premium });
        }
      } catch (e) {
        console.warn('[MembershipService] Error sincronizando is_premium en Supabase:', e);
      }
    }
  }

  // Sumar puntos de enfoque (XP persistente de ranking)
  addFocusPoints(pts: number) {
    this.focusPoints.update(p => Math.max(0, p + pts));
    this.weeklyHonorPoints.update(p => Math.max(0, p + pts));
    this.saveConsolidatedUserData();
    this.queueGamificationSync();
  }

  // Sumar pro coins
  addProCoins(coins: number) {
    this.proCoins.update(c => c + coins);
    this.saveConsolidatedUserData();
    this.queueGamificationSync();
  }

  // Calcular Tomates ganados según duración:
  // < 25 min: 0 tomates
  // 25 - 44 min: 1 tomate (estándar Pomodoro)
  // 45 - 69 min: 2 tomates (alta motivación / sesión profunda)
  // >= 70 min: Math.floor((minutos + 5) / 25) tomates
  calculateTomatoesForDuration(secondsOrMinutes: number, isSeconds = true): number {
    const minutes = isSeconds ? Math.floor(secondsOrMinutes / 60) : Math.floor(secondsOrMinutes);
    if (minutes < 25) return 0;
    if (minutes < 45) return 1;
    return Math.floor((minutes + 5) / 25);
  }

  // Intentar recompensar sesión completada (idempotente)
  rewardCompletedSession(sessionId: string, isShared: boolean, actualSeconds: number = 1500, avatarId?: string): { points: number; coins: number; tomatoes: number; isNew: boolean } {
    if (this.rewardedSessions.has(sessionId)) {
      return { points: 0, coins: 0, tomatoes: 0, isNew: false };
    }

    // Registrar sesión
    this.rewardedSessions.add(sessionId);

    // Recompensa de Tomates escalonada según duración
    const tomatoesEarned = this.calculateTomatoesForDuration(actualSeconds, true);
    const isFullPomodoro = tomatoesEarned > 0;

    // Recompensa de Monedas (ProCoins):
    // < 25 min (1500 seg): Fijas 2 monedas independiente del avatar (mínimo 60 seg)
    // >= 25 min (1500 seg): Monedas configuradas en el avatar seleccionado (coins_per_pomodoro)
    const equippedAvatar = avatarId || this.selectedAvatar() || 'gato';
    const coinsEarned = actualSeconds < 1500
      ? (actualSeconds >= 60 ? 2 : 0)
      : this.getAvatarCoinsPerPomodoro(equippedAvatar);

    if (tomatoesEarned > 0) {
      this.addFocusTomatoes(tomatoesEarned);
    }
    if (coinsEarned > 0) {
      this.addProCoins(coinsEarned);
    }

    // Puntos de enfoque (XP acumulativo y persistente):
    // Regla general: 1 punto de enfoque por cada minuto completado
    const actualMinutes = Math.floor(actualSeconds / 60);
    const pointsEarned = Math.max(1, actualMinutes);
    this.addFocusPoints(pointsEarned);

    // Actualizar racha diaria únicamente si cumple el requisito de al menos 25 minutos
    this.recordPomodoroForStreak(actualSeconds);
    this.saveConsolidatedUserData();
    this.queueGamificationSync();

    return { points: pointsEarned, coins: coinsEarned, tomatoes: tomatoesEarned, isNew: true };
  }

  private readonly AVATAR_FALLBACK_STATS: Record<string, { pausePenalty: number; bossHeal: number; bossDamage: number; coinsPerPomodoro: number }> = {
    gato: { pausePenalty: 10, bossHeal: 10, bossDamage: 20, coinsPerPomodoro: 10 },
    perro: { pausePenalty: 10, bossHeal: 10, bossDamage: 20, coinsPerPomodoro: 10 },
    conejo: { pausePenalty: 10, bossHeal: 10, bossDamage: 20, coinsPerPomodoro: 10 },
    loro: { pausePenalty: 10, bossHeal: 10, bossDamage: 20, coinsPerPomodoro: 10 },
    hamster: { pausePenalty: 10, bossHeal: 10, bossDamage: 20, coinsPerPomodoro: 10 },
    raton: { pausePenalty: 10, bossHeal: 10, bossDamage: 20, coinsPerPomodoro: 10 },
    tortuga: { pausePenalty: 7, bossHeal: 14, bossDamage: 36, coinsPerPomodoro: 18 },
    tortuga_evolved: { pausePenalty: 10, bossHeal: 20, bossDamage: 52, coinsPerPomodoro: 26 },
    tortuga_phase3: { pausePenalty: 18, bossHeal: 35, bossDamage: 95, coinsPerPomodoro: 45 },
    hormiga: { pausePenalty: 7, bossHeal: 14, bossDamage: 36, coinsPerPomodoro: 18 },
    buho: { pausePenalty: 7, bossHeal: 14, bossDamage: 36, coinsPerPomodoro: 18 },
    rana: { pausePenalty: 7, bossHeal: 14, bossDamage: 36, coinsPerPomodoro: 18 },
    aguila: { pausePenalty: 7, bossHeal: 14, bossDamage: 36, coinsPerPomodoro: 18 },
    abeja: { pausePenalty: 7, bossHeal: 14, bossDamage: 36, coinsPerPomodoro: 18 },
    castor: { pausePenalty: 7, bossHeal: 14, bossDamage: 36, coinsPerPomodoro: 18 },
    zorro: { pausePenalty: 9, bossHeal: 18, bossDamage: 44, coinsPerPomodoro: 22 },
    lince: { pausePenalty: 11, bossHeal: 22, bossDamage: 52, coinsPerPomodoro: 26 },
    panda: { pausePenalty: 8, bossHeal: 16, bossDamage: 48, coinsPerPomodoro: 24 },
    oso: { pausePenalty: 12, bossHeal: 24, bossDamage: 56, coinsPerPomodoro: 28 },
    elefante: { pausePenalty: 14, bossHeal: 26, bossDamage: 60, coinsPerPomodoro: 30 },
    leon: { pausePenalty: 15, bossHeal: 28, bossDamage: 64, coinsPerPomodoro: 32 },
    tigre: { pausePenalty: 16, bossHeal: 30, bossDamage: 70, coinsPerPomodoro: 35 },
    lobo: { pausePenalty: 18, bossHeal: 32, bossDamage: 76, coinsPerPomodoro: 38 },
    dragon: { pausePenalty: 35, bossHeal: 60, bossDamage: 130, coinsPerPomodoro: 60 },
    fenix: { pausePenalty: 30, bossHeal: 50, bossDamage: 120, coinsPerPomodoro: 55 },
    grifo: { pausePenalty: 32, bossHeal: 55, bossDamage: 125, coinsPerPomodoro: 58 },
  };

  // Puntos de daño al Boss de la Comunidad aportados por el avatar (100% dinámico desde Supabase)
  getAvatarDamagePoints(avatarId: string): number {
    const item = this.catalogItems().find(i => i.id === avatarId);
    return item?.boss_damage_points ?? this.AVATAR_FALLBACK_STATS[avatarId]?.bossDamage ?? 20;
  }

  // Puntos de curación del Boss por distracción/abandono según el avatar (100% dinámico desde Supabase)
  getAvatarHealPoints(avatarId: string): number {
    const item = this.catalogItems().find(i => i.id === avatarId);
    return item?.boss_heal_points ?? this.AVATAR_FALLBACK_STATS[avatarId]?.bossHeal ?? 10;
  }

  // Monedas aportadas por cada avatar al completar un pomodoro (100% dinámico desde Supabase)
  getAvatarCoinsPerPomodoro(avatarId: string): number {
    const item = this.catalogItems().find(i => i.id === avatarId);
    return item?.coins_per_pomodoro ?? this.AVATAR_FALLBACK_STATS[avatarId]?.coinsPerPomodoro ?? 10;
  }

  // Penalización de monedas por pausa/abandono (100% dinámico desde Supabase)
  getAvatarPausePenalty(avatarId: string): number {
    const item = this.catalogItems().find(i => i.id === avatarId);
    return item?.pause_penalty_coins ?? this.AVATAR_FALLBACK_STATS[avatarId]?.pausePenalty ?? 10;
  }

  // Intentar recompensar objetivo terminado (idempotente)
  rewardCompletedObjective(objectiveId: string): { points: number; coins: number; isNew: boolean } {
    const key = `obj-reward-${objectiveId}`;
    if (this.rewardedSessions.has(key)) {
      return { points: 0, coins: 0, isNew: false };
    }

    this.rewardedSessions.add(key);
    this.completedObjectives.update(n => n + 1);

    // Recompensa persistente de +20 XP por objetivo completado
    const pointsEarned = 20;
    this.addFocusPoints(pointsEarned);

    this.saveConsolidatedUserData();
    this.queueGamificationSync();
    return { points: pointsEarned, coins: 0, isNew: true };
  }

  // Seguimiento de retos y progreso de cualidades
  trackChallengeProgress(
    methodology: 'sapo' | 'pareto' | 'normal',
    isShared: boolean,
    isObjectiveCompleted: boolean,
    objectiveText: string
  ) {
    // 1. Disciplina (Hormiga) - Completar 15 pomodoros en total.
    this.updateQualityProgress('disciplina', 1);

    // 2. Sabiduría (Búho) - Completar 5 pomodoros con Pareto.
    if (methodology === 'pareto') {
      this.updateQualityProgress('sabiduria', 1);
    }

    // 3. Superación (Rana) - Completar 5 pomodoros en Sapo y cumplido.
    if (methodology === 'sapo' && isObjectiveCompleted) {
      this.updateQualityProgress('superacion', 1);
    }

    // 4. Visión (Águila) - Completar 5 pomodoros normales.
    if (methodology === 'normal') {
      this.updateQualityProgress('vision', 1);
    }

    // 5. Colaboración (Abeja) - Completar 5 pomodoros en modo comunitario.
    if (isShared) {
      this.updateQualityProgress('colaboracion', 1);
    }

    // 6. Construcción (Castor) - Completar 3 pomodoros seguidos al mismo objetivo en un día.
    this.checkCastorProgress(objectiveText);

    // 7. Constancia (Tortuga) - Racha de 7 días (sincronizada con la racha activa).
    this.syncConstanciaQualityProgress(this.streak());
  }

  private updateQualityProgress(id: string, amount: number) {
    if (this.supabaseService.isConfigured()) {
      this.supabaseService.advanceQualityProgress(id, amount).catch(err => {
        console.warn('[Supabase Quality Advance Error]', err);
      });
    }

    this.qualitiesCatalog.update(list => {
      return list.map(q => {
        if (q.id === id && !q.isUnlocked) {
          const newProgress = Math.min(q.unlockTotal, q.unlockProgress + amount);
          const isNowUnlocked = newProgress >= q.unlockTotal;
          
          if (isNowUnlocked && !this.unlockedAvatars().includes(q.animal)) {
            // Desbloquear avatar correspondiente de forma automática
            this.unlockedAvatars.update(unlocked => [...unlocked, q.animal]);
            if (this.supabaseService.isConfigured()) {
              this.supabaseService.getCurrentUser().then(user => {
                if (user) {
                  this.supabaseService.unlockItemDirectly(user.id, q.animal);
                }
              });
            }
          }

          return {
            ...q,
            unlockProgress: newProgress,
            isUnlocked: isNowUnlocked,
            unlockedAt: isNowUnlocked ? new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined
          };
        }
        return q;
      });
    });
  }

  private checkCastorProgress(objectiveText: string) {
    if (!objectiveText || !objectiveText.trim()) return;
    const today = new Date().toLocaleDateString();
    const key = `castor-history-${today}`;
    const saved = localStorage.getItem(key);
    let history: string[] = saved ? JSON.parse(saved) : [];

    history.push(objectiveText.trim());
    localStorage.setItem(key, JSON.stringify(history));

    if (history.length >= 3) {
      const lastThree = history.slice(-3);
      if (lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
        this.updateQualityProgress('construccion', 1);
      }
    }
  }

  getIsoDayOfWeek(date: Date): number {
    const day = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    return day === 0 ? 7 : day;
  }

  getLocalDateKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseLocalDateKey(dateStr: string): Date | null {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }

  /**
   * Verifica si entre lastDateStr y targetDate se saltó algún día forzoso configurado en active_days.
   * Si en los días estrictamente intermedios hubo al menos un día forzoso sin sesión, retorna true.
   */
  isStreakBroken(
    lastDateStr: string | null | undefined,
    targetDate: Date = new Date(),
    activeDays: number[] = this.userActiveDays()
  ): boolean {
    if (!lastDateStr) return false;
    const lastDate = this.parseLocalDateKey(lastDateStr);
    if (!lastDate) return false;

    const targetMid = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    if (lastDate.getTime() >= targetMid.getTime()) {
      return false;
    }

    const effectiveActiveDays = (activeDays && activeDays.length > 0) ? activeDays : [1, 2, 3, 4, 5];
    const currentCheck = new Date(lastDate.getTime());
    currentCheck.setDate(currentCheck.getDate() + 1);

    while (currentCheck.getTime() < targetMid.getTime()) {
      const isoDow = this.getIsoDayOfWeek(currentCheck);
      if (effectiveActiveDays.includes(isoDow)) {
        return true;
      }
      currentCheck.setDate(currentCheck.getDate() + 1);
    }

    return false;
  }

  /**
   * Valida la integridad de la racha actual al iniciar o cargar perfil.
   * Si venció algún día activo obligatorio sin actividad, setea la racha en 0.
   */
  validateStreakIntegrity(): void {
    const lastDate = this.lastFocusDate();
    if (!lastDate) return;

    if (this.isStreakBroken(lastDate, new Date(), this.userActiveDays())) {
      this.streak.set(0);
      this.syncConstanciaQualityProgress(0);
      this.saveConsolidatedUserData();
    }
  }

  /**
   * Registra un pomodoro para avanzar la racha diaria.
   * Reglas:
   * 1. Requiere al menos 25 minutos (1500 segundos).
   * 2. Solo suma +1 por día calendario (mismo día no incrementa más de 1).
   * 3. Si se rompió por días forzosos intermedios, reinicia en 1 hoy.
   */
  recordPomodoroForStreak(actualDurationSeconds: number): void {
    if (actualDurationSeconds < 1500) {
      return;
    }

    const todayStr = this.getLocalDateKey(new Date());
    const lastDateStr = this.lastFocusDate();
    const activeDays = this.userActiveDays();

    let newStreak: number;

    if (!lastDateStr) {
      newStreak = 1;
    } else if (lastDateStr === todayStr) {
      newStreak = Math.max(1, this.streak());
    } else if (this.isStreakBroken(lastDateStr, new Date(), activeDays)) {
      newStreak = 1;
    } else {
      newStreak = this.streak() + 1;
    }

    this.streak.set(newStreak);
    this.lastFocusDate.set(todayStr);

    this.syncConstanciaQualityProgress(newStreak);
    this.saveConsolidatedUserData();
  }

  private syncConstanciaQualityProgress(currentStreak: number): void {
    this.qualitiesCatalog.update(list => {
      return list.map(q => {
        if (q.id === 'constancia') {
          const isNowUnlocked = currentStreak >= q.unlockTotal;
          if (isNowUnlocked && !this.unlockedAvatars().includes('tortuga')) {
            this.unlockedAvatars.update(unlocked => [...unlocked, 'tortuga']);
          }
          return {
            ...q,
            unlockProgress: Math.min(q.unlockTotal, currentStreak),
            isUnlocked: isNowUnlocked,
            unlockedAt: isNowUnlocked ? new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined
          };
        }
        return q;
      });
    });
  }

  private isDateInList(dates: string[], date: Date): boolean {
    const isoKey = this.getLocalDateKey(date);
    const localeKey = date.toLocaleDateString();
    return dates.includes(isoKey) || dates.includes(localeKey);
  }

  calculateStreak(email?: string): number {
    return this.streak();
  }

  // Desbloquear avatar
  unlockAvatar(avatar: string, cost: number): boolean {
    if (this.unlockedAvatars().includes(avatar)) return true;
    if (this.proCoins() < cost) return false;

    this.proCoins.update(c => c - cost);
    this.unlockedAvatars.update(list => [...list, avatar]);
    this.ensureAvatarLoaded(avatar);

    if (this.supabaseService.isConfigured()) {
      this.supabaseService.buyCatalogItem(avatar).then(res => {
        if (res.remainingCoins !== undefined) {
          this.proCoins.set(res.remainingCoins);
        }
      });
    }
    return true;
  }

  // Desbloquear tema
  unlockTheme(theme: string, cost: number): boolean {
    if (this.unlockedThemes().includes(theme)) return true;
    if (this.proCoins() < cost) return false;

    this.proCoins.update(c => c - cost);
    this.unlockedThemes.update(list => [...list, theme]);

    if (this.supabaseService.isConfigured()) {
      this.supabaseService.buyCatalogItem(theme).then(res => {
        if (res.remainingCoins !== undefined) {
          this.proCoins.set(res.remainingCoins);
        }
      });
    }
    return true;
  }

  // Aplicar tema y modo global en el DOM
  applyGlobalTheme() {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const mode = this.themeMode();
    const theme = this.selectedTheme();

    const toRemove: string[] = [];
    body.classList.forEach(cls => {
      if (cls.startsWith('theme-') || cls.startsWith('mode-')) {
        toRemove.push(cls);
      }
    });
    toRemove.forEach(cls => body.classList.remove(cls));

    if (mode === 'light') {
      body.classList.add('mode-light', 'theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      body.classList.add('mode-dark', `theme-${theme || 'samurai'}`);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  // Alternar entre Modo Claro y Modo Oscuro
  toggleThemeMode() {
    const nextMode = this.themeMode() === 'light' ? 'dark' : 'light';
    this.themeMode.set(nextMode);
  }

  // Fijar modo de tema explícito
  setThemeMode(mode: 'dark' | 'light') {
    this.themeMode.set(mode);
  }

  // Fijar y persistir tema visual en Supabase y localmente
  async setTheme(theme: 'samurai' | 'cyberpunk' | 'aurora' | 'zen'): Promise<boolean> {
    this.selectedTheme.set(theme);
    this.saveConsolidatedUserData();
    this.applyGlobalTheme();

    if (this.supabaseService.isConfigured()) {
      try {
        const user = this.supabaseService.currentUser() || await this.supabaseService.getCurrentUser();
        if (user) {
          const { error } = await this.supabaseService.updateProfile(user.id, { selected_theme: theme });
          if (error) {
            console.error('[MembershipService] Error persistiendo tema en Supabase:', error);
          }
        }
      } catch (e) {
        console.warn('[MembershipService] Error sincronizando tema con Supabase:', e);
      }
    }
    return true;
  }

  // Registrar un nuevo usuario (EXCLUSIVAMENTE EN SUPABASE)
  async registerUser(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !pass) {
      return { success: false, error: 'Por favor, completa todos los campos.' };
    }
    
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.includes('@')) {
      return { success: false, error: 'El correo electrónico no es válido.' };
    }

    if (pass.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    }

    if (!this.supabaseService.isConfigured()) {
      return { success: false, error: 'El servicio de base de datos no está disponible. Contacta al administrador.' };
    }

    const defaultUsername = emailLower.split('@')[0];
    const { user, error } = await this.supabaseService.signUp(emailLower, pass, defaultUsername);
    if (error) {
      return { success: false, error };
    }

    if (user) {
      localStorage.setItem('procrastina-current-user-email', emailLower);
      this.resetNewUserAccount();
      this.loadUserData(emailLower);
      // Cargar perfil e inventario inicial de Supabase de inmediato
      const { profile } = await this.supabaseService.getProfile(user.id);
      if (profile) {
        this.applySupabaseProfile(profile);
      }
      const { items } = await this.supabaseService.getUnlockedItems(user.id);
      if (items && items.length > 0) {
        this.applySupabaseUnlockedItems(items);
      }
      return { success: true };
    }

    return { success: false, error: 'No se pudo completar el registro en Supabase.' };
  }

  // Iniciar sesión (EXCLUSIVAMENTE EN SUPABASE)
  async loginUser(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !pass) {
      return { success: false, error: 'Por favor, ingresa tu correo y contraseña.' };
    }

    const emailLower = email.toLowerCase().trim();

    if (!this.supabaseService.isConfigured()) {
      return { success: false, error: 'El servicio de base de datos no está disponible. Contacta al administrador.' };
    }

    const { user, error } = await this.supabaseService.signIn(emailLower, pass);
    if (error) {
      return { success: false, error };
    }

    if (user) {
      this.resetAllSignals();
      localStorage.setItem('procrastina-current-user-email', emailLower);
      this.loadUserData(emailLower);
      // Cargar perfil desde Supabase
      const { profile } = await this.supabaseService.getProfile(user.id);
      if (profile) {
        this.applySupabaseProfile(profile);
      }
      // Cargar items desbloqueados desde Supabase
      const { items } = await this.supabaseService.getUnlockedItems(user.id);
      if (items && items.length > 0) {
        this.applySupabaseUnlockedItems(items);
      }
      // Cargar progreso de cualidades desde Supabase
      const { progress } = await this.supabaseService.getUserQualityProgress(user.id);
      if (progress && progress.length > 0) {
        this.applySupabaseQualityProgress(progress);
      }
      // Cargar ideas desde Supabase
      const { ideas } = await this.supabaseService.getCapturedIdeas(user.id);
      if (ideas) {
        this.capturedIdeas.set(normalizeCapturedIdeas(ideas));
      }
      return { success: true };
    }

    return { success: false, error: 'Las credenciales no corresponden a un usuario registrado en Supabase.' };
  }

  // Iniciar sesión con Google (Supabase OAuth)
  async loginWithGoogle(redirectTo?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabaseService.isConfigured()) {
      return { success: false, error: 'El servicio de base de datos no está disponible.' };
    }

    const { error } = await this.supabaseService.signInWithGoogle(redirectTo);
    if (error) return { success: false, error };
    return { success: true };
  }

  // Restablecer contraseña por correo electrónico
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !email.trim()) {
      return { success: false, error: 'Por favor, ingresa tu correo electrónico.' };
    }
    const emailLower = email.toLowerCase().trim();
    const result = await this.supabaseService.resetPasswordForEmail(emailLower);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al enviar correo de restablecimiento' };
    }
    return { success: true };
  }

  // Actualizar contraseña del usuario autenticado (flujo de recuperación)
  async updatePassword(password: string): Promise<{ success: boolean; error?: string }> {
    if (!password || password.trim().length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    const result = await this.supabaseService.updatePassword(password);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al actualizar la contraseña.' };
    }
    return { success: true };
  }

  // Cerrar Sesión
  async logout() {
    if (this.supabaseService.isConfigured()) {
      await this.supabaseService.signOut();
    }
    const email = this.getCurrentUserEmail();
    if (email) {
      localStorage.removeItem(`user:${email}:data`);
    }
    localStorage.removeItem('procrastina-current-user-email');
    localStorage.removeItem('procrastina-just-registered');
    this.cleanupLegacyLocalStorageKeys();
    this.resetAllSignals();
    this.closeAvatarMenu();
    this.router.navigate(['/login']);
  }

  // Sincronizar perfil completo desde Supabase a las señales
  async syncProfileFromSupabase() {
    const user = this.supabaseService.currentUser();
    if (user && this.supabaseService.isConfigured()) {
      const { profile, error } = await this.supabaseService.getProfile(user.id);
      if (!error && profile) {
        this.applySupabaseProfile(profile);
        return profile;
      }
    }
    return null;
  }

  // Aplicar datos del perfil de Supabase a las señales
  applySupabaseProfile(p: any) {
    if (!p) return;

    if (p.username) this.userName.set(p.username);
    if (p.selected_avatar) this.selectedAvatar.set(p.selected_avatar);
    if (p.selected_theme) this.selectedTheme.set(p.selected_theme);
    this.userProfession.set(p.profession ? cleanQuotedString(p.profession) : '');
    this.userCountry.set(p.country ? cleanQuotedString(p.country) : '');
    this.userCountryCode.set(p.country_code ? p.country_code : '');
    if (p.active_days) this.userActiveDays.set(p.active_days);
    if (p.last_focus_date) this.lastFocusDate.set(p.last_focus_date);
    if (p.language) {
      this.userLanguage.set(p.language);
    }
    if (p.is_premium !== undefined) this.isPremium.set(p.is_premium);

    // Supabase es la única fuente de verdad estricta para los valores de gamificación
    const serverCoins = Number(p.pro_coins ?? p.coins ?? 0);
    this.proCoins.set(serverCoins);

    const serverPoints = Number(p.focus_points ?? p.points ?? 0);
    this.focusPoints.set(serverPoints);
    this.weeklyHonorPoints.set(serverPoints);

    const serverTomatoes = Number(p.focus_tomatoes ?? p.tomatoes ?? 0);
    this.focusTomatoes.set(serverTomatoes);

    const serverObjectives = Number(p.completed_objectives ?? 0);
    this.completedObjectives.set(serverObjectives);

    const serverAbandons = Number(p.abandoned_sessions ?? 0);
    this.abandonedSessions.set(serverAbandons);

    if (p.created_at) this.userCreatedAt.set(p.created_at);

    if (p.last_focus_date) this.lastFocusDate.set(p.last_focus_date);
    const rawStreak = p.streak !== undefined ? p.streak : (p.streak_days !== undefined ? p.streak_days : this.streak());
    if (p.last_focus_date && this.isStreakBroken(p.last_focus_date, new Date(), p.active_days || this.userActiveDays())) {
      this.streak.set(0);
      this.syncConstanciaQualityProgress(0);
    } else {
      this.streak.set(rawStreak);
      this.syncConstanciaQualityProgress(rawStreak);
    }
    if (p.gold_medals !== undefined) this.goldMedals.set(p.gold_medals);
    if (p.silver_medals !== undefined) this.silverMedals.set(p.silver_medals);
    if (p.bronze_medals !== undefined) this.bronzeMedals.set(p.bronze_medals);
    if (p.onboarding_completed !== undefined) this.onboardingCompleted.set(p.onboarding_completed);

    // Restaurar preferencias de la Arena de Enfoque desde la nube (Supabase)
    if (p.focus_preferences) {
      const fp = p.focus_preferences;
      const newPrefs: Record<string, string> = { ...this.focusPreferences() };
      if (fp.timer_style) newPrefs['focus-timer-style'] = fp.timer_style;
      if (fp.active_background) newPrefs['focus-active-bg'] = fp.active_background;
      if (fp.background_sound) newPrefs['focus-bg-sound'] = fp.background_sound;
      if (fp.break_background_sound) newPrefs['focus-break-bg-sound'] = fp.break_background_sound;
      if (fp.long_break_background_sound) newPrefs['focus-long-break-bg-sound'] = fp.long_break_background_sound;
      if (fp.background_volume !== undefined) newPrefs['focus-bg-volume'] = String(fp.background_volume);
      if (fp.end_session_sound) newPrefs['focus-end-sound'] = fp.end_session_sound;
      if (fp.break_sound_enabled !== undefined) newPrefs['focus-break-sound-enabled'] = String(fp.break_sound_enabled);
      if (fp.break_end_sound) newPrefs['focus-break-sound'] = fp.break_end_sound;
      if (fp.long_break_end_sound) newPrefs['focus-long-break-sound'] = fp.long_break_end_sound;
      if (fp.focus_duration !== undefined) newPrefs['focus-duration'] = String(fp.focus_duration);
      if (fp.break_duration !== undefined) newPrefs['break-duration'] = String(fp.break_duration);
      if (fp.long_break_interval !== undefined) newPrefs['long-break-interval'] = String(fp.long_break_interval);
      if (fp.long_break_duration !== undefined) newPrefs['long-break-duration'] = String(fp.long_break_duration);
      if (fp.desktop_notifications_enabled !== undefined) newPrefs['desktop-notifications-enabled'] = String(fp.desktop_notifications_enabled);
      if (fp.tab_notifications_enabled !== undefined) newPrefs['tab-notifications-enabled'] = String(fp.tab_notifications_enabled);
      if (fp.focus_notification_enabled !== undefined) newPrefs['focus-notification-enabled'] = String(fp.focus_notification_enabled);
      if (fp.break_notification_enabled !== undefined) newPrefs['break-notification-enabled'] = String(fp.break_notification_enabled);
      if (fp.long_break_notification_enabled !== undefined) newPrefs['long-break-notification-enabled'] = String(fp.long_break_notification_enabled);
      if (fp.motivation_notification_enabled !== undefined) newPrefs['motivation-notification-enabled'] = String(fp.motivation_notification_enabled);
      if (fp.abandon_sound_enabled !== undefined) newPrefs['abandon-sound-enabled'] = String(fp.abandon_sound_enabled);
      if (fp.show_battery_button_in_arena !== undefined) newPrefs['show-battery-button-in-arena'] = String(fp.show_battery_button_in_arena);
      this.focusPreferences.set(newPrefs);
    } else if (p.selected_timer) {
      this.focusPreferences.update(pr => ({ ...pr, 'focus-timer-style': p.selected_timer }));
    }

    this.saveConsolidatedUserData();
  }

  // Cargar catálogo de artículos desde Supabase
  async loadCatalogFromSupabase() {
    if (this.supabaseService.isConfigured()) {
      const { items, error } = await this.supabaseService.getCatalogItems();
      if (!error && items && items.length > 0) {
        this.catalogItems.set(items);
      }
    }
  }

  // Obtener texto localizado según idioma del usuario ('es' o 'en')
  getLocalizedText(field?: MultilingualText | null, fallback: string = ''): string {
    if (!field) return fallback;
    const lang = this.userLanguage();
    return field[lang] || field['es'] || field['en'] || fallback;
  }

  // Aplicar items desbloqueados desde Supabase (user_unlocked_items)
  applySupabaseUnlockedItems(itemIds: string[]) {
    const catalogAvatars = this.catalogItems().filter(i => i.category === 'avatar').map(i => i.id);
    const catalogInitialAvatars = this.catalogItems().filter(i => i.category === 'avatar' && i.is_initial).map(i => i.id);
    const allKnownAvatars = Array.from(new Set([...ALL_AVATARS_LIST, ...catalogAvatars]));

    const knownThemes = ['samurai', 'cyberpunk', 'aurora', 'zen'];
    const knownTimers = ['digital', 'ring', 'line'];

    const avatars = Array.from(new Set(
      (itemIds || []).filter(id => allKnownAvatars.includes(id))
    ));

    const themes = Array.from(new Set(
      (itemIds || []).filter(id => knownThemes.includes(id))
    ));

    const timers = Array.from(new Set(
      (itemIds || []).filter(id => knownTimers.includes(id))
    ));

    const finalAvatars = Array.from(new Set([...INITIAL_AVATARS_LIST, ...catalogInitialAvatars, ...avatars]));
    const finalThemes = themes.length > 0 ? themes : ['samurai'];
    const finalTimers = timers.length > 0 ? timers : ['digital'];

    this.unlockedAvatars.set(finalAvatars);
    this.unlockedThemes.set(finalThemes);
    this.unlockedTimers.set(finalTimers);
    this.syncUnlockedAvatarUrls();

    if (this.selectedAvatar() && !finalAvatars.includes(this.selectedAvatar())) {
      this.selectedAvatar.set(finalAvatars[0] || 'gato');
    }

    this.saveConsolidatedUserData();
  }

  // Aplicar progreso de cualidades desde Supabase (user_quality_progress)
  applySupabaseQualityProgress(progress: any[]) {
    if (!progress || progress.length === 0) return;
    const progressMap = new Map(progress.map(p => [p.quality_id, p]));

    this.qualitiesCatalog.update(list => {
      return list.map(q => {
        const item: any = progressMap.get(q.id);
        if (item) {
          return {
            ...q,
            unlockProgress: item.current_progress ?? q.unlockProgress,
            isUnlocked: item.is_unlocked ?? q.isUnlocked,
            unlockedAt: item.unlocked_at ? new Date(item.unlocked_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : q.unlockedAt
          };
        }
        return q;
      });
    });
  }

  // Cargar datos de usuario
  loadUserData(email: string) {
    localStorage.setItem('procrastina-current-user-email', email);

    const bundleStr = localStorage.getItem(`user:${email}:data`);
    if (bundleStr) {
      try {
        const bundle = JSON.parse(bundleStr);
        if (bundle.profile) {
          if (bundle.profile.userName) this.userName.set(bundle.profile.userName);
          if (bundle.profile.profession) this.userProfession.set(cleanQuotedString(bundle.profile.profession));
          if (bundle.profile.country) this.userCountry.set(cleanQuotedString(bundle.profile.country));
          if (bundle.profile.countryCode) this.userCountryCode.set(bundle.profile.countryCode);
          if (bundle.profile.activeDays) this.userActiveDays.set(bundle.profile.activeDays);
          if (bundle.profile.avatar) this.selectedAvatar.set(bundle.profile.avatar);
          if (bundle.profile.theme) this.selectedTheme.set(bundle.profile.theme);
          if (bundle.profile.themeMode) this.themeMode.set(bundle.profile.themeMode);
          if (bundle.profile.onboardingCompleted !== undefined) this.onboardingCompleted.set(bundle.profile.onboardingCompleted);
          if (bundle.profile.language) this.userLanguage.set(bundle.profile.language);
          if (bundle.profile.isPremium !== undefined) this.isPremium.set(bundle.profile.isPremium);
        }
        if (bundle.gamification) {
          if (bundle.gamification.proCoins !== undefined) this.proCoins.set(bundle.gamification.proCoins);
          if (bundle.gamification.focusPoints !== undefined) this.focusPoints.set(bundle.gamification.focusPoints);
          if (bundle.gamification.focusTomatoes !== undefined) this.focusTomatoes.set(bundle.gamification.focusTomatoes);
          if (bundle.gamification.completedObjectives !== undefined) this.completedObjectives.set(bundle.gamification.completedObjectives);
          if (bundle.gamification.abandonedSessions !== undefined) this.abandonedSessions.set(bundle.gamification.abandonedSessions);
          if (bundle.gamification.weeklyHonorPoints !== undefined) this.weeklyHonorPoints.set(bundle.gamification.weeklyHonorPoints);

          if (bundle.gamification.lastWeekStart !== undefined) this.lastWeekStart.set(bundle.gamification.lastWeekStart);
          if (bundle.gamification.streak !== undefined) this.streak.set(bundle.gamification.streak);
          if (bundle.gamification.lastFocusDate !== undefined) this.lastFocusDate.set(bundle.gamification.lastFocusDate);
          if (bundle.gamification.goldMedals !== undefined) this.goldMedals.set(bundle.gamification.goldMedals);
          if (bundle.gamification.silverMedals !== undefined) this.silverMedals.set(bundle.gamification.silverMedals);
          if (bundle.gamification.bronzeMedals !== undefined) this.bronzeMedals.set(bundle.gamification.bronzeMedals);
          if (bundle.gamification.podiumWins !== undefined) this.podiumWins.set(bundle.gamification.podiumWins);
          if (bundle.gamification.rewardedSessions) this.rewardedSessions = new Set(bundle.gamification.rewardedSessions);

          // Verificar si cambió la semana para resetear los puntos semanales
          this.validateWeeklyPointsIntegrity();
        }
        if (bundle.inventory) {
          if (bundle.inventory.unlockedAvatars) this.unlockedAvatars.set(bundle.inventory.unlockedAvatars);
          if (bundle.inventory.unlockedThemes) this.unlockedThemes.set(bundle.inventory.unlockedThemes);
          if (bundle.inventory.unlockedTimers) this.unlockedTimers.set(bundle.inventory.unlockedTimers);
          this.syncUnlockedAvatarUrls();
        }
        if (bundle.focusPreferences) {
          this.focusPreferences.set({ ...DEFAULT_FOCUS_PREFERENCES, ...bundle.focusPreferences });
        }
        if (bundle.capturedIdeas) {
          this.capturedIdeas.set(normalizeCapturedIdeas(bundle.capturedIdeas));
        }

        // Validar si la racha sigue vigente o si venció algún día forzoso
        this.validateStreakIntegrity();
      } catch (e) {
        console.warn('[MembershipService] Error parsing user bundle:', e);
      }
    } else {
      this.saveConsolidatedUserData();
    }

    this.applyGlobalTheme();
    this.cleanupLegacyLocalStorageKeys();
  }

  // Reiniciar todas las señales en memoria para evitar contaminación cruzada entre sesiones
  resetAllSignals() {
    this.unlockedAvatars.set([...INITIAL_AVATARS_LIST]);
    this.unlockedThemes.set(['samurai']);
    this.unlockedTimers.set(['digital']);
    this.userName.set('Guerrero');
    this.selectedAvatar.set('gato');
    this.selectedTheme.set('samurai');
    this.themeMode.set('dark');
    this.userProfession.set('');
    this.userCountry.set('');
    this.userCountryCode.set('');
    this.userActiveDays.set([1, 2, 3, 4, 5]);
    this.proCoins.set(0);
    this.focusPoints.set(0);
    this.focusTomatoes.set(0);
    this.completedObjectives.set(0);
    this.abandonedSessions.set(0);
    this.weeklyHonorPoints.set(0);
    this.lastWeekStart.set(this.getCurrentMondayString());
    this.streak.set(0);
    this.lastFocusDate.set('');
    this.goldMedals.set(0);
    this.silverMedals.set(0);
    this.bronzeMedals.set(0);
    this.podiumWins.set(0);
    this.onboardingCompleted.set(true);
    this.rewardedSessions.clear();
    this.focusPreferences.set({ ...DEFAULT_FOCUS_PREFERENCES });
    this.capturedIdeas.set([]);

    // Reestablecer cualidades
    this.qualitiesCatalog.set([
      { id: 'constancia', animal: 'tortuga', name: 'Constancia', description: 'Cada día cuenta.', unlockRequirement: 'Mantener una racha de 7 días consecutivos.', isUnlocked: false, unlockProgress: 0, unlockTotal: 7 },
      { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar 15 pomodoros en total.', isUnlocked: false, unlockProgress: 0, unlockTotal: 15 },
      { id: 'sabiduria', animal: 'buho', name: 'Sabiduría', description: 'La estrategia supera a la fuerza bruta.', unlockRequirement: 'Completar 5 pomodoros con la metodología Pareto.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
      { id: 'superacion', animal: 'rana', name: 'Superación', description: 'Enfréntate a lo más difícil de inmediato.', unlockRequirement: 'Completar 5 pomodoros con la metodología Sapo/Rana.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
      { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar 5 pomodoros con la metodología Normal.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
      { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas en comunidad.', isUnlocked: false, unlockProgress: 0, unlockTotal: 5 },
      { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Completar 3 pomodoros al hilo para un mismo objetivo en un día.', isUnlocked: false, unlockProgress: 0, unlockTotal: 3 }
    ]);
  }

  // Restablecer cuenta para nuevo registro desde cero
  resetNewUserAccount() {
    const email = this.getCurrentUserEmail();
    this.resetAllSignals();
    if (email) {
      this.userName.set(email.split('@')[0]);
    }
    this.saveConsolidatedUserData();
    this.applyGlobalTheme();
    this.cleanupLegacyLocalStorageKeys();
  }

  // Auxiliares globales para avatars
  getAvatarNameById(id: string): string {
    const item = this.catalogItems().find(i => i.id === id);
    if (item) {
      const lang = this.userLanguage();
      return item.name?.[lang] || item.name?.['es'] || id;
    }
    return id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Guardián';
  }

  getAvatarColorById(id: string): string {
    const item = this.catalogItems().find(i => i.id === id);
    return item?.color || '#10b981';
  }

  getAvatarIconById(id: string): string {
    const icons: { [key: string]: string } = {
      gato: 'fa-cat', perro: 'fa-dog', conejo: 'fa-rabbit', loro: 'fa-dove',
      tortuga: 'fa-turtle', hormiga: 'fa-bug', buho: 'fa-owl', rana: 'fa-frog',
      aguila: 'fa-dove', abeja: 'fa-bee', castor: 'fa-paw', dragon: 'fa-dragon',
      fenix: 'fa-fire', grifo: 'fa-crow'
    };
    return icons[id] || 'fa-paw';
  }

  getSelectedAvatarIcon(): string {
    const current = this.selectedAvatar();
    if (['buho', 'aguila', 'fenix', 'grifo'].includes(current)) return 'fa-crow';
    if (['panda'].includes(current)) return 'fa-spa';
    if (current === 'dragon') return 'fa-dragon';
    return 'fa-paw';
  }

  getSelectedAvatarName(): string {
    return this.getAvatarNameById(this.selectedAvatar());
  }

  getEmoji(id: string): string {
    switch (id) {
      case 'lobo': return '🐺';
      case 'zorro': return '🦊';
      case 'buho': return '🦉';
      case 'lince': return '🦌';
      case 'panda': return '🐼';
      case 'oso': return '🐻';
      case 'leon': return '🦁';
      case 'tigre': return '🐯';
      case 'dragon': return '🐉';
      case 'fenix': return '🔥';
      case 'grifo': return '🦅';
      case 'tortuga': return '🐢';
      case 'abeja': return '🐝';
      case 'castor': return '🦫';
      case 'aguila': return '🦅';
      case 'hormiga': return '🐜';
      case 'elefante': return '🐘';
      case 'gato': return '🐱';
      case 'perro': return '🐶';
      case 'conejo': return '🐰';
      case 'loro': return '🦜';
      case 'hamster': return '🐹';
      case 'raton': return '🐭';
      case 'rana': return '🐸';
      default: return '🐾';
    }
  }

  getSelectedAvatarEmoji(): string {
    return this.getEmoji(this.selectedAvatar());
  }

  getAvatarTitle(id: string): string {
    switch (id) {
      case 'lobo': return 'Samurái';
      case 'zorro': return 'Ninja';
      case 'buho': return 'Estratega';
      case 'lince': return 'Explorador';
      case 'panda': return 'Zen';
      case 'oso': return 'Fuerte';
      case 'leon': return 'Shogun';
      case 'tigre': return 'Guerrero Feroz';
      case 'elefante': return 'Sabio';
      case 'dragon': return 'Señor del Ego';
      case 'fenix': return 'Inmortal';
      case 'grifo': return 'Guardián Celestial';
      case 'hamster': return 'Veloz';
      case 'raton': return 'Astuto';
      case 'rana': return 'Saltarina';
      case 'gato': return 'Lancero';
      case 'perro': return 'Guardián';
      case 'conejo': return 'Ágil';
      case 'loro': return 'Alado';
      default: return 'Guerrero';
    }
  }

  // Desbloquear un cronómetro con Pro Coins
  unlockTimerWithCoins(timerId: string, cost: number = 100): boolean {
    if (this.unlockedTimers().includes(timerId)) return true;
    if (this.proCoins() >= cost) {
      this.proCoins.update(c => c - cost);
      this.unlockedTimers.update(t => [...t, timerId]);
      return true;
    }
    return false;
  }
}
