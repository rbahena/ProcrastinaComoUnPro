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

@Injectable({
  providedIn: 'root',
})
export class MembershipService {
  // Estado de membresía
  isPremium = signal<boolean>(
    localStorage.getItem('procrastina-premium') === 'true'
  );

  // Puntos de enfoque (para ranking)
  focusPoints = signal<number>(
    parseInt(localStorage.getItem('procrastina-focus-points') || '0', 10)
  );

  // Pro Coins (para comprar desbloqueables)
  proCoins = signal<number>(
    parseInt(localStorage.getItem('procrastina-pro-coins') || '0', 10)
  );

  // Cosméticos desbloqueados (por defecto los avatares iniciales)
  unlockedAvatars = signal<string[]>(
    JSON.parse(localStorage.getItem('procrastina-unlocked-avatars') || '["gato","perro","conejo","mapache","nutria","loro","zorro"]')
  );
  unlockedThemes = signal<string[]>(
    JSON.parse(localStorage.getItem('procrastina-unlocked-themes') || '["samurai"]')
  );

  // Perfil del usuario
  userName = signal<string>(
    localStorage.getItem('procrastina-user-name') || 'Ramiro'
  );
  selectedAvatar = signal<string>(
    localStorage.getItem('procrastina-avatar') || 'gato'
  );
  selectedTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>(
    (localStorage.getItem('procrastina-theme') as any) || 'samurai'
  );

  // Estado de onboarding completado
  onboardingCompleted = signal<boolean>(
    localStorage.getItem('procrastina-onboarding-completed') === 'true' ||
    (localStorage.getItem('procrastina-user-name') !== null && localStorage.getItem('procrastina-user-name') !== 'Ramiro')
  );

  // Control global para abrir el modal de configuración de identidad
  showSettingsModal = signal<boolean>(false);

  // Catálogo completo de avatares disponibles (Gato, Perro, Conejo, Mapache, Nutria, Loro, Zorro)
  avatarsCatalog = signal<AvatarItem[]>([
    { id: 'gato', name: 'Gato', icon: 'fa-cat', color: '#10b981', isUnlocked: true, isInitial: true },
    { id: 'perro', name: 'Perro', icon: 'fa-dog', color: '#3a86f0', isUnlocked: true, isInitial: true },
    { id: 'conejo', name: 'Conejo', icon: 'fa-rabbit', color: '#ec4899', isUnlocked: true, isInitial: true },
    { id: 'mapache', name: 'Mapache', icon: 'fa-paw', color: '#8b5cf6', isUnlocked: true, isInitial: true },
    { id: 'nutria', name: 'Nutria', icon: 'fa-water', color: '#06b6d4', isUnlocked: true, isInitial: true },
    { id: 'loro', name: 'Loro', icon: 'fa-dove', color: '#fbbf24', isUnlocked: true, isInitial: true },
    { id: 'zorro', name: 'Zorro', icon: 'fa-mask', color: '#f97316', isUnlocked: true, isInitial: true }
  ]);

