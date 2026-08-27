import { Injectable, signal, computed, inject } from '@angular/core';
import { MembershipService } from './membership.service';

export interface ComunidadBoss {
  name: string;
  maxHp: number;
  currentHp: number;
  type: 'samurai' | 'cyberpunk' | 'zen' | 'aurora' | 'siren' | 'werewolf' | 'vampire';
  status: 'active' | 'defeated';
}

@Injectable({
  providedIn: 'root'
})
export class ComunidadBossService {
  private membership = inject(MembershipService);

  // Boss configurations depending on the active theme
  private bossCatalog: Record<string, Omit<ComunidadBoss, 'currentHp' | 'status'>> = {
    samurai: {
      name: 'La Hidra de las Tareas Interminables',
      maxHp: 12000,
      type: 'samurai'
    },
    cyberpunk: {
      name: 'El Kraken del Caos y Pendientes',
      maxHp: 10000,
      type: 'cyberpunk'
    },
    zen: {
      name: 'El Basilisco de la Parálisis y Bloqueo',
      maxHp: 8000,
      type: 'zen'
    },
    aurora: {
      name: 'La Quimera de la Multitarea',
      maxHp: 15000,
      type: 'aurora'
    },
    siren: {
      name: 'La Sirena de las Distracciones',
      maxHp: 9000,
      type: 'siren'
    },
    werewolf: {
      name: 'El Hombre Lobo de la Madrugada',
      maxHp: 16000,
      type: 'werewolf'
    },
    vampire: {
      name: 'El Vampiro del Insomnio',
      maxHp: 18000,
      type: 'vampire'
    }
  };

  // State signals
  activeBoss = signal<ComunidadBoss>({
    name: 'La Sirena de las Distracciones',
    maxHp: 9000,
    currentHp: 6750,
    type: 'siren',
    status: 'active'
  });

  comunidadShield = signal<number>(850);
  maxComunidadShield = 1000;

  // Active weapon state
  activeWeaponId = signal<string>('katana_wood');

  // Computes active damage multiplier based on equipped weapon
  activeDamageMultiplier = computed(() => {
    const id = this.activeWeaponId();
    if (id === 'katana_steel') return 1.25;
    if (id === 'laser_saber') return 1.30;
    if (id === 'sage_staff') return 1.20;
    if (id === 'solar_spear') return 1.40;
    return 1.10; // wood bokken default
  });

  // Logs of events in the Comunidad Raid
  bossLogs = signal<string[]>([
    '⚔️ ¡La Comunidad de Concentración está activa!',
    '👾 La Sirena de las Distracciones ha invadido la Zona de Enfoque.'
  ]);

  // Accrued boss damage dealt by the user
  userDamageDealt = signal<number>(1450);

  // Tracks if the boss card is currently being hit to trigger UI flashing
  isUnderAttack = signal<boolean>(false);

  // Compute percentage of Boss HP
  hpPercent = computed(() => {
    const boss = this.activeBoss();
    return Math.max(0, Math.round((boss.currentHp / boss.maxHp) * 100));
  });

  // Compute percentage of Comunidad Shield
  shieldPercent = computed(() => {
    return Math.max(0, Math.round((this.comunidadShield() / this.maxComunidadShield) * 100));
  });

