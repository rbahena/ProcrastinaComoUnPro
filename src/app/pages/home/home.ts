import { Component, signal, computed, OnInit, OnDestroy, WritableSignal, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { SupabaseService, CommunityLeaderboardUser, RankNeighborItem, WeeklyPodiumSnapshotData } from '../../services/supabase.service';
import { Navbar } from '../../components/navbar/navbar';

export interface PodiumDisplayItem {
  position: number;
  name: string;
  avatar: string;
  color: string;
  value: string;
  details?: string;
  score?: number;
  place: string;
  wins: number;
  gold_medals?: number;
  silver_medals?: number;
  bronze_medals?: number;
  country?: string;
  country_code?: string;
  flag_code?: string;
  flag?: string;
  isAssigned?: boolean;
  is_premium?: boolean;
}

export interface HistoricalRecordItem {
  rank: number;
  name: string;
  avatar: string;
  color: string;
  tomatoes: number;
  wins: number;
  gold_medals?: number;
  silver_medals?: number;
  bronze_medals?: number;
  isAssigned?: boolean;
  is_premium?: boolean;
}

export interface CommunityCompanionItem {
  id: string;
  name: string;
  avatar: string;
  color: string;
  wins: number;
  gold_medals?: number;
  silver_medals?: number;
  bronze_medals?: number;
  status?: 'focused' | 'break' | 'paused' | 'abandoned' | 'idle';
  mission?: string;
  is_premium?: boolean;
}

import { TranslatePipe, TranslationService } from '../../services/translation.service';
import { CompanionSimulatorService } from '../../services/companion-simulator.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  public membership = inject(MembershipService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public bossService = inject(ComunidadBossService);
  private supabaseService = inject(SupabaseService);
  public translation = inject(TranslationService);
  private simulator = inject(CompanionSimulatorService);
  private companionSimulatorInterval: any = null;
  private podiumCountdownInterval: any = null;
  showSuccessProToast = signal<boolean>(false);

  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  Math = Math;
  sidebarCollapsed!: any;

  // Métricas reales de la Comunidad
  liveFocusedUsersCount = signal<number>(1);
  liveCompletedObjectivesToday = signal<number>(0);
  liveUserRank = signal<number>(1);
  totalCommunityUsers = signal<number>(1);
  showGuide = signal<boolean>(false);

  toggleGuide() {
    this.showGuide.update(v => !v);
  }

  // Realtime & Presence
  private realtimeChannel: any = null;
  private communityPresenceChannel: any = null;
  private presenceClientId = 'home-' + Math.random().toString(36).substring(2, 9);
  private lastPresenceState: any = null;
  private rawRecentAvatars: CommunityLeaderboardUser[] = [];
  lastUpdated = signal('');

  // Compañeros clasificados: En Pomodoro vs En Campamento
  livePomodoroUsers = signal<CommunityCompanionItem[]>([]);
  livePomodoroUsersCount = signal<number>(1);
  liveCampUsers = signal<CommunityCompanionItem[]>([]);
  liveCampUsersCount = signal<number>(1);

  // Compañeros en vivo generales (fallback/legado)
  liveCommunityUsers = signal<CommunityCompanionItem[]>([]);

  // Vecinos en el ranking de tomates (2 arriba, tú, 2 abajo)
  rankNeighbors = signal<RankNeighborItem[]>([]);

  // Podio de Honor (Top 3 Campeones Vigentes en orden [2º, 1º, 3º] para la UI)
  topPodiumUsers = signal<PodiumDisplayItem[]>([]);

  // Semanas del Podio (Definición de Semana Premiada vs Semana Vigente en Curso)
  podiumWeekBadge = signal<string>('Semana anterior');
  podiumWeekRange = signal<string>('');
  currentWeekBadge = signal<string>('Semana en curso');
  currentWeekRange = signal<string>('');

  // Conteo regresivo para el próximo corte del podio semanal
  podiumCountdownDays = signal<number>(0);
  podiumCountdownHours = signal<number>(0);
  isPodiumCutoffUrgent = computed(() => this.podiumCountdownDays() <= 1);

  podiumCountdownText = computed(() => {
    const isEn = this.translation.currentLang() === 'en';
    const days = this.podiumCountdownDays();
    const hours = this.podiumCountdownHours();

    if (days > 1) {
      return isEn ? `Corte en ${days} días` : `Corte en ${days} días`;
    } else if (days === 1) {
      return isEn ? `Corte en 1 día` : `Corte en 1 día`;
    } else {
      return isEn
        ? (hours > 0 ? `Cutoff today (${hours}h)` : 'Cutoff imminent')
        : (hours > 0 ? `Corte hoy (${hours}h)` : 'Corte inminente');
    }
  });

  podiumCountdownTooltip = computed(() => {
    const isEn = this.translation.currentLang() === 'en';
    const days = this.podiumCountdownDays();
    const hours = this.podiumCountdownHours();
    const remainingLabel = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    return isEn
      ? `Next podium cutoff: Sunday 23:59 hrs (${remainingLabel} left)`
      : `Próximo corte del podio: Domingo 23:59 hrs (${remainingLabel} restantes)`;
  });

  // Carrera en Vivo (Top 1 al 5 en tiempo real)
  liveWeeklyTop5 = signal<PodiumDisplayItem[]>([]);

  // Siguientes 2 Lugares (4º y 5º puesto)
  topRunnersUp = signal<PodiumDisplayItem[]>([]);

  // Récords Históricos (Top 5 real por Pomodoros)
  topHistoricalRecords = signal<HistoricalRecordItem[]>([]);

  rankingData = computed(() => {
    return this.topPodiumUsers();
  });

  hasPodiumWinners = computed(() => {
    const list = this.topPodiumUsers();
    const live = this.liveWeeklyTop5();
    return (list && list.some(u => u.isAssigned)) || (live && live.some(u => u.isAssigned));
  });

  displayPomodoroCount = computed(() => {
    const count = this.livePomodoroUsersCount();
    return count > 20 ? '+20' : count.toString();
  });

  displayCampCount = computed(() => {
    const count = this.liveCampUsersCount();
    return count > 20 ? '+20' : count.toString();
  });

  featuredPomodoroCompanionName = computed(() => {
    const list = this.livePomodoroUsers();
    return list.length > 0 ? list[0].name : this.userName();
  });

  featuredCampCompanionName = computed(() => {
    const list = this.liveCampUsers();
    return list.length > 0 ? list[0].name : this.userName();
  });

  featuredCompanionName = computed(() => {
    const list = this.liveCommunityUsers();
    return list.length > 0 ? list[0].name : this.userName();
  });

  rankingPosition = computed(() => {
    if (!this.membership.isPremium()) {
      return Math.max(1, this.liveUserRank(), this.totalCommunityUsers());
    }
    return Math.max(1, this.liveUserRank());
  });

  percentageBeaten = computed(() => {
    if (!this.membership.isPremium()) {
      return 0;
    }
    const total = Math.max(1, this.totalCommunityUsers());
    const pos = this.rankingPosition();
    if (total <= 1) return 100;
    return Math.min(99, Math.max(1, Math.round(((total - pos) / total) * 100)));
  });

  potentialReward = computed(() => {
    if (!this.membership.isPremium()) {
      return 0;
    }
    const pos = this.rankingPosition();
    if (pos === 1) return 100;
    if (pos <= 3) return 70;
    if (pos <= 10) return 50;
    return 20;
  });

  // Mostrar modal de Paywall Premium
  showPaywallModal = signal(false);

  togglePremium() {
    this.membership.setPremium(!this.membership.isPremium());
  }

  // Filtro de Leaderboard de la Comunidad
  activeRankingFilter = signal<'semanal'>('semanal');

  // Lógica del Temporizador Pomodoro
  timeLeft = signal(25 * 60);
  totalSessionTime = signal(25 * 60);
  timerRunning = signal(false);
  isBreak = signal(false);
  private pomodoroTimer: any = null;

  labels = computed(() => {
    return {
      logoText: 'COFU',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Inicio',
      navZen: 'Zona de concentración',
      navTimer: 'Estadísticas',
      navShield: 'Baúl de ideas',
      title: 'La Comunidad',
      desc: 'Tu espacio mental para declarar objetivos de alto impacto.'
    };
  });

  // Formato del tiempo en MM:SS
  timeString = computed(() => {
    const min = Math.floor(this.timeLeft() / 60);
    const sec = this.timeLeft() % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  // Cálculo dinámico del strokeDashoffset para la circunferencia r=85 (Circumferencia = 534)
  strokeDashoffset = computed(() => {
    const total = this.totalSessionTime();
    const left = this.timeLeft();
    const pct = left / total;
    return 534 * (1 - pct);
  });

  constructor() {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;

    const initialDur = parseInt(this.membership.getFocusSetting('focus-duration', '25'), 10) || 25;
    this.totalSessionTime.set(initialDur * 60);
    this.timeLeft.set(initialDur * 60);
  }

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  getAvatarTitle(avatarId: string): string {
    return this.membership.getAvatarTitle(avatarId);
  }

  getSelectedAvatarColor(): string {
    const current = this.selectedAvatar();
    const avatar = this.membership.avatarsCatalog().find(a => a.id === current);
    return avatar ? avatar.color : 'var(--accent)';
  }

  private updateLastUpdatedTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.lastUpdated.set(timeStr);
  }

  private reloadDebounceTimeout: any = null;

  private triggerRealtimeReload() {
    if (this.reloadDebounceTimeout) {
      clearTimeout(this.reloadDebounceTimeout);
    }
    this.reloadDebounceTimeout = setTimeout(() => {
      this.loadDashboardFromSupabase();
    }, 250);
  }

  ngOnInit() {
    this.updateLastUpdatedTime();

    // 0. Detectar retorno exitoso de Stripe Checkout (prueba o suscripción Pro)
    this.route.queryParams.subscribe(async params => {
      const status = params['status'];
      const sessionId = params['session_id'];

      if (status === 'success') {
        try {
          if (sessionId) {
            await this.supabaseService.syncStripeSubscription(sessionId);
          }
          await this.membership.syncProfileFromSupabase();
          this.showSuccessProToast.set(true);
        } catch (e) {
          console.error('[Error al sincronizar retorno de Stripe en Home]', e);
        } finally {
          setTimeout(() => {
            this.showSuccessProToast.set(false);
            this.router.navigate([], { queryParams: {}, replaceUrl: true });
          }, 5000);
        }
      }
    });

    // 1. Cargar datos del dashboard desde Supabase
    this.loadDashboardFromSupabase();

    // 2. Suscribirse a cambios en tiempo real en la tabla profiles, focus_sessions y boss
    if (this.supabaseService.isConfigured()) {
      this.realtimeChannel = this.supabaseService.client
        .channel('public:profiles_home_dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          this.triggerRealtimeReload();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => {
          this.triggerRealtimeReload();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'community_boss_attacks' }, () => {
          this.triggerRealtimeReload();
        })
        .subscribe();

      // 3. Suscribirse al canal de presencia de la comunidad para clasificar Pomodoros vs Campamento
      this.communityPresenceChannel = this.supabaseService.client.channel('community_focus_room', {
        config: {
          presence: {
            key: this.presenceClientId
          }
        }
      });

      this.communityPresenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.communityPresenceChannel.presenceState();
          this.handlePresenceSync(state);
        })
        .subscribe();
    }

    // 4. Intervalo de actualización de compañeros simulados vivos (mantiene la sala viva dinámicamente)
    this.companionSimulatorInterval = setInterval(() => {
      this.updateCompanionsLists();
    }, 8000);

    // 5. Conteo regresivo para el próximo corte del podio semanal (se actualiza cada minuto)
    this.updatePodiumCountdown();
    this.podiumCountdownInterval = setInterval(() => {
      this.updatePodiumCountdown();
    }, 60000);
  }

  ngOnDestroy() {
    this.stopTimerLoop();
    if (this.companionSimulatorInterval) {
      clearInterval(this.companionSimulatorInterval);
      this.companionSimulatorInterval = null;
    }
    if (this.podiumCountdownInterval) {
      clearInterval(this.podiumCountdownInterval);
      this.podiumCountdownInterval = null;
    }
    if (this.reloadDebounceTimeout) {
      clearTimeout(this.reloadDebounceTimeout);
    }
    if (this.realtimeChannel && this.supabaseService.isConfigured()) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
    }
    if (this.communityPresenceChannel && this.supabaseService.isConfigured()) {
      this.supabaseService.client.removeChannel(this.communityPresenceChannel);
    }
  }

  async loadDashboardFromSupabase() {
    if (!this.supabaseService.isConfigured()) {
      const selfTomatoes = this.membership.focusTomatoes();
      this.liveFocusedUsersCount.set(1);
      this.liveCompletedObjectivesToday.set(0);
      this.totalCommunityUsers.set(1);
      this.processPodiumData([]);
      this.processHistoricalRecords([]);
      this.processRecentAvatars([]);
      return;
    }

    try {
      const { data, error } = await this.supabaseService.getCommunityHomeDashboard();
      if (error || !data) {
        this.liveFocusedUsersCount.set(1);
        this.liveCompletedObjectivesToday.set(0);
        this.totalCommunityUsers.set(1);
        this.processPodiumData([]);
        this.processHistoricalRecords([]);
        this.processRecentAvatars([]);
        return;
      }

      // 1. Conteo REAL de usuarios y sesiones completadas hoy
      const realUsersCount = Math.max(data.total_users || 0, 1);
      const realObjectivesToday = data.completed_today || 0;

      // 2. Ranking real del usuario por tomates y vecinos
      if (!this.membership.isPremium()) {
        // Filtrar cualquier item que represente al usuario actual para evitar duplicados en la lista de competidores superiores
        const rawOthers = (data.rank_neighbors || []).filter((n: RankNeighborItem) => !this.isUserItemSelf(n));
        const otherMembers = rawOthers.slice(-3);
        const highestOtherRank = otherMembers.reduce((max, m) => Math.max(max, m.rank || 0), 0);

        // El usuario del Plan Básico SIEMPRE debe quedar en el último lugar absoluto,
        // estrictamente por debajo de cualquier usuario mostrado arriba (sin empates ni posiciones duplicadas).
        const basicUserRank = Math.max(
          highestOtherRank + 1,
          rawOthers.length + 1,
          realUsersCount > highestOtherRank ? realUsersCount : (realUsersCount + 1)
        );

        const effectiveTotalUsers = Math.max(realUsersCount, basicUserRank);
        this.totalCommunityUsers.set(effectiveTotalUsers);
        this.animateCounter(this.liveFocusedUsersCount, effectiveTotalUsers);
        this.animateCounter(this.liveCompletedObjectivesToday, realObjectivesToday);
        this.liveUserRank.set(basicUserRank);

        const selfItem: RankNeighborItem = {
          id: 'me',
          username: this.userName(),
          selected_avatar: this.selectedAvatar(),
          selected_theme: this.membership.selectedTheme(),
          focus_tomatoes: this.membership.focusTomatoes(),
          rank: basicUserRank,
          is_current_user: true,
          is_premium: false,
          podium_wins: this.membership.podiumWins(),
          gold_medals: this.membership.goldMedals(),
          silver_medals: this.membership.silverMedals(),
          bronze_medals: this.membership.bronzeMedals()
        };

        this.rankNeighbors.set([...otherMembers, selfItem]);
      } else {
        this.totalCommunityUsers.set(realUsersCount);
        this.animateCounter(this.liveFocusedUsersCount, realUsersCount);
        this.animateCounter(this.liveCompletedObjectivesToday, realObjectivesToday);

        const userRank = data.user_rank || 1;
        this.liveUserRank.set(userRank);

        if (data.rank_neighbors && data.rank_neighbors.length > 0) {
          this.rankNeighbors.set(data.rank_neighbors);
        } else {
          this.rankNeighbors.set([{
            id: 'me',
            username: this.userName(),
            selected_avatar: this.selectedAvatar(),
            selected_theme: this.membership.selectedTheme(),
            focus_tomatoes: this.membership.focusTomatoes(),
            rank: userRank,
            is_current_user: true,
            is_premium: true,
            podium_wins: this.membership.podiumWins(),
            gold_medals: this.membership.goldMedals(),
            silver_medals: this.membership.silverMedals(),
            bronze_medals: this.membership.bronzeMedals()
          }]);
        }
      }

      // 3. Podio de Honor y Disciplina (Top 5 real e histórico de base de datos)
      this.processPodiumData(data.podium || [], data.weekly_champions);

      // 4. Récords Históricos (Top 5 real de base de datos)
      this.processHistoricalRecords(data.top_records || []);

      // 5. Avatares recientes de la comunidad
      this.processRecentAvatars(data.recent_avatars || []);

      this.updateLastUpdatedTime();
    } catch (e) {
      console.warn('[Home Dashboard Load Error]', e);
    }
  }

  private isUserEligible(units: number, createdAt?: string): boolean {
    return units > 0;
  }

  private formatPodiumUser(u: CommunityLeaderboardUser, position: number, place: string): PodiumDisplayItem {
    const rawScore = (u.focus_points !== undefined && u.focus_points !== null)
      ? u.focus_points
      : (u.weekly_score !== undefined ? u.weekly_score : (((u.focus_tomatoes || 0) * 25) + ((u.completed_objectives || 0) * 20) - ((u.abandoned_sessions || 0) * 20)));
    
    const score = Math.max(0, rawScore);
    const sessions = u.focus_tomatoes !== undefined ? u.focus_tomatoes : (u.weekly_sessions || 0);
    const objectives = u.completed_objectives !== undefined ? u.completed_objectives : (u.weekly_objectives || 0);
    const abandons = u.abandoned_sessions !== undefined ? u.abandoned_sessions : (u.weekly_abandons || 0);

    const flagInfo = this.resolveFlag(u);

    const isEn = this.translation.currentLang() === 'en';
    const details = isEn
      ? `${sessions} 🍅 Pomodoros • ${objectives} 🎯 Goals • ${abandons} 🚫 Abandons`
      : `${sessions} 🍅 Pomodoros • ${objectives} 🎯 Objetivos • ${abandons} 🚫 Abandonos`;

    return {
      position,
      name: u.username || 'Guerrero',
      avatar: u.selected_avatar || 'gato',
      color: this.membership.getAvatarColorById(u.selected_avatar || 'gato'),
      value: `${score.toLocaleString()} pts`,
      details,
      score,
      place,
      wins: u.podium_wins || 0,
      gold_medals: u.gold_medals || 0,
      silver_medals: u.silver_medals || 0,
      bronze_medals: u.bronze_medals || 0,
      country: flagInfo.country,
      flag_code: flagInfo.flag_code,
      flag: flagInfo.flag,
      isAssigned: true,
      is_premium: u.is_premium === true
    };
  }

  private getUnassignedPodiumItem(position: number, place: string): PodiumDisplayItem {
    return {
      position,
      name: 'En disputa',
      avatar: '',
      color: 'rgba(255, 255, 255, 0.05)',
      value: 'Disponible',
      details: '',
      score: 0,
      place,
      wins: 0,
      isAssigned: false,
      is_premium: false
    };
  }

  getCurrentISOWeekInfo(): { week: number; rangeLabel: string } {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    const curr = new Date(now);
    const day = curr.getDay();
    const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(curr.setDate(diffToMon));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const rangeLabel = `${mon.getDate()} - ${sun.getDate()} ${months[sun.getMonth()]}`;

    return { week, rangeLabel };
  }

  getPodiumWeekInfo(championsData?: WeeklyPodiumSnapshotData): { label: string; rangeLabel: string } {
    if (championsData?.year_week) {
      const match = championsData.year_week.match(/W(\d+)/);
      const weekNum = match ? parseInt(match[1], 10) : 0;
      let rangeLabel = '';
      if (championsData.week_end_date) {
        const parts = championsData.week_end_date.split('-');
        if (parts.length === 3) {
          const sun = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const mon = new Date(sun);
          mon.setDate(sun.getDate() - 6);
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          rangeLabel = `${mon.getDate()} - ${sun.getDate()} ${months[sun.getMonth()]}`;
        }
      }
      return {
        label: `Semana ${weekNum}`,
        rangeLabel
      };
    }

    const current = this.getCurrentISOWeekInfo();
    const prevWeek = current.week > 1 ? current.week - 1 : 52;
    
    // Rango de fechas lunes a domingo de la semana anterior
    const now = new Date();
    const curr = new Date(now);
    const day = curr.getDay();
    const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1) - 7;
    const prevMon = new Date(curr.setDate(diffToMon));
    const prevSun = new Date(prevMon);
    prevSun.setDate(prevMon.getDate() + 6);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const prevRangeLabel = `${prevMon.getDate()} - ${prevSun.getDate()} ${months[prevSun.getMonth()]}`;

    return {
      label: `Semana ${prevWeek}`,
      rangeLabel: prevRangeLabel
    };
  }

  updatePodiumCountdown(): void {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const daysUntilSunday = currentDay === 0 ? 0 : (7 - currentDay);

    // Próximo domingo a las 23:59:59.999 hora local
    const nextSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);
    const diffMs = Math.max(0, nextSunday.getTime() - now.getTime());

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    this.podiumCountdownDays.set(diffDays);
    this.podiumCountdownHours.set(diffHours);
  }

  private processPodiumData(podiumUsers: CommunityLeaderboardUser[], championsData?: WeeklyPodiumSnapshotData) {
    // 0. Sincronizar semanas del podio y conteo regresivo
    const currentWeekInfo = this.getCurrentISOWeekInfo();
    this.currentWeekBadge.set(`Semana ${currentWeekInfo.week} en curso`);
    this.currentWeekRange.set(currentWeekInfo.rangeLabel);

    const podiumInfo = this.getPodiumWeekInfo(championsData);
    this.podiumWeekBadge.set(podiumInfo.label);
    this.podiumWeekRange.set(podiumInfo.rangeLabel);

    this.updatePodiumCountdown();

    // 1. Filtrar solo usuarios PREMIUM que tengan puntos o tomates registrados
    const activeUsers = (podiumUsers || [])
      .filter(u => 
        u.is_premium === true && 
        ((u.focus_points || 0) > 0 || (u.weekly_score || 0) > 0 || (u.focus_tomatoes || 0) > 0) &&
        (this.isUserEligible(Math.floor((u.focus_points || 0) / 40) || (u.focus_tomatoes || 0), u.created_at) || this.isUserEligible(u.focus_tomatoes || 0, u.created_at))
      )
      .sort((a, b) => {
        const scoreA = (a.focus_points !== undefined && a.focus_points !== null) ? a.focus_points : (a.weekly_score ?? 0);
        const scoreB = (b.focus_points !== undefined && b.focus_points !== null) ? b.focus_points : (b.weekly_score ?? 0);
        return (scoreB - scoreA) || ((b.focus_tomatoes || 0) - (a.focus_tomatoes || 0));
      });

    // 2. Carrera en Vivo (Top 1 al 5 en tiempo real)
    const live1: PodiumDisplayItem = activeUsers[0] ? this.formatPodiumUser(activeUsers[0], 1, '1º') : this.getUnassignedPodiumItem(1, '1º');
    const live2: PodiumDisplayItem = activeUsers[1] ? this.formatPodiumUser(activeUsers[1], 2, '2º') : this.getUnassignedPodiumItem(2, '2º');
    const live3: PodiumDisplayItem = activeUsers[2] ? this.formatPodiumUser(activeUsers[2], 3, '3º') : this.getUnassignedPodiumItem(3, '3º');
    const live4: PodiumDisplayItem = activeUsers[3] ? this.formatPodiumUser(activeUsers[3], 4, '4º') : this.getUnassignedPodiumItem(4, '4º');
    const live5: PodiumDisplayItem = activeUsers[4] ? this.formatPodiumUser(activeUsers[4], 5, '5º') : this.getUnassignedPodiumItem(5, '5º');

    this.liveWeeklyTop5.set([live1, live2, live3, live4, live5]);
    this.topRunnersUp.set([live4, live5]); // Mantenido por compatibilidad

    // 3. Podio de Campeones Vigentes (Mitad Izquierda: 2º Plata, 1º Oro, 3º Bronce)
    if (championsData && championsData.has_snapshot && championsData.first_place) {
      const flag1 = this.resolveFlag(championsData.first_place);
      const medals1 = this.lookupUserMedals(championsData.first_place.username, 1);
      const champ1: PodiumDisplayItem = {
        position: 1,
        name: championsData.first_place.username,
        avatar: championsData.first_place.avatar,
        color: this.membership.getAvatarColorById(championsData.first_place.avatar),
        value: `${championsData.first_place.score.toLocaleString()} pts`,
        details: '',
        score: championsData.first_place.score,
        place: '1º',
        wins: medals1.wins,
        gold_medals: medals1.gold,
        silver_medals: medals1.silver,
        bronze_medals: medals1.bronze,
        country: flag1.country,
        flag_code: flag1.flag_code,
        flag: flag1.flag,
        isAssigned: true,
        is_premium: true
      };

      const flag2 = championsData.second_place ? this.resolveFlag(championsData.second_place) : { flag_code: '', flag: '', country: '' };
      const medals2 = championsData.second_place ? this.lookupUserMedals(championsData.second_place.username, 1) : { wins: 0, gold: 0, silver: 0, bronze: 0 };
      const champ2: PodiumDisplayItem = (championsData.second_place && championsData.second_place.username !== 'En disputa') ? {
        position: 2,
        name: championsData.second_place.username,
        avatar: championsData.second_place.avatar,
        color: this.membership.getAvatarColorById(championsData.second_place.avatar),
        value: `${championsData.second_place.score.toLocaleString()} pts`,
        details: '',
        score: championsData.second_place.score,
        place: '2º',
        wins: medals2.wins,
        gold_medals: medals2.gold,
        silver_medals: medals2.silver,
        bronze_medals: medals2.bronze,
        country: flag2.country,
        flag_code: flag2.flag_code,
        flag: flag2.flag,
        isAssigned: true,
        is_premium: true
      } : this.getUnassignedPodiumItem(2, '2º');

      const flag3 = championsData.third_place ? this.resolveFlag(championsData.third_place) : { flag_code: '', flag: '', country: '' };
      const medals3 = championsData.third_place ? this.lookupUserMedals(championsData.third_place.username, 1) : { wins: 0, gold: 0, silver: 0, bronze: 0 };
      const champ3: PodiumDisplayItem = (championsData.third_place && championsData.third_place.username !== 'En disputa') ? {
        position: 3,
        name: championsData.third_place.username,
        avatar: championsData.third_place.avatar,
        color: this.membership.getAvatarColorById(championsData.third_place.avatar),
        value: `${championsData.third_place.score.toLocaleString()} pts`,
        details: '',
        score: championsData.third_place.score,
        place: '3º',
        wins: medals3.wins,
        gold_medals: medals3.gold,
        silver_medals: medals3.silver,
        bronze_medals: medals3.bronze,
        country: flag3.country,
        flag_code: flag3.flag_code,
        flag: flag3.flag,
        isAssigned: true,
        is_premium: true
      } : this.getUnassignedPodiumItem(3, '3º');

      this.topPodiumUsers.set([champ2, champ1, champ3]);
    } else {
      // Si aún no hay un corte semanal registrado, muestra a los líderes actuales en el podio
      if (activeUsers.length === 0) {
        this.topPodiumUsers.set([
          this.getUnassignedPodiumItem(2, '2º'),
          this.getUnassignedPodiumItem(1, '1º'),
          this.getUnassignedPodiumItem(3, '3º')
        ]);
      } else {
        const champ1Live = { ...live1, details: '' };
        const champ2Live = { ...live2, details: '' };
        const champ3Live = { ...live3, details: '' };
        this.topPodiumUsers.set([champ2Live, champ1Live, champ3Live]);
      }
    }
  }

  private processHistoricalRecords(records: CommunityLeaderboardUser[]) {
    const list: HistoricalRecordItem[] = [];

    // Solo usuarios con membresía PREMIUM compiten en el ranking histórico (>5 unidades o >1 semana)
    const activeRecords = (records || []).filter(r => 
      r.is_premium === true && 
      (r.focus_tomatoes || 0) > 0 &&
      this.isUserEligible(r.focus_tomatoes || 0, r.created_at)
    );

    if (activeRecords.length > 0) {
      activeRecords.slice(0, 10).forEach((r, idx) => {
        list.push({
          rank: idx + 1,
          name: r.username || 'Guerrero',
          avatar: r.selected_avatar || 'gato',
          color: this.membership.getAvatarColorById(r.selected_avatar || 'gato'),
          tomatoes: r.focus_tomatoes || 0,
          wins: r.podium_wins || 0,
          gold_medals: r.gold_medals || 0,
          silver_medals: r.silver_medals || 0,
          bronze_medals: r.bronze_medals || 0,
          isAssigned: true,
          is_premium: r.is_premium === true
        });
      });
    }

    // Llenar los puestos restantes hasta 10 con filas disponibles sin imagen de avatar
    const currentCount = list.length;
    for (let i = currentCount + 1; i <= 10; i++) {
      list.push({
        rank: i,
        name: 'Disponible',
        avatar: '',
        color: 'transparent',
        tomatoes: 0,
        wins: 0,
        isAssigned: false,
        is_premium: false
      });
    }

    this.topHistoricalRecords.set(list);
  }

  isUserItemPremium(item: any): boolean {
    if (!item) return false;
    if (item.is_current_user || item.isSelf || item.id === 'self' || item.id === 'me' || (this.userName() && (item.username === this.userName() || item.name === this.userName()))) {
      return this.membership.isPremium();
    }
    return item.is_premium === true;
  }

  isUserItemSelf(item: any): boolean {
    if (!item) return false;
    return !!(item.is_current_user || item.isSelf || item.id === 'self' || item.id === 'me' || (this.userName() && (item.username === this.userName() || item.name === this.userName())));
  }

  getCountryFlag(val?: string): string {
    if (!val) return '';
    const raw = val.trim().toUpperCase();
    const map: Record<string, string> = {
      'MX': '🇲🇽', 'MÉXICO': '🇲🇽', 'MEXICO': '🇲🇽',
      'CO': '🇨🇴', 'COLOMBIA': '🇨🇴',
      'BR': '🇧🇷', 'BRASIL': '🇧🇷', 'BRAZIL': '🇧🇷',
      'US': '🇺🇸', 'USA': '🇺🇸', 'ESTADOS UNIDOS': '🇺🇸', 'EEUU': '🇺🇸',
      'ES': '🇪🇸', 'ESPAÑA': '🇪🇸', 'ESPANA': '🇪🇸', 'SPAIN': '🇪🇸',
      'AR': '🇦🇷', 'ARGENTINA': '🇦🇷',
      'CL': '🇨🇱', 'CHILE': '🇨🇱',
      'PE': '🇵🇪', 'PERÚ': '🇵🇪', 'PERU': '🇵🇪',
      'EC': '🇪🇨', 'ECUADOR': '🇪🇨',
      'VE': '🇻🇪', 'VENEZUELA': '🇻🇪',
      'UY': '🇺🇾', 'URUGUAY': '🇺🇾',
      'GT': '🇬🇹', 'GUATEMALA': '🇬🇹',
      'CR': '🇨🇷', 'COSTA RICA': '🇨🇷',
      'PA': '🇵🇦', 'PANAMÁ': '🇵🇦', 'PANAMA': '🇵🇦',
      'DO': '🇩🇴', 'REPÚBLICA DOMINICANA': '🇩🇴',
      'CA': '🇨🇦', 'CANADÁ': '🇨🇦', 'CANADA': '🇨🇦',
      'DE': '🇩🇪', 'ALEMANIA': '🇩🇪', 'GERMANY': '🇩🇪',
      'FR': '🇫🇷', 'FRANCIA': '🇫🇷', 'FRANCE': '🇫🇷',
      'IT': '🇮🇹', 'ITALIA': '🇮🇹', 'ITALY': '🇮🇹',
      'GB': '🇬🇧', 'UK': '🇬🇧', 'REINO UNIDO': '🇬🇧',
      'JP': '🇯🇵', 'JAPÓN': '🇯🇵', 'JAPAN': '🇯🇵',
    };
    return map[raw] || '📍';
  }

  getCountryCode(val?: string): string {
    if (!val) return '';
    const raw = val.trim().toLowerCase();
    const map: Record<string, string> = {
      'mx': 'mx', 'méxico': 'mx', 'mexico': 'mx',
      'co': 'co', 'colombia': 'co',
      'br': 'br', 'brasil': 'br', 'brazil': 'br',
      'us': 'us', 'usa': 'us', 'estados unidos': 'us', 'eeuu': 'us',
      'es': 'es', 'españa': 'es', 'espana': 'es', 'spain': 'es',
      'ar': 'ar', 'argentina': 'ar',
      'cl': 'cl', 'chile': 'cl',
      'pe': 'pe', 'perú': 'pe', 'peru': 'pe',
      'ec': 'ec', 'ecuador': 'ec',
      've': 've', 'venezuela': 've',
      'uy': 'uy', 'uruguay': 'uy',
      'gt': 'gt', 'guatemala': 'gt',
      'cr': 'cr', 'costa rica': 'cr',
      'pa': 'pa', 'panamá': 'pa', 'panama': 'pa',
      'do': 'do', 'república dominicana': 'do',
      'ca': 'ca', 'canadá': 'ca', 'canada': 'ca',
      'de': 'de', 'alemania': 'de', 'germany': 'de',
      'fr': 'fr', 'francia': 'fr', 'france': 'fr',
      'it': 'it', 'italia': 'it', 'italy': 'it',
      'gb': 'gb', 'uk': 'gb', 'reino unido': 'gb',
      'jp': 'jp', 'japón': 'jp', 'japan': 'jp',
    };
    return map[raw] || (raw.length === 2 ? raw : '');
  }

  resolveFlag(user: any): { flag_code: string; flag: string; country: string } {
    if (!user) return { flag_code: '', flag: '', country: '' };

    // 1. Si es el usuario actual logueado
    if (this.isUserItemSelf(user)) {
      const c = this.membership.userCountry() || '';
      const code = this.getCountryCode(c);
      return { flag_code: code, flag: this.getCountryFlag(c), country: c || 'Tu país' };
    }

    // 2. Si viene country o country_code en el objeto
    const country = user.country || '';
    const code = this.getCountryCode(user.country_code || user.country);
    if (code) {
      return { flag_code: code, flag: this.getCountryFlag(code || country), country: country || code.toUpperCase() };
    }

    // 3. Mapeo específico por nombre de guerreros de la comunidad simulados/semilla
    const name = (user.username || user.name || '').toLowerCase().trim();
    if (name.includes('valeria') || name.includes('vramos')) return { flag_code: 'mx', flag: '🇲🇽', country: 'México' };
    if (name.includes('mateo')) return { flag_code: 'co', flag: '🇨🇴', country: 'Colombia' };
    if (name.includes('lucas') || name === 'silva' || name.includes('silva')) return { flag_code: 'br', flag: '🇧🇷', country: 'Brasil' };
    if (name.includes('ethan')) return { flag_code: 'us', flag: '🇺🇸', country: 'Estados Unidos' };
    if (name.includes('sofi') || name.includes('sofía') || name.includes('sofia')) return { flag_code: 'es', flag: '🇪🇸', country: 'España' };
    if (name.includes('gabo') || name.includes('gabriel')) return { flag_code: 'br', flag: '🇧🇷', country: 'Brasil' };
    if (name.includes('m.herrera') || name.includes('mariana') || name === 'herrera') return { flag_code: 'mx', flag: '🇲🇽', country: 'México' };

    // 4. Buscar en la lista general de perfiles cargados
    const found = this.rawRecentAvatars.find(p => p.username?.toLowerCase() === name || (user.id && p.id === user.id));
    if (found && (found.country || found.country_code)) {
      const fc = this.getCountryCode(found.country_code || found.country);
      const c = found.country || found.country_code || '';
      return { flag_code: fc, flag: this.getCountryFlag(c), country: c };
    }

    return { flag_code: '', flag: '', country: '' };
  }

  private handlePresenceSync(presenceState: any) {
    this.lastPresenceState = presenceState;
    this.updateCompanionsLists();
  }

  private processRecentAvatars(recent: CommunityLeaderboardUser[]) {
    this.rawRecentAvatars = recent || [];
    this.updateCompanionsLists();
  }

  private updateCompanionsLists() {
    const livePomodoro: CommunityCompanionItem[] = [];
    const liveCamp: CommunityCompanionItem[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    const isSelfInPomodoro = this.membership.isFocusActive() || (this.timerRunning() && !this.isBreak());
    const selfItem: CommunityCompanionItem = {
      id: 'self',
      name: this.userName() || 'Tú',
      avatar: this.selectedAvatar() || 'gato',
      color: this.getSelectedAvatarColor(),
      wins: this.membership.podiumWins(),
      status: isSelfInPomodoro ? 'focused' : 'idle',
      mission: isSelfInPomodoro ? 'Enfoque Activo' : 'En el campamento',
      is_premium: this.membership.isPremium()
    };

    if (isSelfInPomodoro) {
      livePomodoro.push(selfItem);
    } else {
      liveCamp.push(selfItem);
    }
    seenNames.add((this.userName() || '').toLowerCase());
    if (this.supabaseService.currentUser()?.id) {
      seenIds.add(this.supabaseService.currentUser()!.id);
    }

    // 1. Procesar presencias EXCLUSIVAMENTE de usuarios actualmente conectados en vivo
    if (this.lastPresenceState) {
      Object.keys(this.lastPresenceState).forEach(key => {
        if (key === this.presenceClientId) return;
        const presences = this.lastPresenceState[key];
        if (Array.isArray(presences) && presences.length > 0) {
          const p = presences[presences.length - 1];
          if (p.client_id === this.presenceClientId) return;
          const uid = p.user_id || p.client_id || key;
          if (seenIds.has(uid)) return;
          const name = p.name || 'Guerrero';
          if (seenNames.has(name.toLowerCase())) return;

          seenIds.add(uid);
          seenNames.add(name.toLowerCase());

          const companion: CommunityCompanionItem = {
            id: uid,
            name,
            avatar: p.avatar || 'gato',
            color: this.membership.getAvatarColorById(p.avatar || 'gato'),
            wins: 0,
            status: p.status || 'idle',
            mission: p.mission || (p.status === 'focused' ? 'Enfoque Activo' : 'En el campamento'),
            is_premium: p.is_premium === true
          };

          if (p.status === 'focused') {
            livePomodoro.push(companion);
          } else {
            liveCamp.push(companion);
          }
        }
      });
    }

    // 2. Incorporar compañeros simulados vivos para mantener el campamento y pomodoro habitados
    const { pomodoroUsers: simPomodoro, campUsers: simCamp } = this.simulator.getHomeSimulatedCompanions(this.userName());

    simPomodoro.forEach(sim => {
      if (!seenIds.has(sim.id) && !seenNames.has(sim.name.toLowerCase())) {
        seenIds.add(sim.id);
        seenNames.add(sim.name.toLowerCase());
        livePomodoro.push(sim);
      }
    });

    simCamp.forEach(sim => {
      if (!seenIds.has(sim.id) && !seenNames.has(sim.name.toLowerCase())) {
        seenIds.add(sim.id);
        seenNames.add(sim.name.toLowerCase());
        liveCamp.push(sim);
      }
    });

    this.livePomodoroUsers.set(livePomodoro);
    this.liveCampUsers.set(liveCamp);
    this.liveCommunityUsers.set([...livePomodoro, ...liveCamp]);

    const targetPomodoroCount = isSelfInPomodoro ? livePomodoro.length : (livePomodoro.length);
    const targetCampCount = liveCamp.length;

    this.animateCounter(this.livePomodoroUsersCount, targetPomodoroCount);
    this.animateCounter(this.liveCampUsersCount, targetCampCount);
    this.animateCounter(this.liveFocusedUsersCount, targetPomodoroCount);
  }

  private animateCounter(targetSignal: WritableSignal<number>, targetValue: number, duration: number = 1200) {
    const startValue = targetSignal();
    const frameRate = 1000 / 60;
    const totalFrames = Math.max(1, Math.round(duration / frameRate));
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easeProgress = progress * (2 - progress);
      const current = Math.round(startValue + (targetValue - startValue) * easeProgress);
      targetSignal.set(current);

      if (frame >= totalFrames) {
        targetSignal.set(targetValue);
        clearInterval(timer);
      }
    }, frameRate);
  }

  // Controles de Pomodoro
  toggleTimer() {
    if (this.timerRunning()) {
      this.stopTimerLoop();
    } else {
      this.requestNotificationPermission();
      this.startTimerLoop();
    }
  }

  resetTimer() {
    this.stopTimerLoop();
    this.timeLeft.set(this.totalSessionTime());
    this.updateCompanionsLists();
  }

  selectMode(mode: 'focus' | 'break') {
    this.stopTimerLoop();
    if (mode === 'focus') {
      const dur = parseInt(this.membership.getFocusSetting('focus-duration', '25'), 10) || 25;
      this.isBreak.set(false);
      this.totalSessionTime.set(dur * 60);
      this.timeLeft.set(dur * 60);
    } else {
      const brk = parseInt(this.membership.getFocusSetting('break-duration', '5'), 10) || 5;
      this.isBreak.set(true);
      this.totalSessionTime.set(brk * 60);
      this.timeLeft.set(brk * 60);
    }
    this.updateCompanionsLists();
  }

  requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  sendDesktopNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const iconUrl = window.location.origin ? `${window.location.origin}/cofu_logo.jpg` : 'cofu_logo.jpg';
    const show = () => {
      try {
        const notif = new Notification(title, { body, icon: iconUrl, badge: iconUrl, requireInteraction: true });
        notif.onclick = () => { window.focus(); notif.close(); };
      } catch(e) {}
    };
    if (Notification.permission === 'granted') {
      show();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') show();
      });
    }
  }

  private startTimerLoop() {
    this.timerRunning.set(true);
    this.updateCompanionsLists();
    this.pomodoroTimer = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(t => t - 1);
      } else {
        this.stopTimerLoop();
        if (!this.isBreak()) {
          this.selectMode('break');
          this.sendDesktopNotification('🍅 ¡Pomodoro Completado!', '¡Excelente trabajo! Has completado tu tiempo de enfoque. Tómate un descanso.');
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch(e){}
        } else {
          this.selectMode('focus');
          this.sendDesktopNotification('⚡ ¡Descanso Finalizado!', 'Tu energía está recargada. Es hora de volver al enfoque.');
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch(e){}
        }
      }
    }, 1000);
  }

  private stopTimerLoop() {
    this.timerRunning.set(false);
    this.updateCompanionsLists();
    if (this.pomodoroTimer) {
      clearInterval(this.pomodoroTimer);
      this.pomodoroTimer = null;
    }
  }

  // Estado de confirmación de sala compartida
  showJoinConfirmation = signal(false);
  selectedPartnerName = signal('');
  selectedPartnerAvatar = signal('');

  // Zoom de Avatar
  showAvatarZoomModal = signal(false);
  zoomAvatarId = signal('');
  zoomAvatarName = signal('');
  zoomAvatarGuardian = signal('');
  zoomAvatarColor = signal('');
  zoomAvatarWins = signal(0);
  zoomAvatarGoldMedals = signal(0);
  zoomAvatarSilverMedals = signal(0);
  zoomAvatarBronzeMedals = signal(0);
  zoomAvatarIsPremium = signal(false);

  zoomAvatar(
    avatarId: string, 
    name: string, 
    guardian: string, 
    color: string, 
    winsCount: number = 0, 
    isPremium: boolean = false,
    goldMedals?: number,
    silverMedals?: number,
    bronzeMedals?: number
  ) {
    this.zoomAvatarId.set(avatarId);
    this.zoomAvatarName.set(name);
    this.zoomAvatarGuardian.set(guardian);
    this.zoomAvatarColor.set(color);

    const isSelf = this.isUserItemSelf({ username: name, name });
    this.zoomAvatarIsPremium.set(isPremium || (isSelf ? this.membership.isPremium() : false));

    // Si es el usuario actual, obtener sus medallas reales desde membershipService
    if (isSelf) {
      const g = this.membership.goldMedals();
      const s = this.membership.silverMedals();
      const b = this.membership.bronzeMedals();
      const w = this.membership.podiumWins();
      this.zoomAvatarGoldMedals.set(g);
      this.zoomAvatarSilverMedals.set(s);
      this.zoomAvatarBronzeMedals.set(b);
      this.zoomAvatarWins.set(w || winsCount);
    } else if (goldMedals !== undefined || silverMedals !== undefined || bronzeMedals !== undefined) {
      this.zoomAvatarGoldMedals.set(goldMedals ?? 0);
      this.zoomAvatarSilverMedals.set(silverMedals ?? 0);
      this.zoomAvatarBronzeMedals.set(bronzeMedals ?? 0);
      this.zoomAvatarWins.set(winsCount);
    } else {
      const resolved = this.lookupUserMedals(name, winsCount);
      this.zoomAvatarGoldMedals.set(resolved.gold);
      this.zoomAvatarSilverMedals.set(resolved.silver);
      this.zoomAvatarBronzeMedals.set(resolved.bronze);
      this.zoomAvatarWins.set(resolved.wins);
    }

    this.showAvatarZoomModal.set(true);
  }

  lookupUserMedals(name: string, winsCount: number = 0): { wins: number; gold: number; silver: number; bronze: number } {
    const cleanName = (name || '').toLowerCase().trim();

    // 1. Usuarios conocidos con medallas (seed de la comunidad y simulador)
    const knownUsersMedals: Record<string, { wins: number; gold: number; silver: number; bronze: number }> = {
      'valeria ramos': { wins: 3, gold: 2, silver: 1, bronze: 0 },
      'vramos': { wins: 3, gold: 2, silver: 1, bronze: 0 },
      'valeria': { wins: 3, gold: 2, silver: 1, bronze: 0 },
      'mateo restrepo': { wins: 2, gold: 1, silver: 1, bronze: 0 },
      'mateo': { wins: 2, gold: 1, silver: 1, bronze: 0 },
      'lucas silva': { wins: 2, gold: 0, silver: 0, bronze: 2 },
      'silva': { wins: 2, gold: 0, silver: 0, bronze: 2 },
      'lucas': { wins: 2, gold: 0, silver: 0, bronze: 2 },
      'ethan miller': { wins: 1, gold: 0, silver: 1, bronze: 0 },
      'ethan_m': { wins: 1, gold: 0, silver: 1, bronze: 0 },
      'ethan': { wins: 1, gold: 0, silver: 1, bronze: 0 },
      'sofía navarro': { wins: 1, gold: 0, silver: 0, bronze: 1 },
      'sofia navarro': { wins: 1, gold: 0, silver: 0, bronze: 1 },
      'sofi_n': { wins: 1, gold: 0, silver: 0, bronze: 1 },
      'gabriel oliveira': { wins: 0, gold: 0, silver: 0, bronze: 0 },
      'gabo': { wins: 0, gold: 0, silver: 0, bronze: 0 },
      'mariana herrera': { wins: 0, gold: 0, silver: 0, bronze: 0 },
      'm.herrera': { wins: 0, gold: 0, silver: 0, bronze: 0 }
    };

    if (knownUsersMedals[cleanName]) {
      return knownUsersMedals[cleanName];
    }

    // 2. Si no es un usuario conocido del seed pero tiene winsCount
    return {
      wins: winsCount,
      gold: winsCount,
      silver: 0,
      bronze: 0
    };
  }

  joinSharedSession(name: string, avatar: string) {
    if (!this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }

    this.selectedPartnerName.set(name);
    this.selectedPartnerAvatar.set(avatar);
    this.showJoinConfirmation.set(true);
  }

  confirmJoinRoom() {
    this.showJoinConfirmation.set(false);
    localStorage.setItem('shared-session-partner-name', this.selectedPartnerName());
    localStorage.setItem('shared-session-partner-avatar', this.selectedPartnerAvatar());
    this.router.navigate(['/focus']);
  }

  cancelJoinRoom() {
    this.showJoinConfirmation.set(false);
  }

  // Modal de Detalles de Jefe / Sirena y Retos
  showBossModal = signal(false);

  openBossModal() {
    this.showBossModal.set(true);
  }

  closeBossModal() {
    this.showBossModal.set(false);
  }

  getBossImage(): string {
    const type = this.bossService.activeBoss()?.type;
    switch (type) {
      case 'samurai': return '/assets/images/avatars/boss_hidra.webp';
      case 'cyberpunk': return '/assets/images/avatars/boss_kraken.webp';
      case 'zen': return '/assets/images/avatars/boss_basilisco.webp';
      case 'aurora': return '/assets/images/avatars/boss_quimera.webp';
      case 'siren':
      case 'sirena':
        return '/assets/images/avatars/boss_sirena.webp';
      case 'werewolf': return '/assets/images/avatars/boss_lobo.webp';
      case 'vampire': return '/assets/images/avatars/boss_vampiro.webp';
      default: return '/assets/images/avatars/boss_sirena.webp';
    }
  }
}
