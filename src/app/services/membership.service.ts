import { Injectable, signal, effect } from '@angular/core';

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

  // Cosméticos desbloqueados
  unlockedAvatars = signal<string[]>(
    JSON.parse(localStorage.getItem('procrastina-unlocked-avatars') || '["zorro"]')
  );
  unlockedThemes = signal<string[]>(
    JSON.parse(localStorage.getItem('procrastina-unlocked-themes') || '["samurai"]')
  );

  // Perfil del usuario
  userName = signal<string>(
    localStorage.getItem('procrastina-user-name') || 'Ramiro'
  );
  selectedAvatar = signal<'lobo' | 'leon' | 'buho' | 'zorro' | 'dragon'>(
    (localStorage.getItem('procrastina-avatar') as any) || 'zorro'
  );
  selectedTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>(
    (localStorage.getItem('procrastina-theme') as any) || 'samurai'
  );

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
}