  // Catálogo completo de Cualidades (TORTUGA, HORMIGA, ÁGUILA, ABEJA, CASTOR, LOBO)
  qualitiesCatalog = signal<QualityItem[]>([
    { id: 'constancia', animal: 'tortuga', name: 'Constancia', description: 'Cada día cuenta.', unlockRequirement: 'Mantener una racha de 7 días consecutivos.', isUnlocked: false, unlockProgress: 3, unlockTotal: 7 },
    { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar pequeños objetivos de manera constante.', isUnlocked: false, unlockProgress: 5, unlockTotal: 10 },
    { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar objetivos grandes que requieran varias sesiones.', isUnlocked: false, unlockProgress: 1, unlockTotal: 3 },
    { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas.', isUnlocked: false, unlockProgress: 3, unlockTotal: 5 },
    { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Trabajar progresivamente en objetivos durante varios días.', isUnlocked: false, unlockProgress: 6, unlockTotal: 10 },
    { id: 'cooperacion', animal: 'lobo', name: 'Cooperación', description: 'Avanza mejor acompañado.', unlockRequirement: 'Participar activamente ayudando/acompañando a otros usuarios.', isUnlocked: false, unlockProgress: 2, unlockTotal: 5 }
  ]);

  // Registro de sesiones procesadas para idempotencia
  private rewardedSessions = new Set<string>(
    JSON.parse(localStorage.getItem('procrastina-rewarded-sessions') || '[]')
  );

  constructor() {
    // Sincronizar automáticamente con localStorage al cambiar valores
    effect(() => {
      localStorage.setItem('procrastina-premium', String(this.isPremium()));
    });
    effect(() => {
      localStorage.setItem('procrastina-focus-points', String(this.focusPoints()));
    });
    effect(() => {
      localStorage.setItem('procrastina-pro-coins', String(this.proCoins()));
    });
    effect(() => {
      localStorage.setItem('procrastina-unlocked-avatars', JSON.stringify(this.unlockedAvatars()));
    });
    effect(() => {
      localStorage.setItem('procrastina-unlocked-themes', JSON.stringify(this.unlockedThemes()));
    });
    effect(() => {
      localStorage.setItem('procrastina-user-name', this.userName());
    });
    effect(() => {
      localStorage.setItem('procrastina-avatar', this.selectedAvatar());
    });
    effect(() => {
      localStorage.setItem('procrastina-theme', this.selectedTheme());
    });
    effect(() => {
      localStorage.setItem('procrastina-onboarding-completed', String(this.onboardingCompleted()));
    });
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
  rewardCompletedSession(sessionId: string, isShared: boolean): { points: number; coins: number; isNew: boolean } {
    if (this.rewardedSessions.has(sessionId)) {
      return { points: 0, coins: 0, isNew: false };
    }

    // Registrar sesión
    this.rewardedSessions.add(sessionId);
    localStorage.setItem(
      'procrastina-rewarded-sessions',
      JSON.stringify(Array.from(this.rewardedSessions))
    );

    if (!this.isPremium()) {
      return { points: 0, coins: 0, isNew: true };
    }

    const pointsEarned = 10;
    const coinsEarned = 5 + (isShared ? 5 : 0);

    this.addFocusPoints(pointsEarned);
    this.addProCoins(coinsEarned);

    return { points: pointsEarned, coins: coinsEarned, isNew: true };
  }

  // Intentar recompensar objetivo terminado (idempotente)
  rewardCompletedObjective(objectiveId: string): { points: number; coins: number; isNew: boolean } {
    const key = `obj-reward-${objectiveId}`;
    if (this.rewardedSessions.has(key)) {
      return { points: 0, coins: 0, isNew: false };
    }

    this.rewardedSessions.add(key);
    localStorage.setItem(
      'procrastina-rewarded-sessions',
      JSON.stringify(Array.from(this.rewardedSessions))
    );

    if (!this.isPremium()) {
      return { points: 0, coins: 0, isNew: true };
    }

    const pointsEarned = 30;
    const coinsEarned = 15;

    this.addFocusPoints(pointsEarned);
    this.addProCoins(coinsEarned);

    return { points: pointsEarned, coins: coinsEarned, isNew: true };
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

  // Auxiliares globales para avatars
  getSelectedAvatarIcon(): string {
    const current = this.selectedAvatar();
    const avatar = this.avatarsCatalog().find(a => a.id === current);
    return avatar ? avatar.icon : 'fa-mask';
  }

  getSelectedAvatarName(): string {
    const current = this.selectedAvatar();
    const avatar = this.avatarsCatalog().find(a => a.id === current);
    return avatar ? avatar.name : 'Gato';
  }

  getEmoji(id: string): string {
    switch (id) {
      case 'lobo': return '🐺';
      case 'zorro': return '🦊';
      case 'buho': return '🦉';
      case 'lince': return '🦌';
      case 'panda': return '🐼';
      case 'sloth': return '🦥';
      case 'leon': return '🦁';
      case 'dragon': return '🐉';
      case 'tortuga': return '🐢';
      case 'abeja': return '🐝';
      case 'castor': return '🦫';
      case 'aguila': return '🦅';
      case 'hormiga': return '🐜';
      default: return '🐾';
    }
  }

  getSelectedAvatarEmoji(): string {
    return this.getEmoji(this.selectedAvatar());
  }

  getAvatarTitle(id: string): string {
    switch (id) {
      case 'lobo': return 'Samurai';
      case 'zorro': return 'Ninja';
      case 'buho': return 'Estratega';
      case 'lince': return 'Explorador';
      case 'panda': return 'Zen';
      case 'sloth': return 'Calma';
      case 'leon': return 'Shogun';
      case 'dragon': return 'Guardián';
      default: return 'Guerrero';
    }
  }
}
