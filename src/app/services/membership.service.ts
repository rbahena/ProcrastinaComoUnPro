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

function getUserKeyStatic(key: string): string {
  const email = localStorage.getItem('procrastina-current-user-email') || '';
  return email ? `user:${email}:${key}` : `procrastina-${key}`;
}

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

function getMigratedValue(key: string, defaultValue: string): string {
  const userKey = getUserKeyStatic(key);
  const userVal = localStorage.getItem(userKey);
  if (userVal !== null) {
    if (key === 'pro-coins' && userVal === '999999') return defaultValue;
    if (key === 'focus-tomatoes' && userVal === '100') return defaultValue;
    if (key === 'focus-points' && userVal === '10000') return defaultValue;
    if (key === 'streak' && userVal === '7') return defaultValue;
    return userVal;
  }
  // No migrar valores antiguos residuales de profesión ni país
  if (key === 'user-profession' || key === 'user-country' || key === 'user-country-code') {
    return defaultValue;
  }
  const globalKey = `procrastina-${key}`;
  const globalVal = localStorage.getItem(globalKey);
  if (globalVal !== null) {
    if (key === 'pro-coins' && globalVal === '999999') return defaultValue;
    if (key === 'focus-tomatoes' && globalVal === '100') return defaultValue;
    if (key === 'focus-points' && globalVal === '10000') return defaultValue;
    if (key === 'streak' && globalVal === '7') return defaultValue;
    localStorage.setItem(userKey, globalVal);
    return globalVal;
  }
  return defaultValue;
}

