import { Injectable, signal, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

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
    return userVal;
  }
  // No migrar valores antiguos residuales de profesión ni país
  if (key === 'user-profession' || key === 'user-country' || key === 'user-country-code') {
    return defaultValue;
  }
  const globalKey = `procrastina-${key}`;
  const globalVal = localStorage.getItem(globalKey);
  if (globalVal !== null) {
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

  // Estado de membresía
  isPremium = signal<boolean>(
    getMigratedValue('premium', 'false') === 'true'
  );

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

  // Puntos de enfoque (para ranking)
  focusPoints = signal<number>(
    parseInt(getMigratedValue('focus-points', '0'), 10)
  );

  // Pro Coins (para comprar desbloqueables)
  proCoins = signal<number>(
    parseInt(getMigratedValue('pro-coins', '0'), 10)
  );

  // Tomates de enfoque (1 por sesión)
  focusTomatoes = signal<number>(
    parseInt(getMigratedValue('focus-tomatoes', '0'), 10)
  );

  // Racha de días de enfoque
  streak = signal<number>(0);

  addFocusTomatoes(tomatoes: number) {
    this.focusTomatoes.update(t => t + tomatoes);
  }

  // Cosméticos desbloqueados (por defecto solo los 6 avatares comunes iniciales)
  unlockedAvatars = signal<string[]>(
    getMigratedValueJSON('unlocked-avatars', INITIAL_AVATARS_LIST)
  );
  unlockedThemes = signal<string[]>(
    getMigratedValueJSON('unlocked-themes', ['samurai'])
  );
  unlockedTimers = signal<string[]>(
    getMigratedValueJSON('unlocked-timers', ['digital', 'ring', 'line'])
  );

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

  // Estado de onboarding completado
  onboardingCompleted = signal<boolean>(
    getMigratedValue('onboarding-completed', 'false') === 'true'
  );

  // Control global para abrir el modal de configuración de identidad
  showSettingsModal = signal<boolean>(false);

  // Baúl de ideas global compartido
  capturedIdeas = signal<string[]>(
    getMigratedValueJSON('captured-ideas', [] as string[])
  );

  // Catálogo completo de avatares disponibles (Solo los iniciales comunes vienen desbloqueados gratis)
  avatarsCatalog = signal<AvatarItem[]>([
    { id: 'gato', name: 'Gato Lancero', icon: 'fa-cat', color: '#10b981', isUnlocked: true, isInitial: true },
    { id: 'perro', name: 'Perro Lancero', icon: 'fa-dog', color: '#3a86f0', isUnlocked: true, isInitial: true },
    { id: 'conejo', name: 'Conejo Lancero', icon: 'fa-rabbit', color: '#9ca3af', isUnlocked: true, isInitial: true },
    { id: 'loro', name: 'Loro Lancero', icon: 'fa-dove', color: '#fbbf24', isUnlocked: true, isInitial: true },
    { id: 'hamster', name: 'Hámster Lancero', icon: 'fa-paw', color: '#f97316', isUnlocked: true, isInitial: true },
    { id: 'raton', name: 'Ratón Lancero', icon: 'fa-paw', color: '#ec4899', isUnlocked: true, isInitial: true },
    { id: 'tortuga', name: 'Tortuga', icon: 'fa-turtle', color: '#22c55e', isUnlocked: false },
    { id: 'hormiga', name: 'Hormiga', icon: 'fa-bug', color: '#78350f', isUnlocked: false },
    { id: 'buho', name: 'Búho', icon: 'fa-owl', color: '#6366f1', isUnlocked: false },
    { id: 'rana', name: 'Rana', icon: 'fa-frog', color: '#22c55e', isUnlocked: false },
    { id: 'aguila', name: 'Águila', icon: 'fa-dove', color: '#3b82f6', isUnlocked: false },
    { id: 'abeja', name: 'Abeja', icon: 'fa-bee', color: '#eab308', isUnlocked: false },
    { id: 'castor', name: 'Castor', icon: 'fa-paw', color: '#b45309', isUnlocked: false },
    { id: 'zorro', name: 'Zorro', icon: 'fa-paw', color: '#f97316', isUnlocked: false },
    { id: 'lince', name: 'Lince', icon: 'fa-paw', color: '#a855f7', isUnlocked: false },
    { id: 'panda', name: 'Panda', icon: 'fa-paw', color: '#6b7280', isUnlocked: false },
    { id: 'oso', name: 'Oso', icon: 'fa-paw', color: '#78350f', isUnlocked: false },
    { id: 'elefante', name: 'Elefante', icon: 'fa-paw', color: '#6b7280', isUnlocked: false },
    { id: 'leon', name: 'León', icon: 'fa-paw', color: '#fbbf24', isUnlocked: false },
    { id: 'tigre', name: 'Tigre', icon: 'fa-paw', color: '#f97316', isUnlocked: false },
    { id: 'lobo', name: 'Lobo', icon: 'fa-paw', color: '#ef4444', isUnlocked: false },
    { id: 'dragon', name: 'Dragón del Ego', icon: 'fa-dragon', color: '#d946ef', isUnlocked: false },
    { id: 'fenix', name: 'Fénix', icon: 'fa-fire', color: '#f97316', isUnlocked: false },
    { id: 'grifo', name: 'Grifo', icon: 'fa-crow', color: '#eab308', isUnlocked: false }
  ]);

  // Catálogo completo de Cualidades (TORTUGA, HORMIGA, BÚHO, RANA, ÁGUILA, ABEJA, CASTOR)
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
    if (email) {
      this.streak.set(this.calculateStreak(email));
    }

    // Sanitizar clave legacy global si contenía todos los avatares
    const globalAvatars = localStorage.getItem('procrastina-unlocked-avatars');
    if (globalAvatars) {
      try {
        const parsed = JSON.parse(globalAvatars);
        if (Array.isArray(parsed) && parsed.length > INITIAL_AVATARS_LIST.length) {
          localStorage.setItem('procrastina-unlocked-avatars', JSON.stringify(INITIAL_AVATARS_LIST));
        }
      } catch (e) {}
    }

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

  addIdea(idea: string) {
    if (!idea.trim()) return;
    const current = this.capturedIdeas();
    this.capturedIdeas.set([idea.trim(), ...current]);
  }

  removeIdea(index: number) {
    const current = this.capturedIdeas();
    this.capturedIdeas.set(current.filter((_, i) => i !== index));
  }

  clearAllIdeas() {
    this.capturedIdeas.set([]);
  }

  // Obtener avatares dinámicamente con su estado de bloqueo actualizado
  getAvatars(): AvatarItem[] {
    const unlocked = this.unlockedAvatars();
    return this.avatarsCatalog().map(avatar => {
      const isUnlocked = avatar.isInitial || unlocked.includes(avatar.id);
      return { ...avatar, isUnlocked };
    });
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

  // Activar/desactivar Premium
  setPremium(premium: boolean) {
    this.isPremium.set(premium);
    if (premium) {
      // Regalo de bienvenida si se activa Premium (por única vez)
      if (this.focusPoints() === 0 && this.proCoins() === 0) {
        this.addFocusPoints(200);
        this.addProCoins(100);
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
    if (email) {
      localStorage.setItem(
        `user:${email}:rewarded-sessions`,
        JSON.stringify(Array.from(this.rewardedSessions))
      );
    }

    // Recompensa de monedas basada en el avatar equipado
    const avatarId = this.selectedAvatar();
    const baseAvatarCoins = this.getAvatarCoinsPerPomodoro(avatarId);
    const tomatoesEarned = 1;
    const coinsEarned = baseAvatarCoins + (isShared ? 5 : 0);
    this.addFocusTomatoes(tomatoesEarned);
    this.addProCoins(coinsEarned);

    let pointsEarned = 0;
    if (this.isPremium()) {
      pointsEarned = 10;
      this.addFocusPoints(pointsEarned);
    }

    return { points: pointsEarned, coins: coinsEarned, tomatoes: tomatoesEarned, isNew: true };
  }

  // Monedas aportadas por cada avatar al completar un pomodoro
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
    if (email) {
      localStorage.setItem(
        `user:${email}:rewarded-sessions`,
        JSON.stringify(Array.from(this.rewardedSessions))
      );
    }

    // Monedas por objetivo completado
    const coinsEarned = 15;
    this.addProCoins(coinsEarned);

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

  private updateStreakProgress() {
    const email = this.getCurrentUserEmail();
    if (!email) return;
    const key = `user:${email}:streak-dates`;
    const savedDates = localStorage.getItem(key);
    let dates: string[] = savedDates ? JSON.parse(savedDates) : [];

    const todayStr = new Date().toLocaleDateString();
    if (!dates.includes(todayStr)) {
      dates.push(todayStr);
      localStorage.setItem(key, JSON.stringify(dates));
    }

    let currentStreak = 1;
    let checkDate = new Date();
    
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = checkDate.toLocaleDateString();
      if (dates.includes(checkStr)) {
        currentStreak++;
      } else {
        break;
      }
    }

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

  calculateStreak(email: string): number {
    if (!email) return 0;
    const key = `user:${email}:streak-dates`;
    const savedDates = localStorage.getItem(key);
    if (!savedDates) return 0;
    try {
      const dates: string[] = JSON.parse(savedDates);
      if (dates.length === 0) return 0;

      const todayStr = new Date().toLocaleDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString();

      // Si hoy no se ha enfocado y ayer tampoco, la racha activa es 0
      if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
        return 0;
      }

      let currentStreak = 0;
      let checkDate = new Date();
      
      // Si hoy no se ha enfocado pero ayer sí, empezamos a contar desde ayer
      if (!dates.includes(todayStr) && dates.includes(yesterdayStr)) {
        checkDate = yesterday;
      }

      while (true) {
        const checkStr = checkDate.toLocaleDateString();
        if (dates.includes(checkStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      return currentStreak;
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

  // Aplicar datos del perfil de Supabase a las señales
  private applySupabaseProfile(p: any) {
    if (p.username) this.userName.set(p.username);
    if (p.selected_avatar) this.selectedAvatar.set(p.selected_avatar);
    if (p.selected_theme) this.selectedTheme.set(p.selected_theme);
    this.userProfession.set(p.profession ? cleanQuotedString(p.profession) : '');
    this.userCountry.set(p.country ? cleanQuotedString(p.country) : '');
    this.userCountryCode.set(p.country_code ? p.country_code : '');
    if (p.active_days) this.userActiveDays.set(p.active_days);
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

  // Aplicar items desbloqueados desde Supabase (user_unlocked_items)
  applySupabaseUnlockedItems(itemIds: string[]) {
    const allKnownAvatars = ALL_AVATARS_LIST;
    const knownThemes = ['samurai', 'cyberpunk', 'aurora', 'zen'];
    const knownTimers = ['digital', 'ring', 'line'];

    const avatars = Array.from(new Set([
      ...INITIAL_AVATARS_LIST,
      ...(itemIds || []).filter(id => allKnownAvatars.includes(id))
    ]));

    const themes = Array.from(new Set([
      'samurai',
      ...(itemIds || []).filter(id => knownThemes.includes(id))
    ]));

    const timers = Array.from(new Set([
      'digital', 'ring', 'line',
      ...(itemIds || []).filter(id => knownTimers.includes(id))
    ]));

    this.unlockedAvatars.set(avatars);
    this.unlockedThemes.set(themes);
    this.unlockedTimers.set(timers);

    if (!avatars.includes(this.selectedAvatar())) {
      this.selectedAvatar.set('gato');
    }

    const email = this.getCurrentUserEmail();
    if (email) {
      localStorage.setItem(`user:${email}:unlocked-avatars`, JSON.stringify(avatars));
      localStorage.setItem(`user:${email}:unlocked-themes`, JSON.stringify(themes));
      localStorage.setItem(`user:${email}:unlocked-timers`, JSON.stringify(timers));
    }
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
        // Si tiene todos los avatares pero nunca ha tenido puntos, monedas ni pomodoros, fue una migración errónea antigua: sanear a los 6 iniciales
        if (Array.isArray(parsed) && parsed.length >= ALL_AVATARS_LIST.length && focusPointsVal === 0 && proCoinsVal === 0 && focusTomatoesVal === 0) {
          mergedUnlockedAvatars = [...INITIAL_AVATARS_LIST];
          localStorage.setItem(`user:${email}:unlocked-avatars`, JSON.stringify(mergedUnlockedAvatars));
        } else {
          mergedUnlockedAvatars = Array.from(new Set([...parsed, ...INITIAL_AVATARS_LIST]));
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
    const userProfessionVal = localStorage.getItem(`user:${email}:user-profession`);
    const userCountryVal = localStorage.getItem(`user:${email}:user-country`);
    const userCountryCodeVal = localStorage.getItem(`user:${email}:user-country-code`);
    const userActiveDaysVal = JSON.parse(localStorage.getItem(`user:${email}:user-active-days`) || '[1, 2, 3, 4, 5]');
    const podiumWinsVal = parseInt(localStorage.getItem(`user:${email}:podium-wins`) || '0', 10);
    const onboardingCompletedVal = localStorage.getItem(`user:${email}:onboarding-completed`) === 'true';
    const capturedIdeasVal = JSON.parse(localStorage.getItem(`user:${email}:captured-ideas`) || '[]');

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
    this.userProfession.set(userProfessionVal ? cleanQuotedString(userProfessionVal) : '');
    this.userCountry.set(userCountryVal ? cleanQuotedString(userCountryVal) : '');
    this.userCountryCode.set(userCountryCodeVal || '');
    this.userActiveDays.set(userActiveDaysVal);
    this.podiumWins.set(podiumWinsVal);
    this.onboardingCompleted.set(onboardingCompletedVal);
    this.capturedIdeas.set(capturedIdeasVal);

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
    localStorage.removeItem(`user:${email}:pro-coins`);
    localStorage.removeItem(`user:${email}:qualities-catalog`);
    localStorage.removeItem(`user:${email}:focus-points`);
    localStorage.removeItem(`user:${email}:rewarded-sessions`);

    this.unlockedAvatars.set([...INITIAL_AVATARS_LIST]);
    this.unlockedThemes.set(['samurai']);
    this.userName.set(email.split('@')[0]);
    this.selectedAvatar.set('gato');
    this.selectedTheme.set('samurai');
    this.proCoins.set(0);
    this.focusPoints.set(0);
    this.rewardedSessions.clear();
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
    const names: { [key: string]: string } = {
      gato: 'Kuro', perro: 'Borek', conejo: 'Zephyr',
      loro: 'Ario', zorro: 'Renard', lince: 'Silas',
      lobo: 'Fenrir', tortuga: 'Genbu', hormiga: 'Vargas', abeja: 'Vespia',
      castor: 'Barris', aguila: 'Valkor', buho: 'Noctis', panda: 'Tao',
      oso: 'Bjorn', elefante: 'Titanis',
      leon: 'Leónidas', tigre: 'Rakan', dragon: 'Bahamut', fenix: 'Ignis', grifo: 'Aethel',
      hamster: 'Pip', raton: 'Sombra', rana: 'Kero'
    };
    return names[id] || 'Kuro';
  }

  getAvatarColorById(id: string): string {
    const colors: { [key: string]: string } = {
      gato: '#10b981', perro: '#3a86f0', conejo: '#9ca3af',
      loro: '#fbbf24', zorro: '#f97316', lince: '#a855f7',
      lobo: '#ef4444', tortuga: '#22c55e', hormiga: '#78350f', abeja: '#eab308',
      castor: '#b45309', aguila: '#3b82f6', buho: '#6366f1', panda: '#6b7280',
      oso: '#78350f', elefante: '#6b7280',
      leon: '#fbbf24', tigre: '#f97316', dragon: '#d946ef', fenix: '#ef4444', grifo: '#eab308',
      hamster: '#f97316', raton: '#ec4899', rana: '#22c55e'
    };
    return colors[id] || '#10b981';
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
