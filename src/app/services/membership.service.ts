import { Injectable, signal, effect } from '@angular/core';

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
  const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
  return `user:${email}:${key}`;
}

function getMigratedValue(key: string, defaultValue: string): string {
  const userKey = getUserKeyStatic(key);
  const userVal = localStorage.getItem(userKey);
  if (userVal !== null) {
    return userVal;
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

@Injectable({
  providedIn: 'root',
})
export class MembershipService {
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

  addFocusTomatoes(tomatoes: number) {
    this.focusTomatoes.update(t => t + tomatoes);
  }

  // Cosméticos desbloqueados (por defecto los avatares iniciales)
  unlockedAvatars = signal<string[]>(
    getMigratedValueJSON('unlocked-avatars', ['gato','perro','conejo','loro','hamster','raton'])
  );
  unlockedThemes = signal<string[]>(
    getMigratedValueJSON('unlocked-themes', ['samurai'])
  );

  // Perfil del usuario
  userName = signal<string>(
    getMigratedValue('user-name', 'Ramiro')
  );
  selectedAvatar = signal<string>(
    getMigratedValue('avatar', 'gato')
  );
  selectedTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>(
    getMigratedValue('theme', 'samurai') as any
  );

  // Medallas ganadas en podios
  podiumWins = signal<number>(
    parseInt(getMigratedValue('podium-wins', '3'), 10)
  );

  // Estado de onboarding completado
  onboardingCompleted = signal<boolean>(
    getMigratedValue('onboarding-completed', 'false') === 'true' ||
    (localStorage.getItem('procrastina-user-name') !== null && localStorage.getItem('procrastina-user-name') !== 'Ramiro')
  );

  // Control global para abrir el modal de configuración de identidad
  showSettingsModal = signal<boolean>(false);

  // Baúl de ideas global compartido
  capturedIdeas = signal<string[]>(
    getMigratedValueJSON('captured-ideas', [] as string[])
  );

  // Catálogo completo de avatares disponibles (Gato, Perro, Conejo, Loro, Hámster, Tortuga, Hormiga, Búho, Rana, Águila, Abeja, Castor, Zorro, Lince, Panda, Oso, Elefante, León, Tigre, Lobo, Dragón, Fénix)
  avatarsCatalog = signal<AvatarItem[]>([
    { id: 'gato', name: 'Gato Lancero', icon: 'fa-cat', color: '#10b981', isUnlocked: true, isInitial: true },
    { id: 'perro', name: 'Perro Lancero', icon: 'fa-dog', color: '#3a86f0', isUnlocked: true, isInitial: true },
    { id: 'conejo', name: 'Conejo Lancero', icon: 'fa-rabbit', color: '#9ca3af', isUnlocked: true, isInitial: true },
    { id: 'loro', name: 'Loro Lancero', icon: 'fa-dove', color: '#fbbf24', isUnlocked: true, isInitial: true },
    { id: 'hamster', name: 'Hámster Lancero', icon: 'fa-paw', color: '#f97316', isUnlocked: true, isInitial: true },
    { id: 'raton', name: 'Ratón Lancero', icon: 'fa-paw', color: '#ec4899', isUnlocked: true, isInitial: true },
    { id: 'tortuga', name: 'Tortuga', icon: 'fa-turtle', color: '#22c55e', isUnlocked: false },
    // { id: 'tortuga_evolved', name: 'Tortuga Rúnica (Fase 2)', icon: 'fa-turtle', color: '#22c55e', isUnlocked: false },
    // { id: 'tortuga_phase3', name: 'Místico Tortuga (Fase 3)', icon: 'fa-turtle', color: '#22c55e', isUnlocked: false },
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
    { id: 'fenix', name: 'Fénix', icon: 'fa-fire', color: '#f97316', isUnlocked: false }
  ]);

  // Catálogo completo de Cualidades (TORTUGA, HORMIGA, BÚHO, RANA, ÁGUILA, ABEJA, CASTOR)
  qualitiesCatalog = signal<QualityItem[]>([
    { id: 'constancia', animal: 'tortuga', name: 'Constancia', description: 'Cada día cuenta.', unlockRequirement: 'Mantener una racha de 7 días consecutivos.', isUnlocked: false, unlockProgress: 3, unlockTotal: 7 },
    { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar 15 pomodoros en total.', isUnlocked: false, unlockProgress: 5, unlockTotal: 15 },
    { id: 'sabiduria', animal: 'buho', name: 'Sabiduría', description: 'La estrategia supera a la fuerza bruta.', unlockRequirement: 'Completar 5 pomodoros con la metodología Pareto (80/20).', isUnlocked: false, unlockProgress: 2, unlockTotal: 5 },
    { id: 'superacion', animal: 'rana', name: 'Superación', description: 'Enfréntate a lo más difícil de inmediato.', unlockRequirement: 'Completar 5 pomodoros con la metodología Sapo/Rana.', isUnlocked: false, unlockProgress: 1, unlockTotal: 5 },
    { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar 5 pomodoros con la metodología Normal.', isUnlocked: false, unlockProgress: 1, unlockTotal: 5 },
    { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas en comunidad.', isUnlocked: false, unlockProgress: 3, unlockTotal: 5 },
    { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Completar 3 pomodoros al hilo para un mismo objetivo en un día.', isUnlocked: false, unlockProgress: 1, unlockTotal: 3 }
  ]);

  // Registro de sesiones procesadas para idempotencia
  private rewardedSessions = new Set<string>(
    getMigratedValueJSON('rewarded-sessions', [] as string[])
  );

  constructor() {
    // Cerrar menú de avatar al hacer click fuera
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => {
        this.closeAvatarMenu();
      });
    }

    // DESBLOQUEAR TODO AUTOMÁTICAMENTE PARA PRUEBAS
    this.unlockedAvatars.set([
      'gato', 'perro', 'conejo', 'loro', 'hamster', 'raton', 'tortuga', /* 'tortuga_evolved', 'tortuga_phase3', */ 'hormiga', 'buho', 'rana', 
      'aguila', 'abeja', 'castor', 'zorro', 'lince', 'panda', 'oso', 'elefante', 'leon', 'tigre', 
      'dragon', 'fenix'
    ]);

    // Sincronizar automáticamente con localStorage al cambiar valores
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = String(this.isPremium());
      localStorage.setItem('procrastina-premium', val);
      localStorage.setItem(`user:${email}:premium`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = String(this.focusPoints());
      localStorage.setItem('procrastina-focus-points', val);
      localStorage.setItem(`user:${email}:focus-points`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = String(this.proCoins());
      localStorage.setItem('procrastina-pro-coins', val);
      localStorage.setItem(`user:${email}:pro-coins`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = String(this.focusTomatoes());
      localStorage.setItem('procrastina-focus-tomatoes', val);
      localStorage.setItem(`user:${email}:focus-tomatoes`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = JSON.stringify(this.unlockedAvatars());
      localStorage.setItem('procrastina-unlocked-avatars', val);
      localStorage.setItem(`user:${email}:unlocked-avatars`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = JSON.stringify(this.unlockedThemes());
      localStorage.setItem('procrastina-unlocked-themes', val);
      localStorage.setItem(`user:${email}:unlocked-themes`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = this.userName();
      localStorage.setItem('procrastina-user-name', val);
      localStorage.setItem(`user:${email}:user-name`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = this.selectedAvatar();
      localStorage.setItem('procrastina-avatar', val);
      localStorage.setItem(`user:${email}:avatar`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = this.selectedTheme();
      localStorage.setItem('procrastina-theme', val);
      localStorage.setItem(`user:${email}:theme`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = String(this.onboardingCompleted());
      localStorage.setItem('procrastina-onboarding-completed', val);
      localStorage.setItem(`user:${email}:onboarding-completed`, val);
    });
    effect(() => {
      const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
      const val = JSON.stringify(this.capturedIdeas());
      localStorage.setItem('captured-ideas', val);
      localStorage.setItem(`user:${email}:captured-ideas`, val);
    });
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

  // Simulación de persistencia en Supabase (profiles table)
  async saveSupabaseProfile(username: string, avatarId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[SUPABASE API MOCK] UPDATE profiles SET username = '${username}', avatar_id = '${avatarId}' WHERE id = auth.uid()`);
    
    // Simular retraso de red
    await new Promise(resolve => setTimeout(resolve, 500));

    // Validar nombres ocupados en simulación
    const busyNames = ['admin', 'administrator', 'support', 'system', 'moderator', 'ocupado', 'ramiro_admin'];
    if (busyNames.includes(username.toLowerCase())) {
      return { success: false, error: 'Este nombre ya está ocupado o no está permitido. Prueba con otro.' };
    }

    this.userName.set(username);
    this.selectedAvatar.set(avatarId as any);
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
    const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
    localStorage.setItem(
      `user:${email}:rewarded-sessions`,
      JSON.stringify(Array.from(this.rewardedSessions))
    );

    // Todos los usuarios ganan 1 tomate y 5 monedas (más 5 extra si es compartido) por sesión completada
    const tomatoesEarned = 1;
    const coinsEarned = 5 + (isShared ? 5 : 0);
    this.addFocusTomatoes(tomatoesEarned);
    this.addProCoins(coinsEarned);

    let pointsEarned = 0;
    if (this.isPremium()) {
      pointsEarned = 10;
      this.addFocusPoints(pointsEarned);
    }

    return { points: pointsEarned, coins: coinsEarned, tomatoes: tomatoesEarned, isNew: true };
  }

  // Intentar recompensar objetivo terminado (idempotente)
  rewardCompletedObjective(objectiveId: string): { points: number; coins: number; isNew: boolean } {
    const key = `obj-reward-${objectiveId}`;
    if (this.rewardedSessions.has(key)) {
      return { points: 0, coins: 0, isNew: false };
    }

    this.rewardedSessions.add(key);
    const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
    localStorage.setItem(
      `user:${email}:rewarded-sessions`,
      JSON.stringify(Array.from(this.rewardedSessions))
    );

    // Todos los usuarios ganan 15 monedas por objetivo completado
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

    // 8. Evolución de Tortuga (Fase 2 y Fase 3) - OCULTO DE MOMENTO
    // const totalSessions = Array.from(this.rewardedSessions).filter(id => id.startsWith('session-')).length;
    // if (totalSessions >= 100 && !this.unlockedAvatars().includes('tortuga_evolved')) {
    //   this.unlockedAvatars.update(unlocked => [...unlocked, 'tortuga_evolved']);
    // }
    // if (totalSessions >= 250 && !this.unlockedAvatars().includes('tortuga_phase3')) {
    //   this.unlockedAvatars.update(unlocked => [...unlocked, 'tortuga_phase3']);
    // }
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
    const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
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

  // Desbloquear avatar
  unlockAvatar(avatar: string, cost: number): boolean {
    if (this.unlockedAvatars().includes(avatar)) return true;
    if (this.proCoins() < cost) return false;

    this.proCoins.update(c => c - cost);
    this.unlockedAvatars.update(list => [...list, avatar]);
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

  // Registrar un nuevo usuario
  registerUser(email: string, pass: string): { success: boolean; error?: string } {
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

    const users = JSON.parse(localStorage.getItem('procrastina-registered-users') || '[]');
    
    // El correo demo está reservado
    if (emailLower === 'demo@focusapp.com') {
      return { success: false, error: 'Este correo electrónico de demostración ya está en uso.' };
    }

    const exists = users.some((u: any) => u.email.toLowerCase() === emailLower);
    if (exists) {
      return { success: false, error: 'Este correo electrónico ya está registrado.' };
    }

    // Guardar el nuevo usuario en el listado
    users.push({ email: emailLower, password: pass });
    localStorage.setItem('procrastina-registered-users', JSON.stringify(users));

    // Inicializar los datos del nuevo usuario en localStorage
    const defaultUsername = emailLower.split('@')[0];
    localStorage.setItem(`user:${emailLower}:user-name`, defaultUsername);
    localStorage.setItem(`user:${emailLower}:avatar`, 'gato');
    localStorage.setItem(`user:${emailLower}:theme`, 'samurai');
    localStorage.setItem(`user:${emailLower}:premium`, 'false');
    localStorage.setItem(`user:${emailLower}:focus-points`, '0');
    localStorage.setItem(`user:${emailLower}:pro-coins`, '0');
    localStorage.setItem(`user:${emailLower}:unlocked-avatars`, JSON.stringify(['gato','perro','conejo','loro','hamster','cuyo','raton','rana']));
    localStorage.setItem(`user:${emailLower}:unlocked-themes`, JSON.stringify(['samurai']));
    localStorage.setItem(`user:${emailLower}:onboarding-completed`, 'false');
    localStorage.setItem(`user:${emailLower}:captured-ideas`, JSON.stringify([]));
    localStorage.setItem(`user:${emailLower}:rewarded-sessions`, JSON.stringify([]));

    // Loguear e iniciar el sitio con el nuevo usuario
    this.loadUserData(emailLower);

    return { success: true };
  }

  // Iniciar sesión
  loginUser(email: string, pass: string): { success: boolean; error?: string } {
    const emailLower = email.toLowerCase().trim();

    // Validar contra demo o registrados
    if (emailLower === 'demo@focusapp.com') {
      if (pass === 'demo12345') {
        // Inicializar demo@focusapp.com en localStorage si es la primera vez que se accede
        if (localStorage.getItem(`user:demo@focusapp.com:user-name`) === null) {
          localStorage.setItem(`user:demo@focusapp.com:user-name`, 'Ramiro');
          localStorage.setItem(`user:demo@focusapp.com:avatar`, 'gato');
          localStorage.setItem(`user:demo@focusapp.com:theme`, 'samurai');
          localStorage.setItem(`user:demo@focusapp.com:premium`, 'false');
          localStorage.setItem(`user:demo@focusapp.com:focus-points`, '0');
          localStorage.setItem(`user:demo@focusapp.com:pro-coins`, '0');
          localStorage.setItem(`user:demo@focusapp.com:unlocked-avatars`, JSON.stringify(['gato','perro','conejo','loro','hamster','cuyo','raton','rana']));
          localStorage.setItem(`user:demo@focusapp.com:unlocked-themes`, JSON.stringify(['samurai']));
          localStorage.setItem(`user:demo@focusapp.com:onboarding-completed`, 'true');
        }
        this.loadUserData(emailLower);
        return { success: true };
      } else {
        return { success: false, error: 'Contraseña incorrecta para la cuenta demo.' };
      }
    }

    const users = JSON.parse(localStorage.getItem('procrastina-registered-users') || '[]');
    const user = users.find((u: any) => u.email.toLowerCase() === emailLower);

    if (user && user.password === pass) {
      this.loadUserData(emailLower);
      return { success: true };
    }

    return { success: false, error: 'Correo o contraseña incorrectos.' };
  }

  // Cargar datos de usuario
  loadUserData(email: string) {
    localStorage.setItem('procrastina-current-user-email', email);

    // Leer valores de localStorage con su prefijo, o usar valores por defecto
    const isPremiumVal = localStorage.getItem(`user:${email}:premium`) === 'true';
    const focusPointsVal = parseInt(localStorage.getItem(`user:${email}:focus-points`) || '0', 10);
    const proCoinsVal = parseInt(localStorage.getItem(`user:${email}:pro-coins`) || '0', 10);
    const unlockedAvatarsVal = JSON.parse(localStorage.getItem(`user:${email}:unlocked-avatars`) || '["gato","perro","conejo","loro","hamster","raton"]');
    const unlockedThemesVal = JSON.parse(localStorage.getItem(`user:${email}:unlocked-themes`) || '["samurai"]');
    const userNameVal = localStorage.getItem(`user:${email}:user-name`) || email.split('@')[0];
    const selectedAvatarVal = localStorage.getItem(`user:${email}:avatar`) || 'gato';
    const selectedThemeVal = (localStorage.getItem(`user:${email}:theme`) as any) || 'samurai';
    const podiumWinsVal = parseInt(localStorage.getItem(`user:${email}:podium-wins`) || '3', 10);
    const onboardingCompletedVal = localStorage.getItem(`user:${email}:onboarding-completed`) === 'true';
    const capturedIdeasVal = JSON.parse(localStorage.getItem(`user:${email}:captured-ideas`) || '[]');

    this.rewardedSessions = new Set<string>(
      JSON.parse(localStorage.getItem(`user:${email}:rewarded-sessions`) || '[]')
    );

    // Actualizar señales (los efectos las guardarán en el prefijo correcto)
    this.isPremium.set(isPremiumVal);
    this.focusPoints.set(focusPointsVal);
    this.proCoins.set(proCoinsVal);
    this.unlockedAvatars.set(unlockedAvatarsVal);
    this.unlockedThemes.set(unlockedThemesVal);
    this.userName.set(userNameVal);
    this.selectedAvatar.set(selectedAvatarVal);
    this.selectedTheme.set(selectedThemeVal);
    this.podiumWins.set(podiumWinsVal);
    this.onboardingCompleted.set(onboardingCompletedVal);
    this.capturedIdeas.set(capturedIdeasVal);
  }

  // Restablecer cuenta para nuevo registro desde cero
  resetNewUserAccount() {
    const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
    
    localStorage.removeItem(`user:${email}:unlocked-avatars`);
    localStorage.removeItem(`user:${email}:unlocked-themes`);
    localStorage.removeItem(`user:${email}:user-name`);
    localStorage.removeItem(`user:${email}:avatar`);
    localStorage.removeItem(`user:${email}:theme`);
    localStorage.removeItem(`user:${email}:pro-coins`);
    localStorage.removeItem(`user:${email}:qualities-catalog`);
    localStorage.removeItem(`user:${email}:focus-points`);
    localStorage.removeItem(`user:${email}:rewarded-sessions`);

    this.unlockedAvatars.set(['gato', 'perro', 'conejo', 'loro', 'hamster', 'raton']);
    this.unlockedThemes.set(['samurai']);
    this.userName.set(email.split('@')[0]);
    this.selectedAvatar.set('gato');
    this.selectedTheme.set('samurai');
    this.proCoins.set(0);
    this.focusPoints.set(0);
    this.rewardedSessions.clear();
    // Reestablecer cualidades
    this.qualitiesCatalog.set([
      { id: 'constancia', animal: 'tortuga', name: 'Constancia', description: 'Cada día cuenta.', unlockRequirement: 'Mantener una racha de 7 días consecutivos.', isUnlocked: false, unlockProgress: 3, unlockTotal: 7 },
      { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar 15 pomodoros en total.', isUnlocked: false, unlockProgress: 5, unlockTotal: 15 },
      { id: 'sabiduria', animal: 'buho', name: 'Sabiduría', description: 'La estrategia supera a la fuerza bruta.', unlockRequirement: 'Completar 5 pomodoros con la metodología Pareto (80/20).', isUnlocked: false, unlockProgress: 2, unlockTotal: 5 },
      { id: 'superacion', animal: 'rana', name: 'Superación', description: 'Enfréntate a lo más difícil de inmediato.', unlockRequirement: 'Completar 5 pomodoros con la metodología Sapo/Rana.', isUnlocked: false, unlockProgress: 1, unlockTotal: 5 },
      { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar 5 pomodoros con la metodología Normal.', isUnlocked: false, unlockProgress: 1, unlockTotal: 5 },
      { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas en comunidad.', isUnlocked: false, unlockProgress: 3, unlockTotal: 5 },
      { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Completar 3 pomodoros al hilo para un mismo objetivo en un día.', isUnlocked: false, unlockProgress: 1, unlockTotal: 3 }
    ]);
  }

  // Auxiliares globales para avatars
  getAvatarNameById(id: string): string {
    const names: { [key: string]: string } = {
      gato: 'Gato Lancero', perro: 'Perro Lancero', conejo: 'Conejo Lancero',
      loro: 'Loro Lancero', zorro: 'Zorro', lince: 'Lince',
      lobo: 'Lobo', tortuga: 'Tortuga', hormiga: 'Hormiga', abeja: 'Abeja',
      castor: 'Castor', aguila: 'Águila', buho: 'Búho', panda: 'Panda',
      oso: 'Oso', elefante: 'Elefante',
      leon: 'León', tigre: 'Tigre', dragon: 'Dragón del Ego', fenix: 'Fénix',
      hamster: 'Hámster Lancero', raton: 'Ratón Lancero', rana: 'Rana'
    };
    return names[id] || 'Gato';
  }

  getAvatarColorById(id: string): string {
    const colors: { [key: string]: string } = {
      gato: '#10b981', perro: '#3a86f0', conejo: '#9ca3af',
      loro: '#fbbf24', zorro: '#f97316', lince: '#a855f7',
      lobo: '#ef4444', tortuga: '#22c55e', hormiga: '#78350f', abeja: '#eab308',
      castor: '#b45309', aguila: '#3b82f6', buho: '#6366f1', panda: '#6b7280',
      oso: '#78350f', elefante: '#6b7280',
      leon: '#fbbf24', tigre: '#f97316', dragon: '#d946ef', fenix: '#ef4444',
      hamster: '#f97316', raton: '#ec4899', rana: '#22c55e'
    };
    return colors[id] || '#10b981';
  }

  getSelectedAvatarIcon(): string {
    const current = this.selectedAvatar();
    if (['buho', 'aguila', 'fenix'].includes(current)) return 'fa-crow';
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
}