function getMigratedValueJSON<T>(key: string, defaultValue: T, legacyKeyPrefix = 'procrastina-'): T {
  const userKey = getUserKeyStatic(key);
  const userVal = localStorage.getItem(userKey);
  if (userVal !== null) {
    try {
      return JSON.parse(userVal);
    } catch (e) {
      return defaultValue;
    }
  }
  // No migrar desbloqueables antiguos residuales para que usuarios nuevos comiencen estrictamente con los comunes
  if (key === 'unlocked-avatars' || key === 'unlocked-themes' || key === 'unlocked-timers') {
    return defaultValue;
  }
  const legacyKey = key === 'captured-ideas' ? 'captured-ideas' : `${legacyKeyPrefix}${key}`;
  const globalVal = localStorage.getItem(legacyKey);
  if (globalVal !== null) {
    try {
      const parsed = JSON.parse(globalVal);
      localStorage.setItem(userKey, globalVal);
      return parsed;
    } catch (e) {}
  }
  return defaultValue;
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
  focusPoints = signal<number>(
    parseInt(getMigratedValue('focus-points', '0'), 10)
  );

  // Pro Coins
  proCoins = signal<number>(
    parseInt(getMigratedValue('pro-coins', '0'), 10)
  );

  // Tomates de enfoque (1 por sesión de concentración)
  focusTomatoes = signal<number>(
    parseInt(getMigratedValue('focus-tomatoes', '0'), 10)
  );

  // Racha de días de enfoque
  streak = signal<number>(
    parseInt(getMigratedValue('streak', '0'), 10)
  );

  addFocusTomatoes(tomatoes: number) {
    this.focusTomatoes.update(t => t + tomatoes);
  }

  // Cosméticos desbloqueados (Todos los avatares, temas y relojes 100% desbloqueados)
  unlockedAvatars = signal<string[]>(ALL_AVATARS_LIST);
  unlockedThemes = signal<string[]>(['samurai', 'cyberpunk', 'aurora', 'zen']);
  unlockedTimers = signal<string[]>([
    'digital', 'ring', 'line', 'fire', 'hourglass', 'ice', 'battery', 
    'solar', 'satellite', 'moon', 'titanic', 'lighthouse', 'airplane'
  ]);

  // Perfil del usuario
  userName = signal<string>(
    getMigratedValue('user-name', 'Guerrero')
  );
  userProfession = signal<string>(
    cleanQuotedString(getMigratedValue('user-profession', ''))
  );
  // Días activos de la semana (1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb, 7: Dom)
  userActiveDays = signal<number[]>(
    getMigratedValueJSON('user-active-days', [1, 2, 3, 4, 5])
  );
  userCountry = signal<string>(
    cleanQuotedString(getMigratedValue('user-country', ''))
  );
  userCountryCode = signal<string>(
    getMigratedValue('user-country-code', '')
  );
  selectedAvatar = signal<string>(
    getMigratedValue('avatar', 'gato')
  );
  selectedTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>(
    getMigratedValue('theme', 'samurai') as any
  );
  themeMode = signal<'dark' | 'light'>(
    (getMigratedValue('theme-mode', 'dark') as any) === 'light' ? 'light' : 'dark'
  );

  // Medallas ganadas en podios
  podiumWins = signal<number>(
    parseInt(getMigratedValue('podium-wins', '0'), 10)
  );
  goldMedals = signal<number>(
    parseInt(getMigratedValue('gold-medals', '0'), 10)
  );
  silverMedals = signal<number>(
    parseInt(getMigratedValue('silver-medals', '0'), 10)
  );
  bronzeMedals = signal<number>(
    parseInt(getMigratedValue('bronze-medals', '0'), 10)
  );

  // Estado de onboarding completado (por defecto true para comenzar de inmediato)
  onboardingCompleted = signal<boolean>(
    getMigratedValue('onboarding-completed', 'true') !== 'false'
  );

  // Control global para abrir el modal de configuración de identidad
  showSettingsModal = signal<boolean>(false);

  // Idioma de la interfaz ('es' por defecto o 'en')
  userLanguage = signal<'es' | 'en'>(
    (localStorage.getItem('procrastina-language') as any) || 'es'
  );

  // Ideas capturadas durante sesiones de enfoque
  capturedIdeas = signal<CapturedIdea[]>(
    normalizeCapturedIdeas(getMigratedValueJSON('captured-ideas', []))
  );

  // Contador de ideas y tareas pendientes (no completadas)
  pendingCapturedIdeasCount = computed(() =>
    this.capturedIdeas().filter(i => !i.is_completed).length
  );

  // Catálogo dinámico cargado desde Supabase
  catalogItems = signal<CatalogItem[]>(
    getMigratedValueJSON<CatalogItem[]>('catalog-cache', [])
  );

  // Catálogo completo de avatares disponibles (generado dinámicamente desde Supabase)
  avatarsCatalog = computed<AvatarItem[]>(() => {
    const items = this.catalogItems().filter(i => i.category === 'avatar');
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

  // Catálogo completo de Cualidades (100% Desbloqueadas)
  qualitiesCatalog = signal<QualityItem[]>([
    { id: 'constancia', animal: 'tortuga', name: 'Constancia', description: 'Cada día cuenta.', unlockRequirement: 'Mantener una racha de 7 días consecutivos.', isUnlocked: true, unlockProgress: 7, unlockTotal: 7 },
    { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar 15 pomodoros en total.', isUnlocked: true, unlockProgress: 15, unlockTotal: 15 },
    { id: 'sabiduria', animal: 'buho', name: 'Sabiduría', description: 'La estrategia supera a la fuerza bruta.', unlockRequirement: 'Completar 5 pomodoros con la metodología Pareto.', isUnlocked: true, unlockProgress: 5, unlockTotal: 5 },
    { id: 'superacion', animal: 'rana', name: 'Superación', description: 'Enfréntate a lo más difícil de inmediato.', unlockRequirement: 'Completar 5 pomodoros con la metodología Sapo/Rana.', isUnlocked: true, unlockProgress: 5, unlockTotal: 5 },
    { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar 5 pomodoros con la metodología Normal.', isUnlocked: true, unlockProgress: 5, unlockTotal: 5 },
    { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas en comunidad.', isUnlocked: true, unlockProgress: 5, unlockTotal: 5 },
    { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Completar 3 pomodoros al hilo para un mismo objetivo en un día.', isUnlocked: true, unlockProgress: 3, unlockTotal: 3 }
  ]);

  // Registro de sesiones procesadas para idempotencia
  private rewardedSessions = new Set<string>(
    getMigratedValueJSON('rewarded-sessions', [] as string[])
  );

  private getCurrentUserEmail(): string {
    return localStorage.getItem('procrastina-current-user-email') || this.supabaseService.currentUser()?.email || '';
  }

  constructor() {
    // Cerrar menú de avatar al hacer click fuera
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => {
        this.closeAvatarMenu();
      });
    }

    // Calcular la racha inicial
    const email = this.getCurrentUserEmail();
    this.streak.set(this.calculateStreak(email));

    // Desbloquear incondicionalmente todo lo Premium y personalizaciones cosméticas
    this.isPremium.set(true);
    this.unlockedAvatars.set(ALL_AVATARS_LIST);
    this.unlockedThemes.set(['samurai', 'cyberpunk', 'aurora', 'zen']);
    this.unlockedTimers.set([
      'digital', 'ring', 'line', 'fire', 'hourglass', 'ice', 'battery', 
      'solar', 'satellite', 'moon', 'titanic', 'lighthouse', 'airplane'
    ]);

    // Persistir desbloqueo cosmético en localStorage
    localStorage.setItem('procrastina-premium', 'true');
    localStorage.setItem('procrastina-unlocked-avatars', JSON.stringify(ALL_AVATARS_LIST));
    localStorage.setItem('procrastina-unlocked-themes', JSON.stringify(['samurai', 'cyberpunk', 'aurora', 'zen']));
    localStorage.setItem('procrastina-unlocked-timers', JSON.stringify([
      'digital', 'ring', 'line', 'fire', 'hourglass', 'ice', 'battery', 
      'solar', 'satellite', 'moon', 'titanic', 'lighthouse', 'airplane'
    ]));
    if (email) {
      localStorage.setItem(`user:${email}:premium`, 'true');
      localStorage.setItem(`user:${email}:unlocked-avatars`, JSON.stringify(ALL_AVATARS_LIST));
      localStorage.setItem(`user:${email}:unlocked-themes`, JSON.stringify(['samurai', 'cyberpunk', 'aurora', 'zen']));
      localStorage.setItem(`user:${email}:unlocked-timers`, JSON.stringify([
        'digital', 'ring', 'line', 'fire', 'hourglass', 'ice', 'battery', 
        'solar', 'satellite', 'moon', 'titanic', 'lighthouse', 'airplane'
      ]));
    }

    // Cargar catálogo de artículos desde Supabase
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

    // Sincronizar automáticamente con localStorage al cambiar valores
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.isPremium());
      localStorage.setItem('procrastina-premium', val);
      if (email) localStorage.setItem(`user:${email}:premium`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.focusPoints());
      localStorage.setItem('procrastina-focus-points', val);
      if (email) localStorage.setItem(`user:${email}:focus-points`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.proCoins());
      localStorage.setItem('procrastina-pro-coins', val);
      if (email) localStorage.setItem(`user:${email}:pro-coins`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.focusTomatoes());
      localStorage.setItem('procrastina-focus-tomatoes', val);
      if (email) localStorage.setItem(`user:${email}:focus-tomatoes`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.streak());
      localStorage.setItem('procrastina-streak', val);
      if (email) localStorage.setItem(`user:${email}:streak`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = JSON.stringify(this.unlockedAvatars());
      localStorage.setItem('procrastina-unlocked-avatars', val);
      if (email) localStorage.setItem(`user:${email}:unlocked-avatars`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = JSON.stringify(this.unlockedThemes());
      localStorage.setItem('procrastina-unlocked-themes', val);
      if (email) localStorage.setItem(`user:${email}:unlocked-themes`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = JSON.stringify(this.unlockedTimers());
      localStorage.setItem('procrastina-unlocked-timers', val);
      if (email) localStorage.setItem(`user:${email}:unlocked-timers`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = this.userName();
      localStorage.setItem('procrastina-user-name', val);
      if (email) localStorage.setItem(`user:${email}:user-name`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = cleanQuotedString(this.userProfession());
      localStorage.setItem('procrastina-user-profession', val);
      if (email) localStorage.setItem(`user:${email}:user-profession`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = JSON.stringify(this.userActiveDays());
      localStorage.setItem('procrastina-user-active-days', val);
      if (email) localStorage.setItem(`user:${email}:user-active-days`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = this.userCountry();
      localStorage.setItem('procrastina-user-country', val);
      if (email) localStorage.setItem(`user:${email}:user-country`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = this.userCountryCode();
      localStorage.setItem('procrastina-user-country-code', val);
      if (email) localStorage.setItem(`user:${email}:user-country-code`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = this.selectedAvatar();
      localStorage.setItem('procrastina-avatar', val);
      if (email) localStorage.setItem(`user:${email}:avatar`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = this.selectedTheme();
      localStorage.setItem('procrastina-theme', val);
      if (email) localStorage.setItem(`user:${email}:theme`, val);
      this.applyGlobalTheme();
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = this.themeMode();
      localStorage.setItem('procrastina-theme-mode', val);
      if (email) localStorage.setItem(`user:${email}:theme-mode`, val);
      this.applyGlobalTheme();
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.onboardingCompleted());
      localStorage.setItem('procrastina-onboarding-completed', val);
      if (email) localStorage.setItem(`user:${email}:onboarding-completed`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = JSON.stringify(this.capturedIdeas());
      localStorage.setItem('captured-ideas', val);
      if (email) localStorage.setItem(`user:${email}:captured-ideas`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.goldMedals());
      localStorage.setItem('procrastina-gold-medals', val);
      if (email) localStorage.setItem(`user:${email}:gold-medals`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.silverMedals());
      localStorage.setItem('procrastina-silver-medals', val);
      if (email) localStorage.setItem(`user:${email}:silver-medals`, val);
    });
    effect(() => {
      const email = this.getCurrentUserEmail();
      const val = String(this.bronzeMedals());
      localStorage.setItem('procrastina-bronze-medals', val);
      if (email) localStorage.setItem(`user:${email}:bronze-medals`, val);
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

  // Persistencia en Supabase (profiles table)
  async saveSupabaseProfile(username: string, avatarId: string, country?: string, countryCode?: string, profession?: string, activeDays?: number[]): Promise<{ success: boolean; error?: string }> {
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
    if (country) this.userCountry.set(country);
    if (countryCode) this.userCountryCode.set(countryCode);
    if (cleanProf !== undefined) this.userProfession.set(cleanProf);
    if (activeDays !== undefined) this.userActiveDays.set(activeDays);
    this.onboardingCompleted.set(true);

    return { success: true };
  }

  // Activar/desactivar Premium (Mantiene 100% transparentes los tomates, rachas y monedas acumuladas)
  async setPremium(premium: boolean) {
    this.isPremium.set(premium);
    const email = this.getCurrentUserEmail();
    const val = String(premium);
    localStorage.setItem('procrastina-premium', val);
    if (email) localStorage.setItem(`user:${email}:premium`, val);

    if (premium) {
      // Regalo de bienvenida solo para cuentas completamente nuevas sin actividad
      if (this.focusPoints() === 0 && this.proCoins() === 0) {
        this.addFocusPoints(200);
        this.addProCoins(100);
      }
    }

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

  // Sumar puntos de enfoque
  addFocusPoints(pts: number) {
    this.focusPoints.update(p => Math.max(0, p + pts));
  }

  // Sumar pro coins
  addProCoins(coins: number) {
    this.proCoins.update(c => c + coins);
  }

  // Intentar recompensar sesión completada (idempotente)
  rewardCompletedSession(sessionId: string, isShared: boolean): { points: number; coins: number; tomatoes: number; isNew: boolean } {
    if (this.rewardedSessions.has(sessionId)) {
      return { points: 0, coins: 0, tomatoes: 0, isNew: false };
    }

    // Registrar sesión
    this.rewardedSessions.add(sessionId);
    const email = this.getCurrentUserEmail();
    const userKey = getUserKeyStatic('rewarded-sessions');
    localStorage.setItem(
      userKey,
      JSON.stringify(Array.from(this.rewardedSessions))
    );
    if (email) {
      localStorage.setItem(
        `user:${email}:rewarded-sessions`,
        JSON.stringify(Array.from(this.rewardedSessions))
      );
    }

    // Recompensa: 1 tomate y 1 moneda por periodo de concentración completado
    const tomatoesEarned = 1;
    const coinsEarned = 1;
    this.addFocusTomatoes(tomatoesEarned);
    this.addProCoins(coinsEarned);

    let pointsEarned = 0;
    if (this.isPremium()) {
      pointsEarned = 10;
      this.addFocusPoints(pointsEarned);
    }

    return { points: pointsEarned, coins: coinsEarned, tomatoes: tomatoesEarned, isNew: true };
  }

  // Monedas aportadas por cada avatar al completar un pomodoro (referencia)
  getAvatarCoinsPerPomodoro(avatarId: string): number {
    switch (avatarId) {
      case 'dragon': return 25;
      case 'grifo': return 24;
      case 'fenix': return 22;
      case 'lobo': return 16;
      case 'leon': case 'tigre': return 15;
      case 'oso': case 'elefante': return 14;
      case 'zorro': case 'lince': case 'panda': return 12;
      case 'buho': case 'aguila': case 'abeja': return 9;
      case 'tortuga': case 'hormiga': case 'rana': case 'castor': return 8;
      case 'conejo': case 'hamster': return 6;
      default: return 5;
    }
  }

  // Intentar recompensar objetivo terminado (idempotente)
  rewardCompletedObjective(objectiveId: string): { points: number; coins: number; isNew: boolean } {
    const key = `obj-reward-${objectiveId}`;
    if (this.rewardedSessions.has(key)) {
      return { points: 0, coins: 0, isNew: false };
    }

    this.rewardedSessions.add(key);
    const email = this.getCurrentUserEmail();
    const userKey = getUserKeyStatic('rewarded-sessions');
    localStorage.setItem(
      userKey,
      JSON.stringify(Array.from(this.rewardedSessions))
    );
    if (email) {
      localStorage.setItem(
        `user:${email}:rewarded-sessions`,
        JSON.stringify(Array.from(this.rewardedSessions))
      );
    }

    // Monedas por objetivo completado (0 monedas adicionales para mantener 1 moneda por pomodoro)
    const coinsEarned = 0;

    let pointsEarned = 0;
    if (this.isPremium()) {
      pointsEarned = 30;
      this.addFocusPoints(pointsEarned);
    }

    return { points: pointsEarned, coins: coinsEarned, isNew: true };
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

    // 7. Constancia (Tortuga) - Racha de 7 días.
    this.updateStreakProgress();
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

  private getLocalDateKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isDateInList(dates: string[], date: Date): boolean {
    const isoKey = this.getLocalDateKey(date);
    const localeKey = date.toLocaleDateString();
    return dates.includes(isoKey) || dates.includes(localeKey);
  }

  private updateStreakProgress() {
    const email = this.getCurrentUserEmail();
    const key = getUserKeyStatic('streak-dates');
    const savedDates = localStorage.getItem(key);
    let dates: string[] = savedDates ? JSON.parse(savedDates) : [];

    const today = new Date();
    const todayStr = this.getLocalDateKey(today);
    if (!this.isDateInList(dates, today)) {
      dates.push(todayStr);
      localStorage.setItem(key, JSON.stringify(dates));
      if (email) {
        localStorage.setItem(`user:${email}:streak-dates`, JSON.stringify(dates));
      }
    }

    const currentStreak = this.calculateStreakFromDates(dates);
    this.streak.set(currentStreak);

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

  calculateStreakFromDates(dates: string[]): number {
    if (!dates || dates.length === 0) return 0;

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const hasToday = this.isDateInList(dates, today);
    const hasYesterday = this.isDateInList(dates, yesterday);

    // Si hoy no se ha enfocado y ayer tampoco, la racha activa es 0
    if (!hasToday && !hasYesterday) {
      return 0;
    }

    let currentStreak = 0;
    let checkDate = new Date();

    // Si hoy aún no se ha enfocado pero ayer sí, contamos la racha acumulada hasta ayer
    if (!hasToday && hasYesterday) {
      checkDate = yesterday;
    }

    while (true) {
      if (this.isDateInList(dates, checkDate)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return currentStreak;
  }

  calculateStreak(email?: string): number {
    const activeEmail = email || this.getCurrentUserEmail();
    const key = activeEmail ? `user:${activeEmail}:streak-dates` : getUserKeyStatic('streak-dates');
    const savedDates = localStorage.getItem(key);
    if (!savedDates) return 0;
    try {
      const dates: string[] = JSON.parse(savedDates);
      return this.calculateStreakFromDates(dates);
    } catch (e) {
      return 0;
    }
  }

  // Desbloquear avatar
  unlockAvatar(avatar: string, cost: number): boolean {
    if (this.unlockedAvatars().includes(avatar)) return true;
    if (this.proCoins() < cost) return false;

    this.proCoins.update(c => c - cost);
    this.unlockedAvatars.update(list => [...list, avatar]);

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
  async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!this.supabaseService.isConfigured()) {
      return { success: false, error: 'El servicio de base de datos no está disponible.' };
    }

    const { error } = await this.supabaseService.signInWithGoogle();
    if (error) return { success: false, error };
    return { success: true };
  }

  // Cerrar Sesión
  async logout() {
    if (this.supabaseService.isConfigured()) {
      await this.supabaseService.signOut();
    }
    localStorage.removeItem('procrastina-current-user-email');
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
    if (p.username) this.userName.set(p.username);
    if (p.selected_avatar) this.selectedAvatar.set(p.selected_avatar);
    if (p.selected_theme) this.selectedTheme.set(p.selected_theme);
    this.userProfession.set(p.profession ? cleanQuotedString(p.profession) : '');
    this.userCountry.set(p.country ? cleanQuotedString(p.country) : '');
    this.userCountryCode.set(p.country_code ? p.country_code : '');
    if (p.active_days) this.userActiveDays.set(p.active_days);
    if (p.language) {
      this.userLanguage.set(p.language);
      localStorage.setItem('procrastina-language', p.language);
    }
    if (p.is_premium !== undefined) this.isPremium.set(p.is_premium);
    if (p.pro_coins !== undefined) this.proCoins.set(p.pro_coins);
    if (p.focus_points !== undefined) this.focusPoints.set(p.focus_points);
    if (p.focus_tomatoes !== undefined) this.focusTomatoes.set(p.focus_tomatoes);
    if (p.streak_days !== undefined) this.streak.set(p.streak_days);
    if (p.gold_medals !== undefined) this.goldMedals.set(p.gold_medals);
    if (p.silver_medals !== undefined) this.silverMedals.set(p.silver_medals);
    if (p.bronze_medals !== undefined) this.bronzeMedals.set(p.bronze_medals);
    if (p.onboarding_completed !== undefined) this.onboardingCompleted.set(p.onboarding_completed);
  }

  // Cargar catálogo de artículos desde Supabase
  async loadCatalogFromSupabase() {
    if (this.supabaseService.isConfigured()) {
      const { items, error } = await this.supabaseService.getCatalogItems();
      if (!error && items && items.length > 0) {
        this.catalogItems.set(items);
        localStorage.setItem('procrastina-catalog-cache', JSON.stringify(items));
      } else {
        const cached = localStorage.getItem('procrastina-catalog-cache');
        if (cached) {
          try {
            this.catalogItems.set(JSON.parse(cached));
          } catch (e) {}
        }
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
    const allKnownAvatars = ALL_AVATARS_LIST;
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

    // Si Supabase no tiene nada, mantener al menos el gato básico como fallback
    const finalAvatars = avatars.length > 0 ? avatars : ['gato'];
    const finalThemes = themes.length > 0 ? themes : ['samurai'];
    const finalTimers = timers.length > 0 ? timers : ['digital'];

    this.unlockedAvatars.set(finalAvatars);
    this.unlockedThemes.set(finalThemes);
    this.unlockedTimers.set(finalTimers);

    if (!finalAvatars.includes(this.selectedAvatar())) {
      this.selectedAvatar.set(finalAvatars[0] || 'gato');
    }

    const email = this.getCurrentUserEmail();
    if (email) {
      localStorage.setItem(`user:${email}:unlocked-avatars`, JSON.stringify(finalAvatars));
      localStorage.setItem(`user:${email}:unlocked-themes`, JSON.stringify(finalThemes));
      localStorage.setItem(`user:${email}:unlocked-timers`, JSON.stringify(finalTimers));
    }
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

    // Leer valores de localStorage con su prefijo, o usar valores por defecto limpios
    const isPremiumVal = localStorage.getItem(`user:${email}:premium`) === 'true';
    const focusPointsVal = parseInt(localStorage.getItem(`user:${email}:focus-points`) || '0', 10);
    const proCoinsVal = parseInt(localStorage.getItem(`user:${email}:pro-coins`) || '0', 10);
    const focusTomatoesVal = parseInt(localStorage.getItem(`user:${email}:focus-tomatoes`) || '0', 10);

    let mergedUnlockedAvatars: string[];
    const storedAvatars = localStorage.getItem(`user:${email}:unlocked-avatars`);
    if (storedAvatars) {
      try {
        const parsed = JSON.parse(storedAvatars);
        if (Array.isArray(parsed) && parsed.length > 0) {
          mergedUnlockedAvatars = Array.from(new Set(parsed));
        } else {
          mergedUnlockedAvatars = [...INITIAL_AVATARS_LIST];
        }
      } catch {
        mergedUnlockedAvatars = [...INITIAL_AVATARS_LIST];
      }
    } else {
      mergedUnlockedAvatars = [...INITIAL_AVATARS_LIST];
      localStorage.setItem(`user:${email}:unlocked-avatars`, JSON.stringify(mergedUnlockedAvatars));
    }

    const unlockedThemesVal = JSON.parse(localStorage.getItem(`user:${email}:unlocked-themes`) || '["samurai"]');
    const userNameVal = localStorage.getItem(`user:${email}:user-name`) || email.split('@')[0];
    let selectedAvatarVal = localStorage.getItem(`user:${email}:avatar`) || 'gato';
    if (!mergedUnlockedAvatars.includes(selectedAvatarVal)) {
      selectedAvatarVal = 'gato';
    }
    const selectedThemeVal = (localStorage.getItem(`user:${email}:theme`) as any) || 'samurai';
    const themeModeVal = (localStorage.getItem(`user:${email}:theme-mode`) as 'dark' | 'light') || (localStorage.getItem('procrastina-theme-mode') as 'dark' | 'light') || 'dark';
    const userProfessionVal = localStorage.getItem(`user:${email}:user-profession`);
    const userCountryVal = localStorage.getItem(`user:${email}:user-country`);
    const userCountryCodeVal = localStorage.getItem(`user:${email}:user-country-code`);
    const userActiveDaysVal = JSON.parse(localStorage.getItem(`user:${email}:user-active-days`) || '[1, 2, 3, 4, 5]');
    const podiumWinsVal = parseInt(localStorage.getItem(`user:${email}:podium-wins`) || '0', 10);
    const onboardingCompletedVal = localStorage.getItem(`user:${email}:onboarding-completed`) !== 'false';
    const capturedIdeasVal = normalizeCapturedIdeas(JSON.parse(localStorage.getItem(`user:${email}:captured-ideas`) || '[]'));

    this.rewardedSessions = new Set<string>(
      JSON.parse(localStorage.getItem(`user:${email}:rewarded-sessions`) || '[]')
    );

    // Actualizar señales
    this.isPremium.set(isPremiumVal);
    this.focusPoints.set(focusPointsVal);
    this.proCoins.set(proCoinsVal);
    this.focusTomatoes.set(focusTomatoesVal);
    this.unlockedAvatars.set(mergedUnlockedAvatars);
    this.unlockedThemes.set(unlockedThemesVal);
    this.userName.set(userNameVal);
    this.selectedAvatar.set(selectedAvatarVal);
    this.selectedTheme.set(selectedThemeVal);
    this.themeMode.set(themeModeVal);
    this.userProfession.set(userProfessionVal ? cleanQuotedString(userProfessionVal) : '');
    this.userCountry.set(userCountryVal ? cleanQuotedString(userCountryVal) : '');
    this.userCountryCode.set(userCountryCodeVal || '');
    this.userActiveDays.set(userActiveDaysVal);
    this.podiumWins.set(podiumWinsVal);
    this.onboardingCompleted.set(onboardingCompletedVal);
    this.capturedIdeas.set(capturedIdeasVal);
    this.applyGlobalTheme();

    // Recalcular la racha
    this.streak.set(this.calculateStreak(email));
  }

  // Restablecer cuenta para nuevo registro desde cero
  resetNewUserAccount() {
    const email = this.getCurrentUserEmail();
    if (!email) return;
    
    localStorage.removeItem(`user:${email}:unlocked-avatars`);
    localStorage.removeItem(`user:${email}:unlocked-themes`);
    localStorage.removeItem(`user:${email}:user-name`);
    localStorage.removeItem(`user:${email}:avatar`);
    localStorage.removeItem(`user:${email}:theme`);
    localStorage.removeItem(`user:${email}:theme-mode`);
    localStorage.removeItem(`user:${email}:pro-coins`);
    localStorage.removeItem(`user:${email}:qualities-catalog`);
    localStorage.removeItem(`user:${email}:focus-points`);
    localStorage.removeItem(`user:${email}:rewarded-sessions`);

    this.unlockedAvatars.set([...INITIAL_AVATARS_LIST]);
    this.unlockedThemes.set(['samurai']);
    this.userName.set(email.split('@')[0]);
    this.selectedAvatar.set('gato');
    this.selectedTheme.set('samurai');
    this.themeMode.set('dark');
    this.applyGlobalTheme();
    this.proCoins.set(0);
    this.focusPoints.set(0);
    this.onboardingCompleted.set(true);
    this.rewardedSessions.clear();

    localStorage.setItem(`user:${email}:avatar`, 'gato');
    localStorage.setItem(`user:${email}:onboarding-completed`, 'true');
    localStorage.setItem('procrastina-onboarding-completed', 'true');
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
