import { Component, signal, computed, OnInit, OnDestroy, WritableSignal, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { SupabaseService, CommunityLeaderboardUser, RankNeighborItem } from '../../services/supabase.service';
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
  isAssigned?: boolean;
  is_premium?: boolean;
}

export interface CommunityCompanionItem {
  id: string;
  name: string;
  avatar: string;
  color: string;
  wins: number;
  status?: 'focused' | 'break' | 'paused' | 'abandoned' | 'idle';
  mission?: string;
  is_premium?: boolean;
}

import { TranslatePipe, TranslationService } from '../../services/translation.service';

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

  // Podio de Honor (Top 3 histórico real en orden [2º, 1º, 3º] para la UI en vivo)
  topPodiumUsers = signal<PodiumDisplayItem[]>([]);

  // Siguientes 2 Lugares (4º y 5º puesto)
  topRunnersUp = signal<PodiumDisplayItem[]>([]);

  // Récords Históricos (Top 5 real por Pomodoros)
  topHistoricalRecords = signal<HistoricalRecordItem[]>([]);

  rankingData = computed(() => {
    return this.topPodiumUsers();
  });

  hasPodiumWinners = computed(() => {
    const list = this.topPodiumUsers();
    if (!list || list.length < 3) return false;
    return list.some(u => u.isAssigned);
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
      return Math.max(1, this.totalCommunityUsers());
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
  }

  ngOnDestroy() {
    this.stopTimerLoop();
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

      this.totalCommunityUsers.set(realUsersCount);
      this.animateCounter(this.liveFocusedUsersCount, realUsersCount);
      this.animateCounter(this.liveCompletedObjectivesToday, realObjectivesToday);

      // 2. Ranking real del usuario por tomates (si es básico va estrictamente al último puesto)
      const userRank = !this.membership.isPremium() 
        ? realUsersCount 
        : (data.user_rank || 1);
      this.liveUserRank.set(userRank);

      // 2b. Vecinos en el ranking de tomates (2 arriba, tú, 2 abajo)
      if (data.rank_neighbors && data.rank_neighbors.length > 0) {
        if (!this.membership.isPremium()) {
          // Filtrar miembros para mostrar los que compiten arriba y colocar al usuario básico estrictamente al final absoluto
          const otherMembers = data.rank_neighbors
            .filter((n: RankNeighborItem) => !n.is_current_user && n.username !== this.userName())
            .slice(0, 3);
          
          const selfItem: RankNeighborItem = {
            id: 'me',
            username: this.userName(),
            selected_avatar: this.selectedAvatar(),
            selected_theme: this.membership.selectedTheme(),
            focus_tomatoes: this.membership.focusTomatoes(),
            rank: realUsersCount,
            is_current_user: true,
            is_premium: this.membership.isPremium(),
            podium_wins: this.membership.podiumWins()
          };

          this.rankNeighbors.set([...otherMembers, selfItem]);
        } else {
          this.rankNeighbors.set(data.rank_neighbors);
        }
      } else {
        this.rankNeighbors.set([{
          id: 'me',
          username: this.userName(),
          selected_avatar: this.selectedAvatar(),
          selected_theme: this.membership.selectedTheme(),
          focus_tomatoes: this.membership.focusTomatoes(),
          rank: userRank,
          is_current_user: true,
          is_premium: this.membership.isPremium(),
          podium_wins: this.membership.podiumWins()
        }]);
      }

      // 3. Podio de Honor y Disciplina (Top 5 real e histórico de base de datos)
      this.processPodiumData(data.podium || []);

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

    return {
      position,
      name: u.username || 'Guerrero',
      avatar: u.selected_avatar || 'gato',
      color: this.membership.getAvatarColorById(u.selected_avatar || 'gato'),
      value: `${score.toLocaleString()} pts`,
      details: `${sessions} 🍅 • ${objectives} 🎯 • ${abandons} 🚫`,
      score,
      place,
      wins: u.podium_wins || 0,
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
      details: '0 🍅 • 0 🎯 • 0 🚫',
      score: 0,
      place,
      wins: 0,
      isAssigned: false,
      is_premium: false
    };
  }

  private processPodiumData(podiumUsers: CommunityLeaderboardUser[]) {
    // Filtrar solo usuarios PREMIUM que tengan puntos o tomates registrados en BD y cumplan >5 unidades o >1 semana
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

    if (activeUsers.length === 0) {
      this.topPodiumUsers.set([]);
      this.topRunnersUp.set([
        this.getUnassignedPodiumItem(4, '4º'),
        this.getUnassignedPodiumItem(5, '5º')
      ]);
      return;
    }

    const firstUser = activeUsers[0];
    const secondUser = activeUsers[1];
    const thirdUser = activeUsers[2];
    const fourthUser = activeUsers[3];
    const fifthUser = activeUsers[4];

    const first: PodiumDisplayItem = this.formatPodiumUser(firstUser, 1, '1º');
    const second: PodiumDisplayItem = secondUser ? this.formatPodiumUser(secondUser, 2, '2º') : this.getUnassignedPodiumItem(2, '2º');
    const third: PodiumDisplayItem = thirdUser ? this.formatPodiumUser(thirdUser, 3, '3º') : this.getUnassignedPodiumItem(3, '3º');

    // Formato requerido para la UI: [2º (izquierda), 1º (centro), 3º (derecha)]
    this.topPodiumUsers.set([second, first, third]);

    // Siguientes 2 lugares (4º y 5º)
    const fourth: PodiumDisplayItem = fourthUser ? this.formatPodiumUser(fourthUser, 4, '4º') : this.getUnassignedPodiumItem(4, '4º');
    const fifth: PodiumDisplayItem = fifthUser ? this.formatPodiumUser(fifthUser, 5, '5º') : this.getUnassignedPodiumItem(5, '5º');
    this.topRunnersUp.set([fourth, fifth]);
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
  zoomAvatarIsPremium = signal(false);

  zoomAvatar(avatarId: string, name: string, guardian: string, color: string, winsCount: number = 0, isPremium: boolean = false) {
    this.zoomAvatarId.set(avatarId);
    this.zoomAvatarName.set(name);
    this.zoomAvatarGuardian.set(guardian);
    this.zoomAvatarColor.set(color);
    this.zoomAvatarWins.set(winsCount);
    this.zoomAvatarIsPremium.set(isPremium || (this.userName() === name ? this.membership.isPremium() : false));
    this.showAvatarZoomModal.set(true);
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