  constructor() {
    // Load saved boss health if available
    const saved = localStorage.getItem('comunidad-boss-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.boss && parsed.boss.type === 'siren') {
          this.activeBoss.set(parsed.boss);
          this.comunidadShield.set(parsed.shield || 850);
          if (parsed.logs) this.bossLogs.set(parsed.logs);
          if (parsed.userDamageDealt !== undefined) this.userDamageDealt.set(parsed.userDamageDealt);
        } else {
          this.saveState();
        }
      } catch (e) {
        // Fallback to default
      }
    } else {
      this.saveState();
    }

    // Load active weapon
    const activeWeapon = localStorage.getItem('active-weapon-id') || 'katana_wood';
    this.activeWeaponId.set(activeWeapon);
  }

  private saveState() {
    localStorage.setItem('comunidad-boss-state', JSON.stringify({
      boss: this.activeBoss(),
      shield: this.comunidadShield(),
      logs: this.bossLogs(),
      userDamageDealt: this.userDamageDealt()
    }));
  }

  equipWeapon(id: string) {
    this.activeWeaponId.set(id);
    localStorage.setItem('active-weapon-id', id);
    this.addLog(`🛡️ Has equipado tu ${this.getWeaponName(id)}.`);
  }

  getWeaponName(id: string): string {
    if (id === 'katana_steel') return 'Katana del Altar';
    if (id === 'laser_saber') return 'Sable de Luz Neón';
    if (id === 'sage_staff') return 'Bastón de Bambú Sabio';
    if (id === 'solar_spear') return 'Lanza del Alba Solar';
    return 'Bokken de Entrenamiento';
  }

  // Update boss metadata when the theme changes
  updateBossTheme(theme: string) {
    const key = theme in this.bossCatalog ? theme : 'samurai';
    const config = this.bossCatalog[key];
    
    this.activeBoss.update(boss => {
      // If the current boss has already been defeated or type is different, spawn new/matching boss
      if (boss.type !== config.type || boss.status === 'defeated') {
        const newHp = Math.round(config.maxHp * 0.75); // Start at 75% for demo
        this.addLog(`👾 Ha aparecido un nuevo oponente: ${config.name}.`);
        return {
          name: config.name,
          maxHp: config.maxHp,
          currentHp: newHp,
          type: config.type as any,
          status: 'active'
        };
      }
      return boss;
    });
    this.saveState();
  }

  // Deal direct damage
  dealDamage(amount: number, isCritical = false) {
    let finalAmount = amount;
    
    // Multiplicador del arma activa
    finalAmount = Math.round(finalAmount * this.activeDamageMultiplier());
    
    // Premium booster check
    if (this.membership.isPremium()) {
      finalAmount = Math.round(finalAmount * 1.25); // +25% premium damage
    }

    // Increment user damage dealt
    this.userDamageDealt.update(d => d + finalAmount);

    this.activeBoss.update(boss => {
      if (boss.status === 'defeated') return boss;
      
      const newHp = Math.max(0, boss.currentHp - finalAmount);
      const isDefeated = newHp <= 0;
      
      if (isDefeated) {
        this.addLog(`🏆 ¡VICTORIA! La comunidad ha derrotado a ${boss.name}.`);
        this.addLog(`💰 Recompensa otorgada: +150 Pro Coins a todos los participantes.`);
        this.membership.proCoins.update(c => c + 150);
        return { ...boss, currentHp: 0, status: 'defeated' };
      } else {
        const text = isCritical 
          ? `💥 ¡GOLPE CRÍTICO! Has infligido ${finalAmount} de daño con tu Sapo.` 
          : `⚔️ Has infligido ${finalAmount} de daño con tu Pomodoro.`;
        this.addLog(text);
        return { ...boss, currentHp: newHp };
      }
    });
    
    this.saveState();
  }

  // Heal boss due to user distraction/abandonment
  healBoss(playerName: string) {
    this.activeBoss.update(boss => {
      if (boss.status === 'defeated') return boss;

      const healAmount = Math.round(boss.maxHp * 0.02); // 2% healing
      const newHp = Math.min(boss.maxHp, boss.currentHp + healAmount);
      
      this.addLog(`🩸 El jefe recuperó +${healAmount} HP debido a la distracción de ${playerName}.`);
      return { ...boss, currentHp: newHp };
    });

    // Reduce comunidad shield
    this.comunidadShield.update(shield => {
      const newShield = Math.max(0, shield - 40);
      if (newShield === 0) {
        this.addLog(`⚠️ El escudo de la Comunidad ha colapsado. ¡El Oni ataca con fuerza!`);
      } else {
        this.addLog(`🛡️ El escudo comunitario absorbió el contraataque (-40 de escudo).`);
      }
      return newShield;
    });

    this.saveState();
  }

  // Live damage tick from other users in the comunidad
  tickContinuousDamage(activeUsers: number) {
    if (activeUsers <= 0) return;

    this.activeBoss.update(boss => {
      if (boss.status === 'defeated') return boss;
      
      // Each user deals 1 point of damage per tick
      const totalDamage = activeUsers;
      const newHp = Math.max(0, boss.currentHp - totalDamage);
      
      if (newHp <= 0) {
        this.addLog(`🏆 ¡VICTORIA! La comunidad unida derrotó a ${boss.name}.`);
        this.membership.proCoins.update(c => c + 150);
        return { ...boss, currentHp: 0, status: 'defeated' };
      }
      
      return { ...boss, currentHp: newHp };
    });
    this.saveState();
  }

  addLog(text: string) {
    this.bossLogs.update(logs => {
      const updated = [text, ...logs];
      return updated.slice(0, 30); // Keep last 30 logs
    });

    // Detect if this is an attack or damage event to trigger flash
    const lowercaseText = text.toLowerCase();
    if (lowercaseText.includes('atacó') || lowercaseText.includes('daño') || lowercaseText.includes('infligió') || lowercaseText.includes('crítico')) {
      this.isUnderAttack.set(true);
      setTimeout(() => this.isUnderAttack.set(false), 400);
    }
  }

  resetBoss() {
    const boss = this.activeBoss();
    const catalog = this.bossCatalog[boss.type] || this.bossCatalog['samurai'];
    this.activeBoss.set({
      name: catalog.name,
      maxHp: catalog.maxHp,
      currentHp: catalog.maxHp,
      type: catalog.type as any,
      status: 'active'
    });
    this.comunidadShield.set(1000);
    this.bossLogs.set([
      '⚔️ ¡La Comunidad de Concentración se ha restablecido!',
      `👾 Un nuevo ${catalog.name} ha surgido.`
    ]);
    this.saveState();
  }
}
