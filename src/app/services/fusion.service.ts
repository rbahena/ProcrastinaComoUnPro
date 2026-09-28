import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import { MembershipService } from './membership.service';
import { SupabaseService, CommunityLeaderboardUser } from './supabase.service';
import { ComunidadBossService } from './comunidad-boss.service';

export interface ActiveFusionPartner {
  id: string;
  name: string;
  avatar: string;
  avatarId: string;
  theme: string;
  streakDays: number;
  todayTomatoes: number;
  totalFocusMinutes: number;
  fusionTitle: string;
  fusionLevel: number;
  synergyPercent: number;
  synergyPoints: number;
  activeStatus: 'online' | 'focusing' | 'idle';
  currentFocusTask?: string;
  buffs: {
    bossDamageBonus: number; // e.g. +20%
    extraProCoins: number;   // e.g. +2
    streakShieldActive: boolean;
  };
  connectedAt: string;
  lastPulseAt?: string;
}

export interface FusionCandidate {
  id: string;
  name: string;
  avatar: string;
  avatarId: string;
  theme: string;
  archetype: string;
  element: string;
  levelRank: string;
  streakDays: number;
  todayTomatoes: number;
  focusPoints: number;
  compatibilityScore: number; // 0 to 100%
  synergyBonusText: string;
  isOnline: boolean;
  status: 'available' | 'pending' | 'connected';
}

