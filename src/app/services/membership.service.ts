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

  // Puntos de enfoque (para ranking)
  focusPoints = signal<number>(
    parseInt(getMigratedValue('focus-points', '0'), 10)
  );

  // Pro Coins (para comprar desbloqueables)
  proCoins = signal<number>(
    parseInt(getMigratedValue('pro-coins', '0'), 10)
  );

  // Cosméticos desbloqueados (por defecto los avatares iniciales)
  unlockedAvatars = signal<string[]>(
    getMigratedValueJSON('unlocked-avatars', ['gato','perro','conejo','loro','hamster','pez','cuyo','raton','rana'])
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

  // Catálogo completo de avatares disponibles (Gato, Perro, Conejo, Mapache, Nutria, Loro, Zorro, Lince)
  avatarsCatalog = signal<AvatarItem[]>([
    { id: 'gato', name: 'Gato Lancero', icon: 'fa-cat', color: '#10b981', isUnlocked: true, isInitial: true },
    { id: 'perro', name: 'Perro Lancero', icon: 'fa-dog', color: '#3a86f0', isUnlocked: true, isInitial: true },
    { id: 'conejo', name: 'Conejo', icon: 'fa-rabbit', color: '#9ca3af', isUnlocked: true, isInitial: true },
    { id: 'loro', name: 'Loro', icon: 'fa-dove', color: '#fbbf24', isUnlocked: true, isInitial: true },
    { id: 'hamster', name: 'Hámster', icon: 'fa-paw', color: '#f97316', isUnlocked: true, isInitial: true },
    { id: 'pez', name: 'Pez', icon: 'fa-fish', color: '#06b6d4', isUnlocked: true, isInitial: true },
    { id: 'cuyo', name: 'Cuyo', icon: 'fa-paw', color: '#8b5cf6', isUnlocked: true, isInitial: true },
    { id: 'raton', name: 'Ratón', icon: 'fa-paw', color: '#ec4899', isUnlocked: true, isInitial: true },
    { id: 'rana', name: 'Rana', icon: 'fa-frog', color: '#22c55e', isUnlocked: true, isInitial: true }
  ]);

  // Catálogo completo de Cualidades (TORTUGA, HORMIGA, ÁGUILA, ABEJA, CASTOR, LOBO)
  qualitiesCatalog = signal<QualityItem[]>([
    { id: 'constancia', animal: 'tortuga', name: 'Constancia', description: 'Cada día cuenta.', unlockRequirement: 'Mantener una racha de 7 días consecutivos.', isUnlocked: false, unlockProgress: 3, unlockTotal: 7 },
    { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar pequeños objetivos de manera constante.', isUnlocked: false, unlockProgress: 5, unlockTotal: 20 },
    { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar objetivos grandes que requieran varias sesiones.', isUnlocked: false, unlockProgress: 1, unlockTotal: 4 },
    { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas.', isUnlocked: false, unlockProgress: 3, unlockTotal: 5 },
    { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Trabajar progresivamente en objetivos durante varios días.', isUnlocked: false, unlockProgress: 6, unlockTotal: 10 },
    { id: 'cooperacion', animal: 'lobo', name: 'Cooperación', description: 'Avanza mejor acompañado.', unlockRequirement: 'Participar activamente ayudando/acompañando a otros usuarios.', isUnlocked: false, unlockProgress: 2, unlockTotal: 5 }
  ]);

  // Registro de sesiones procesadas para idempotencia
  private rewardedSessions = new Set<string>(
    getMigratedValueJSON('rewarded-sessions', [] as string[])
  );

  constructor() {
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
  rewardCompletedSession(sessionId: string, isShared: boolean): { points: number; coins: number; isNew: boolean } {
    if (this.rewardedSessions.has(sessionId)) {
      return { points: 0, coins: 0, isNew: false };
    }

    // Registrar sesión
    this.rewardedSessions.add(sessionId);
    const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
    localStorage.setItem(
      `user:${email}:rewarded-sessions`,
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
    const email = localStorage.getItem('procrastina-current-user-email') || 'demo@focusapp.com';
    localStorage.setItem(
      `user:${email}:rewarded-sessions`,
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
    localStorage.setItem(`user:${emailLower}:unlocked-avatars`, JSON.stringify(['gato','perro','conejo','loro','hamster','pez','cuyo','raton','rana']));
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
          localStorage.setItem(`user:demo@focusapp.com:unlocked-avatars`, JSON.stringify(['gato','perro','conejo','loro','hamster','pez','cuyo','raton','rana']));
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
    const unlockedAvatarsVal = JSON.parse(localStorage.getItem(`user:${email}:unlocked-avatars`) || '["gato","perro","conejo","loro","hamster","pez","cuyo","raton","rana"]');
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

    this.unlockedAvatars.set(['gato', 'perro', 'conejo', 'loro', 'hamster', 'pez', 'cuyo', 'raton', 'rana']);
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
      { id: 'disciplina', animal: 'hormiga', name: 'Disciplina', description: 'Los pequeños pasos construyen grandes resultados.', unlockRequirement: 'Completar pequeños objetivos de manera constante.', isUnlocked: false, unlockProgress: 5, unlockTotal: 20 },
      { id: 'vision', animal: 'aguila', name: 'Visión', description: 'No pierdas de vista hacia dónde vas.', unlockRequirement: 'Completar objetivos grandes que requieran varias sesiones.', isUnlocked: false, unlockProgress: 1, unlockTotal: 4 },
      { id: 'colaboracion', animal: 'abeja', name: 'Colaboración', description: 'El enfoque también puede compartirse.', unlockRequirement: 'Participar en 5 sesiones acompañadas.', isUnlocked: false, unlockProgress: 3, unlockTotal: 5 },
      { id: 'construccion', animal: 'castor', name: 'Construcción', description: 'Construye hoy lo que quieres terminar mañana.', unlockRequirement: 'Trabajar progresivamente en objetivos durante varios días.', isUnlocked: false, unlockProgress: 6, unlockTotal: 10 },
      { id: 'cooperacion', animal: 'lobo', name: 'Cooperación', description: 'Avanza mejor acompañado.', unlockRequirement: 'Participar activamente ayudando/acompañando a otros usuarios.', isUnlocked: false, unlockProgress: 2, unlockTotal: 5 }
    ]);
  }

  // Auxiliares globales para avatars
  getAvatarNameById(id: string): string {
    const names: { [key: string]: string } = {
      gato: 'Gato Lancero', perro: 'Perro Lancero', conejo: 'Conejo', mapache: 'Mapache',
      nutria: 'Nutria', loro: 'Loro', zorro: 'Zorro', lince: 'Lince',
      lobo: 'Lobo', tortuga: 'Tortuga', hormiga: 'Hormiga', abeja: 'Abeja',
      castor: 'Castor', aguila: 'Águila', buho: 'Búho', panda: 'Panda',
      sloth: 'Perezoso', elefante: 'Elefante', octopus: 'Pulpo',
      leon: 'León', dragon: 'Dragón del Ego', fenix: 'Fénix',
      hamster: 'Hámster', pez: 'Pez', cuyo: 'Cuyo', raton: 'Ratón', rana: 'Rana'
    };
    return names[id] || 'Gato';
  }

  getAvatarColorById(id: string): string {
    const colors: { [key: string]: string } = {
      gato: '#10b981', perro: '#3a86f0', conejo: '#ec4899', mapache: '#8b5cf6',
      nutria: '#06b6d4', loro: '#fbbf24', zorro: '#f97316', lince: '#a855f7',
      lobo: '#ef4444', tortuga: '#22c55e', hormiga: '#78350f', abeja: '#eab308',
      castor: '#b45309', aguila: '#3b82f6', buho: '#6366f1', panda: '#6b7280',
      sloth: '#78716c', elefante: '#6b7280', octopus: '#ec4899',
      leon: '#fbbf24', dragon: '#d946ef', fenix: '#ef4444',
      hamster: '#f97316', pez: '#06b6d4', cuyo: '#8b5cf6', raton: '#ec4899', rana: '#22c55e'
    };
    return colors[id] || '#10b981';
  }

  getSelectedAvatarIcon(): string {
    const current = this.selectedAvatar();
    if (['buho', 'aguila', 'fenix'].includes(current)) return 'fa-crow';
    if (['panda', 'sloth'].includes(current)) return 'fa-spa';
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
      case 'sloth': return '🦥';
      case 'leon': return '🦁';
      case 'dragon': return '🐉';
      case 'fenix': return '🔥';
      case 'tortuga': return '🐢';
      case 'abeja': return '🐝';
      case 'castor': return '🦫';
      case 'aguila': return '🦅';
      case 'hormiga': return '🐜';
      case 'hamster': return '🐹';
      case 'pez': return '🐟';
      case 'cuyo': return '🐹';
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
      case 'lobo': return 'Samurai';
      case 'zorro': return 'Ninja';
      case 'buho': return 'Estratega';
      case 'lince': return 'Explorador';
      case 'panda': return 'Zen';
      case 'sloth': return 'Calma';
      case 'leon': return 'Shogun';
      case 'dragon': return 'Señor del Ego';
      case 'fenix': return 'Inmortal';
      case 'hamster': return 'Veloz';
      case 'pez': return 'Fluido';
      case 'cuyo': return 'Tierno';
      case 'raton': return 'Astuto';
      case 'rana': return 'Saltarina';
      default: return 'Guerrero';
    }
  }
}
