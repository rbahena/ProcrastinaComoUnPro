import { Injectable, signal, computed, inject } from '@angular/core';
import { MembershipService } from './membership.service';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';

export interface ComunidadBoss {
  name: string;
  maxHp: number;
  currentHp: number;
  type: 'samurai' | 'cyberpunk' | 'zen' | 'aurora' | 'siren' | 'werewolf' | 'vampire' | string;
  status: 'active' | 'defeated';
}

@Injectable({
  providedIn: 'root'
})
export class ComunidadBossService {
  private membership = inject(MembershipService);
  private supabaseService = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  // State signals - sincronizados 100% con Supabase
  activeBoss = signal<ComunidadBoss>({
    name: 'Jefe de la Comunidad',
    maxHp: 9000,
    currentHp: 9000,
    type: 'siren',
    status: 'active'
  });

  comunidadShield = signal<number>(1000);
  maxComunidadShield = 1000;

  // Logs de eventos en tiempo real de la Comunidad
  bossLogs = signal<string[]>([]);

  // Daño acumulado infligido por el usuario
  userDamageDealt = signal<number>(0);

  // Bandera para animación de impacto
  isUnderAttack = signal<boolean>(false);

  // Porcentaje dinámico de HP del Jefe
  hpPercent = computed(() => {
    const boss = this.activeBoss();
    if (!boss || boss.maxHp <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((boss.currentHp / boss.maxHp) * 100)));
  });

  // Porcentaje dinámico del Escudo Comunitario
  shieldPercent = computed(() => {
    return Math.max(0, Math.min(100, Math.round((this.comunidadShield() / this.maxComunidadShield) * 100)));
  });

  constructor() {
    // 1. Cargar caché local persistido
    const saved = localStorage.getItem('comunidad-boss-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.boss) this.activeBoss.set(parsed.boss);
        if (parsed.shield !== undefined) this.comunidadShield.set(parsed.shield);
        if (parsed.logs && Array.isArray(parsed.logs)) this.bossLogs.set(parsed.logs);
        if (parsed.userDamageDealt !== undefined) this.userDamageDealt.set(parsed.userDamageDealt);
      } catch (e) {
        // Fallback silencioso
      }
    }

    // 2. Cargar datos reales y vivos de Supabase
    this.loadBossFromSupabase();
    this.setupRealtime();
  }

  async loadBossFromSupabase() {
    if (!this.supabaseService.isConfigured()) return;

    try {
      const { boss, error } = await this.supabaseService.getActiveBoss();
      if (!error && boss) {
        const bossName = typeof boss.name === 'object' ? (boss.name.es || 'Jefe de la Comunidad') : (boss.name || 'Jefe de la Comunidad');
        this.activeBoss.set({
          name: bossName,
          maxHp: boss.max_hp,
          currentHp: boss.current_hp,
          type: boss.boss_type || 'siren',
          status: boss.status
        });
        this.comunidadShield.set(boss.community_shield ?? 1000);

        // Cargar eventos recientes del feed de combate desde Supabase
        const { events } = await this.supabaseService.getRecentBossEvents(boss.id, 20);
        if (events && events.length > 0) {
          const logMessages = events.map(ev => ev.message).filter(Boolean);
          if (logMessages.length > 0) {
            this.bossLogs.set(logMessages);
          }
        }

        // Cargar daño total acumulado por el usuario actual desde Supabase
        const user = await this.supabaseService.getCurrentUser();
        if (user) {
          const { data: userAttacks } = await this.supabaseService.client
            .from('community_boss_attacks')
            .select('damage_dealt')
            .eq('user_id', user.id)
            .gt('damage_dealt', 0);

          if (userAttacks && userAttacks.length > 0) {
            const totalDamage = userAttacks.reduce((sum: number, att: any) => sum + (att.damage_dealt || 0), 0);
            this.userDamageDealt.set(totalDamage);
          }
        }

        this.saveState();
      }
    } catch (e) {
      console.warn('[ComunidadBossService load error]', e);
    }
  }

  private setupRealtime() {
    if (!this.supabaseService.isConfigured()) return;

    this.supabaseService.client
      .channel('public:community_bosses_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_bosses' }, (payload: any) => {
        if (payload.new) {
          const row = payload.new;
          if (row.is_current_active || row.id === this.activeBoss().type || row.boss_type === this.activeBoss().type) {
            const bossName = typeof row.name === 'object' ? (row.name.es || 'Jefe de la Comunidad') : (row.name || 'Jefe de la Comunidad');
            this.activeBoss.set({
              name: bossName,
              maxHp: row.max_hp,
              currentHp: row.current_hp,
              type: row.boss_type || row.id || 'siren',
              status: row.status
            });
            if (row.community_shield !== undefined) {
              this.comunidadShield.set(row.community_shield);
            }
            this.saveState();
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_boss_attacks' }, (payload: any) => {
        if (payload.new && payload.new.message) {
          this.addLog(payload.new.message);
        }
      })
      .subscribe();
  }

  private saveState() {
    const email = localStorage.getItem('procrastina-current-user-email');
    if (!email) return;
    localStorage.setItem('comunidad-boss-state', JSON.stringify({
      boss: this.activeBoss(),
      shield: this.comunidadShield(),
      logs: this.bossLogs(),
      userDamageDealt: this.userDamageDealt()
    }));
  }

  // Infligir daño directo al Jefe (exclusivo para planes Premium)
  dealDamage(amount: number) {
    if (!this.membership.isPremium() || amount <= 0) {
      return; // Los planes básicos no pueden afectar al jefe ni aportar daño, y daño <= 0 no aplica
    }

    const finalAmount = amount;

    // Incrementar daño total del usuario
    this.userDamageDealt.update(d => d + finalAmount);

    // Enviar transacción a Supabase RPC
    if (this.supabaseService.isConfigured()) {
      this.supabaseService.dealBossDamage(
        this.activeBoss().type,
        finalAmount,
        false,
        this.membership.userName() || 'Guerrero'
      ).then(res => {
        if (res.success && res.result) {
          const r = res.result;
          if (r.current_hp !== undefined) {
            this.activeBoss.update(boss => ({
              ...boss,
              currentHp: r.current_hp,
              status: r.is_defeated ? 'defeated' : 'active'
            }));
          }
        }
      }).catch(err => console.warn('[Supabase Boss Damage Error]', err));
    }

    // Actualizar estado local inmediato (optimista)
    this.activeBoss.update(boss => {
      if (boss.status === 'defeated') return boss;

      const newHp = Math.max(0, boss.currentHp - finalAmount);
      const isDefeated = newHp <= 0;

      if (isDefeated) {
        this.addLog(`🏆 ¡VICTORIA! La comunidad ha derrotado a ${boss.name}.`);
        this.addLog(`💰 Recompensa otorgada: +150 Pro Coins a todos los participantes.`);
        this.membership.proCoins.update(c => c + 150);
        this.notificationService.notifyBossDefeated(boss.name, 150);
        return { ...boss, currentHp: 0, status: 'defeated' };
      } else {
        const text = `⚔️ Has infligido ${finalAmount} de daño con tu Pomodoro.`;
        this.addLog(text);
        return { ...boss, currentHp: newHp };
      }
    });

    this.saveState();
  }

  // Curación del jefe por distracción o abandono del usuario (exclusivo de planes Premium en comunidad)
  healBoss(playerName: string, customHealAmount?: number) {
    if (!this.membership.isPremium()) {
      return; // Los planes básicos no afectan al jefe
    }

    const equippedAvatar = this.membership.selectedAvatar() || 'gato';
    const healAmount = customHealAmount ?? this.membership.getAvatarHealPoints(equippedAvatar);

    if (this.supabaseService.isConfigured()) {
      this.supabaseService.healBossFromDistraction(
        this.activeBoss().type,
        playerName
      ).catch(err => console.warn('[Supabase Boss Heal Error]', err));
    }

    this.activeBoss.update(boss => {
      if (boss.status === 'defeated') return boss;

      const newHp = Math.min(boss.maxHp, boss.currentHp + healAmount);

      this.addLog(`🩸 El jefe recuperó +${healAmount} HP debido a la distracción de ${playerName}.`);
      return { ...boss, currentHp: newHp };
    });

    // Reducir escudo comunitario
    this.comunidadShield.update(shield => {
      const newShield = Math.max(0, shield - 40);
      if (newShield === 0 && shield > 0) {
        this.addLog(`⚠️ El escudo de la Comunidad ha colapsado. ¡El Jefe ataca con fuerza!`);
      }
      return newShield;
    });

    this.saveState();
  }

  // Daño continuo colectivo deshabilitado para evitar daño fantasma
  tickContinuousDamage(_activeUsers: number) {
    // Daño continuo deshabilitado: el daño al jefe solo ocurre cuando un usuario real completa un Pomodoro
  }

  addLog(text: string) {
    this.bossLogs.update(logs => {
      const updated = [text, ...logs];
      return updated.slice(0, 30);
    });

    const lowercaseText = text.toLowerCase();
    if (lowercaseText.includes('atacó') || lowercaseText.includes('daño') || lowercaseText.includes('infligió') || lowercaseText.includes('crítico')) {
      this.isUnderAttack.set(true);
      setTimeout(() => this.isUnderAttack.set(false), 400);
    }
  }

  // Cambiar jefe activo en Supabase
  async switchBoss(bossType: string) {
    if (this.supabaseService.isConfigured()) {
      await this.supabaseService.switchActiveBoss(bossType);
      await this.loadBossFromSupabase();
    }
  }

  // Restablecer vida del jefe
  resetBoss() {
    this.activeBoss.update(boss => ({
      ...boss,
      currentHp: boss.maxHp,
      status: 'active'
    }));
    this.comunidadShield.set(this.maxComunidadShield);
    this.bossLogs.set([
      '⚔️ ¡La Comunidad de Concentración se ha restablecido!',
      `👾 El jefe ${this.activeBoss().name} ha recuperado toda su energía.`
    ]);
    this.saveState();
  }
}