export interface DuoMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  unit: string;
  rewardCoins: number;
  rewardSynergy: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FusionService {
  private membership = inject(MembershipService);
  private supabaseService = inject(SupabaseService);
  private bossService = inject(ComunidadBossService);

  private readonly STORAGE_KEY = 'cofu_active_fusion_data';

  // Pareja actualmente vinculada (null si no tiene)
  activeFusion = signal<ActiveFusionPartner | null>(null);

  // Lista de candidatos de la comunidad para fusión
  communityCandidates = signal<FusionCandidate[]>([]);

  // Estado de carga
  isLoadingCandidates = signal<boolean>(false);

  // Misiones activas del Dúo
  duoMissions = signal<DuoMission[]>([
    {
      id: 'm1',
      title: 'Doble Impacto al Jefe',
      description: 'Completen entre ambos al menos 4 pomodoros de concentración hoy.',
      icon: 'fa-solid fa-fire-flame-curved',
      target: 4,
      current: 2,
      unit: 'pomodoros',
      rewardCoins: 35,
      rewardSynergy: 25,
      isCompleted: false,
      isClaimed: false
    },
    {
      id: 'm2',
      title: 'Sincronía Elemental',
      description: 'Acumulen 60 minutos de enfoque conjunto en el transcurso del día.',
      icon: 'fa-solid fa-bolt',
      target: 60,
      current: 45,
      unit: 'minutos',
      rewardCoins: 50,
      rewardSynergy: 40,
      isCompleted: false,
      isClaimed: false
    },
    {
      id: 'm3',
      title: 'Guardia de Racha Inquebrantable',
      description: 'Mantengan ambos su racha activa por 3 días consecutivos de alianza.',
      icon: 'fa-solid fa-shield-halved',
      target: 3,
      current: 1,
      unit: 'días',
      rewardCoins: 80,
      rewardSynergy: 60,
      isCompleted: false,
      isClaimed: false
    }
  ]);

  // Mensajes y alertas de pulso en vivo
  latestSynergyPulse = signal<{ sender: string; message: string; timestamp: Date } | null>(null);

  // Tiene fusión activa
  hasActiveFusion = computed(() => this.activeFusion() !== null);

  // Multiplicador de daño activo por fusión
  fusionBossDamageMultiplier = computed(() => {
    const fusion = this.activeFusion();
    if (!fusion) return 1.0;
    return 1.0 + (fusion.buffs.bossDamageBonus / 100);
  });

  // Monedas adicionales por sesión por fusión
  fusionExtraCoins = computed(() => {
    const fusion = this.activeFusion();
    if (!fusion) return 0;
    return fusion.buffs.extraProCoins;
  });

  constructor() {
    this.loadPersistedFusion();
    this.refreshCandidates();
  }

  /**
   * Carga la fusión guardada localmente
   */
  private loadPersistedFusion() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) {
          this.activeFusion.set(parsed);
          this.updateMissionProgressFromStats(parsed);
        }
      }
    } catch (e) {
      console.warn('Error loading persisted fusion state:', e);
    }
  }

  /**
   * Guarda el estado de la fusión activa
   */
  private savePersistedFusion(fusion: ActiveFusionPartner | null) {
    if (fusion) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fusion));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Carga usuarios de la comunidad y calcula afinidad algorítmica con el usuario actual
   */
  async refreshCandidates() {
    this.isLoadingCandidates.set(true);

    try {
      const { data } = await this.supabaseService.getCommunityHomeDashboard();
      const myStreak = this.membership.streak();
      const myTomatoes = this.membership.focusTomatoes();
      const myAvatar = this.membership.selectedAvatar() || 'gato';

      const allUsers: CommunityLeaderboardUser[] = [
        ...(data?.podium || []),
        ...(data?.top_records || []),
        ...(data?.recent_avatars || [])
      ];

      // Eliminar duplicados y el usuario actual si aplica
      const uniqueUsersMap = new Map<string, CommunityLeaderboardUser>();
      allUsers.forEach(u => {
        if (u.id && u.username && !uniqueUsersMap.has(u.id)) {
          uniqueUsersMap.set(u.id, u);
        }
      });

      // Si hay pocos usuarios en Supabase, agregamos guerreros del dojo arquetípicos para variedad
      const defaultCandidates: CommunityLeaderboardUser[] = [
        { id: 'usr-kaito', username: 'Kaito_Shadow', selected_avatar: 'sombra_zen', selected_theme: 'zen', streak_days: Math.max(1, myStreak + 1), focus_tomatoes: Math.max(2, myTomatoes + 1), focus_points: 340 },
        { id: 'usr-valeria', username: 'Val_CyberBlade', selected_avatar: 'neon_runner', selected_theme: 'cyberpunk', streak_days: Math.max(1, myStreak), focus_tomatoes: Math.max(1, myTomatoes), focus_points: 290 },
        { id: 'usr-ren', username: 'Sensei_Ren', selected_avatar: 'lobo_fuego', selected_theme: 'samurai', streak_days: Math.max(2, myStreak + 2), focus_tomatoes: Math.max(3, myTomatoes + 2), focus_points: 520 },
        { id: 'usr-elena', username: 'Elena_Astral', selected_avatar: 'kitsune_mistico', selected_theme: 'aurora', streak_days: Math.max(1, myStreak - 1), focus_tomatoes: Math.max(1, myTomatoes), focus_points: 210 },
        { id: 'usr-dante', username: 'Dante_Ronin', selected_avatar: 'dragon_samurai', selected_theme: 'samurai', streak_days: Math.max(1, myStreak), focus_tomatoes: Math.max(2, myTomatoes), focus_points: 410 }
      ];

      defaultCandidates.forEach(dc => {
        if (!uniqueUsersMap.has(dc.id)) {
          uniqueUsersMap.set(dc.id, dc);
        }
      });

      const currentActiveId = this.activeFusion()?.id;

      // Calcular afinidad algorítmica para cada uno
      const candidates: FusionCandidate[] = Array.from(uniqueUsersMap.values()).map(u => {
        const uStreak = u.streak_days || 1;
        const uTomatoes = u.focus_tomatoes || 1;

        // 1. Cercanía de racha (máx 40 pts)
        const streakDiff = Math.abs(myStreak - uStreak);
        const streakScore = Math.max(10, 40 - (streakDiff * 5));

        // 2. Cercanía de volumen de concentración hoy (máx 35 pts)
        const tomatoDiff = Math.abs(myTomatoes - uTomatoes);
        const tomatoScore = Math.max(10, 35 - (tomatoDiff * 4));

        // 3. Sinergia elemental complementaria (máx 25 pts)
        const elementBonus = (u.selected_theme === 'cyberpunk' || u.selected_theme === 'aurora') ? 25 : 22;

        const totalScore = Math.min(99, Math.max(65, streakScore + tomatoScore + elementBonus));

        const isCurrent = currentActiveId === u.id;

        return {
          id: u.id,
          name: u.username,
          avatar: this.resolveAvatarUrl(u.selected_avatar),
          avatarId: u.selected_avatar || 'dragon_samurai',
          theme: u.selected_theme || 'samurai',
          archetype: this.getArchetypeName(u.selected_avatar),
          element: this.getElementName(u.selected_theme),
          levelRank: this.calculateRankLabel(uStreak, u.focus_points || 200),
          streakDays: uStreak,
          todayTomatoes: uTomatoes,
          focusPoints: u.focus_points || 250,
          compatibilityScore: totalScore,
          synergyBonusText: this.getSynergyBonusDescription(u.selected_theme),
          isOnline: true,
          status: isCurrent ? 'connected' : 'available'
        };
      });

      // Ordenar por afinidad descendente
      candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
      this.communityCandidates.set(candidates);
    } catch (err) {
      console.error('Error refreshing fusion candidates:', err);
    } finally {
      this.isLoadingCandidates.set(false);
    }
  }

  /**
   * Inicia el pacto de Fusión con un compañero
   */
  startFusion(candidate: FusionCandidate) {
    const myAvatarName = this.membership.selectedAvatar() || 'Guerrero';
    const comboTitle = this.generateFusionTitle(myAvatarName, candidate.archetype);

    const newFusion: ActiveFusionPartner = {
      id: candidate.id,
      name: candidate.name,
      avatar: candidate.avatar,
      avatarId: candidate.avatarId,
      theme: candidate.theme,
      streakDays: candidate.streakDays,
      todayTomatoes: candidate.todayTomatoes,
      totalFocusMinutes: candidate.streakDays * 45,
      fusionTitle: comboTitle,
      fusionLevel: 1,
      synergyPercent: 65,
      synergyPoints: 120,
      activeStatus: 'focusing',
      currentFocusTask: 'Investigación & Desarrollo Profundo',
      buffs: {
        bossDamageBonus: 20, // +20% daño extra
        extraProCoins: 2,   // +2 ProCoins extra por pomodoro
        streakShieldActive: true
      },
      connectedAt: new Date().toISOString()
    };

    this.activeFusion.set(newFusion);
    this.savePersistedFusion(newFusion);

    // Actualizar estado en la lista
    this.communityCandidates.update(list =>
      list.map(c => ({
        ...c,
        status: c.id === candidate.id ? 'connected' : 'available'
      }))
    );

    // Mensaje de feedback
    this.latestSynergyPulse.set({
      sender: candidate.name,
      message: `¡Pacto de Fusión activado! Juntos desataremos el poder de ${comboTitle}.`,
      timestamp: new Date()
    });

    // Actualizar progreso inicial de misiones
    this.updateMissionProgressFromStats(newFusion);
  }

  /**
   * Envía un pulso de resonancia/energía al compañero
   */
  sendSynergyPulse(): boolean {
    const fusion = this.activeFusion();
    if (!fusion) return false;

    const motivationalPulses = [
      '¡Siente el poder de nuestra concentración combinada! ⚡',
      '¡Entrando en la Zona de Máximo Enfoque! Mantén el ritmo 🔥',
      '¡El Jefe Comunitario no resistirá nuestro ataque sincronizado! ⚔️',
      '¡Tu esfuerzo potencia mi disciplina! Sigamos adelante 🧘‍♂️'
    ];

    const randomMsg = motivationalPulses[Math.floor(Math.random() * motivationalPulses.length)];

    // Incrementar sinergia
    const newSynergy = Math.min(100, fusion.synergyPercent + 5);
    const newPoints = fusion.synergyPoints + 15;
    const newLevel = newSynergy >= 90 ? 3 : (newSynergy >= 75 ? 2 : 1);

    const updated: ActiveFusionPartner = {
      ...fusion,
      synergyPercent: newSynergy,
      synergyPoints: newPoints,
      fusionLevel: newLevel,
      lastPulseAt: new Date().toISOString(),
      buffs: {
        bossDamageBonus: newLevel === 3 ? 30 : (newLevel === 2 ? 25 : 20),
        extraProCoins: newLevel === 3 ? 3 : 2,
        streakShieldActive: true
      }
    };

    this.activeFusion.set(updated);
    this.savePersistedFusion(updated);

    this.latestSynergyPulse.set({
      sender: 'Tú',
      message: randomMsg,
      timestamp: new Date()
    });

    return true;
  }

  /**
   * Reclama la recompensa de una misión de Dúo
   */
  claimMission(missionId: string): boolean {
    let claimedCoins = 0;

    this.duoMissions.update(missions =>
      missions.map(m => {
        if (m.id === missionId && m.isCompleted && !m.isClaimed) {
          claimedCoins = m.rewardCoins;
          return { ...m, isClaimed: true };
        }
        return m;
      })
    );

    if (claimedCoins > 0) {
      this.membership.proCoins.update(c => c + claimedCoins);
      return true;
    }
    return false;
  }

  /**
   * Disuelve el vínculo de Fusión
   */
  dissolveFusion() {
    const current = this.activeFusion();
    if (!current) return;

    this.activeFusion.set(null);
    this.savePersistedFusion(null);

    this.communityCandidates.update(list =>
      list.map(c => ({
        ...c,
        status: 'available'
      }))
    );

    this.latestSynergyPulse.set(null);
  }

  /**
   * Incrementa el progreso de pomodoros conjuntos cuando el usuario completa un pomodoro
   */
  onPomodoroCompleted() {
    const fusion = this.activeFusion();
    if (!fusion) return;

    // Aumentar sinergia y actualizar misiones
    const newSynergy = Math.min(100, fusion.synergyPercent + 8);
    const newPoints = fusion.synergyPoints + 20;

    const updated: ActiveFusionPartner = {
      ...fusion,
      synergyPercent: newSynergy,
      synergyPoints: newPoints
    };
    this.activeFusion.set(updated);
    this.savePersistedFusion(updated);

    // Actualizar misiones de dúo
    this.duoMissions.update(missions =>
      missions.map(m => {
        if (m.id === 'm1') {
          const next = Math.min(m.target, m.current + 1);
          return { ...m, current: next, isCompleted: next >= m.target };
        }
        if (m.id === 'm2') {
          const next = Math.min(m.target, m.current + 25);
          return { ...m, current: next, isCompleted: next >= m.target };
        }
        return m;
      })
    );
  }

  private updateMissionProgressFromStats(fusion: ActiveFusionPartner) {
    const myTomatoes = this.membership.focusTomatoes();
    const combinedTomatoes = myTomatoes + fusion.todayTomatoes;

    this.duoMissions.update(missions =>
      missions.map(m => {
        if (m.id === 'm1') {
          const next = Math.min(m.target, Math.max(m.current, combinedTomatoes));
          return { ...m, current: next, isCompleted: next >= m.target };
        }
        return m;
      })
    );
  }

  private resolveAvatarUrl(avatarKey?: string): string {
    if (!avatarKey) return '/assets/images/avatars/cat_samurai.webp';
    if (avatarKey.startsWith('http') || avatarKey.startsWith('/assets/')) return avatarKey;
    return `/assets/images/avatars/${avatarKey}.webp`;
  }

  private getArchetypeName(avatarKey?: string): string {
    if (!avatarKey) return 'Guerrero Zen';
    if (avatarKey.includes('dragon') || avatarKey.includes('samurai')) return 'Cazador Disciplinado';
    if (avatarKey.includes('cyber') || avatarKey.includes('neon')) return 'Hacker de Enfoque';
    if (avatarKey.includes('zen') || avatarKey.includes('sombra')) return 'Maestro del Silencio';
    if (avatarKey.includes('lobo')) return 'Centinela Feroz';
    if (avatarKey.includes('kitsune') || avatarKey.includes('aurora')) return 'Oráculo Cósmico';
    return 'Guerrero de Concentración';
  }

  private getElementName(theme?: string): string {
    switch (theme) {
      case 'samurai': return 'Fuego / Bushido';
      case 'cyberpunk': return 'Rayo / Neón';
      case 'zen': return 'Viento / Éter';
      case 'aurora': return 'Luz / Cósmico';
      default: return 'Espíritu / Dojo';
    }
  }

  private calculateRankLabel(streak: number, points: number): string {
    if (streak >= 14 || points >= 500) return 'Rango Diamante (Gran Maestro)';
    if (streak >= 7 || points >= 300) return 'Rango Oro (Guerrero Veterano)';
    if (streak >= 3 || points >= 150) return 'Rango Plata (Adepto en Ascenso)';
    return 'Rango Bronce (Iniciado)';
  }

  private getSynergyBonusDescription(theme?: string): string {
    switch (theme) {
      case 'cyberpunk': return '+25% Daño Crítico en Ráfagas de 25 min';
      case 'aurora': return '+2 Monedas Adicionales por cada Tomate';
      case 'zen': return 'Inmunidad de Racha: Protege 1 día de desconexión';
      default: return '+20% Daño al Jefe de la Comunidad';
    }
  }

  private generateFusionTitle(myAvatar: string, partnerArchetype: string): string {
    const titles = [
      'Sinergia Centinela Cósmico',
      'Vórtice de Enfoque Trascendental',
      'Fusión Bushido-Neón',
      'Alianza de Voluntad Inquebrantable',
      'Oráculo del Dojo Imperial'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }
}
