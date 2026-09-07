import { Component, signal, computed, OnInit, OnDestroy, WritableSignal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { SupabaseService, CommunityLeaderboardUser } from '../../services/supabase.service';
import { Navbar } from '../../components/navbar/navbar';

export interface PodiumDisplayItem {
  position: number;
  name: string;
  avatar: string;
  color: string;
  value: string;
  place: string;
  wins: number;
}

export interface HistoricalRecordItem {
  rank: number;
  name: string;
  avatar: string;
  color: string;
  tomatoes: number;
  wins: number;
}

export interface CommunityCompanionItem {
  id: string;
  name: string;
  avatar: string;
  color: string;
  wins: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  public membership = inject(MembershipService);
  private router = inject(Router);
  public bossService = inject(ComunidadBossService);
  private supabaseService = inject(SupabaseService);

  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  Math = Math;
  sidebarCollapsed!: any;

  // Métricas reales de la Comunidad
  liveFocusedUsersCount = signal<number>(0);
  liveCompletedObjectivesToday = signal<number>(0);
  liveUserRank = signal<number>(1);
  totalCommunityUsers = signal<number>(74);

  // Fluctuación en vivo de ranking
  private rankTimer: any = null;
  private realtimeChannel: any = null;
  liveRankShift = signal(0);
  lastUpdated = signal('');

  // Compañeros en vivo para avatar stack
  liveCommunityUsers = signal<CommunityCompanionItem[]>([
    { id: '1', name: 'Lobo Samurai', avatar: 'lobo', color: '#3a86f0', wins: 3 },
    { id: '2', name: 'Zorro Ninja', avatar: 'zorro', color: '#ff007f', wins: 4 },
    { id: '3', name: 'León Shogun', avatar: 'leon', color: '#e67e22', wins: 2 },
    { id: '4', name: 'Búho Estratega', avatar: 'buho', color: '#9b59b6', wins: 1 },
    { id: '5', name: 'Panda Ninja', avatar: 'panda', color: '#2ecc71', wins: 0 }
  ]);

  // Podio Semanal (Top 3 en orden [2º, 1º, 3º] para la UI)
  topPodiumUsers = signal<PodiumDisplayItem[]>([
    { position: 2, name: 'Lobo Samurai', avatar: 'lobo', color: '#3a86f0', value: '3,800 puntos', place: '2º', wins: 3 },
    { position: 1, name: 'Dragón del Ego', avatar: 'dragon', color: '#d946ef', value: '4,500 puntos', place: '1º', wins: 5 },
    { position: 3, name: 'Búho Sabio', avatar: 'buho', color: '#10b981', value: '3,100 puntos', place: '3º', wins: 1 }
  ]);

  // Récords Históricos (Top 5 por Pomodoros)
  topHistoricalRecords = signal<HistoricalRecordItem[]>([
    { rank: 1, name: 'Dragón Imperial', avatar: 'dragon', color: '#a855f7', tomatoes: 142, wins: 5 },
    { rank: 2, name: 'Lobo Samurai', avatar: 'lobo', color: '#3a86f0', tomatoes: 128, wins: 3 },
    { rank: 3, name: 'Búho Sabio', avatar: 'buho', color: '#10b981', tomatoes: 105, wins: 1 },
    { rank: 4, name: 'Zorro Ninja', avatar: 'zorro', color: '#ec4899', tomatoes: 94, wins: 4 },
    { rank: 5, name: 'Panda Zen', avatar: 'panda', color: '#2ecc71', tomatoes: 81, wins: 2 }
  ]);

  rankingData = computed(() => {
    return this.topPodiumUsers();
  });

  featuredCompanionName = computed(() => {
    const list = this.liveCommunityUsers();
    return list.length > 0 ? list[0].name : 'un compañero';
  });

  rankingPosition = computed(() => {
    return Math.max(1, this.liveUserRank() + this.liveRankShift());
  });

  percentageBeaten = computed(() => {
    const total = Math.max(1, this.totalCommunityUsers());
    const pos = this.rankingPosition();
    return Math.min(99, Math.max(1, Math.round(((total - pos) / total) * 100)));
  });

  potentialReward = computed(() => {
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

  ngOnInit() {
    this.updateLastUpdatedTime();

    // 1. Cargar datos del dashboard desde Supabase
    this.loadDashboardFromSupabase();

    // 2. Suscribirse a cambios en tiempo real en la tabla profiles
    if (this.supabaseService.isConfigured()) {
      this.realtimeChannel = this.supabaseService.client
        .channel('public:profiles_home_dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          this.loadDashboardFromSupabase();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'focus_sessions' }, () => {
          this.loadDashboardFromSupabase();
        })
        .subscribe();
    }

    // 3. Fluctuación sutil en vivo cada 15 segundos
    this.rankTimer = setInterval(() => {
      const randomShift = Math.floor(Math.random() * 3) - 1; // -1, 0, o 1
      this.liveRankShift.update(current => {
        return Math.max(-2, Math.min(2, current + randomShift));
      });
      this.updateLastUpdatedTime();
    }, 15000);
  }

  ngOnDestroy() {
    this.stopTimerLoop();
    if (this.rankTimer) {
      clearInterval(this.rankTimer);
    }
    if (this.realtimeChannel && this.supabaseService.isConfigured()) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
    }
  }

  async loadDashboardFromSupabase() {
    if (!this.supabaseService.isConfigured()) {
      // Si Supabase no está configurado, arrancar animación con valores por defecto
      this.animateCounter(this.liveFocusedUsersCount, 74);
      this.animateCounter(this.liveCompletedObjectivesToday, 342);
      return;
    }

    try {
      const { data, error } = await this.supabaseService.getCommunityHomeDashboard();
      if (error || !data) {
        this.animateCounter(this.liveFocusedUsersCount, 74);
        this.animateCounter(this.liveCompletedObjectivesToday, 342);
        return;
      }

      // 1. Conteo de usuarios y sesiones completadas hoy
      const realUsersCount = Math.max(data.total_users, 1);
      const displayActiveUsers = Math.max(realUsersCount, Math.min(74, 45 + realUsersCount * 2));
      const displayObjectives = Math.max(data.completed_today, Math.min(342, 110 + data.completed_today * 6));

      this.totalCommunityUsers.set(displayActiveUsers);
      this.animateCounter(this.liveFocusedUsersCount, displayActiveUsers);
      this.animateCounter(this.liveCompletedObjectivesToday, displayObjectives);

      // 2. Ranking real del usuario
      this.liveUserRank.set(data.user_rank || 1);

      // 3. Podio Semanal (Top 3 de base de datos)
      if (data.podium && data.podium.length > 0) {
        this.processPodiumData(data.podium);
      }

      // 4. Récords Históricos (Top 5 de base de datos)
      if (data.top_records && data.top_records.length > 0) {
        this.processHistoricalRecords(data.top_records);
      }

      // 5. Avatares recientes de la comunidad
      if (data.recent_avatars && data.recent_avatars.length > 0) {
        this.processRecentAvatars(data.recent_avatars);
      }

      this.updateLastUpdatedTime();
    } catch (e) {
      console.warn('[Home Dashboard Load Error]', e);
    }
  }

  private processPodiumData(podiumUsers: CommunityLeaderboardUser[]) {
    const defaults = [
      { name: 'Dragón del Ego', avatar: 'dragon', points: 4500, wins: 5 },
      { name: 'Lobo Samurai', avatar: 'lobo', points: 3800, wins: 3 },
      { name: 'Búho Sabio', avatar: 'buho', points: 3100, wins: 1 }
    ];

    const top3: Array<{ name: string; avatar: string; points: number; wins: number }> = [];

    for (let i = 0; i < 3; i++) {
      if (podiumUsers[i]) {
        top3.push({
          name: podiumUsers[i].username || 'Guerrero',
          avatar: podiumUsers[i].selected_avatar || 'gato',
          points: podiumUsers[i].focus_points || 0,
          wins: podiumUsers[i].podium_wins || 0
        });
      } else {
        top3.push(defaults[i]);
      }
    }

    // Ordenar de mayor a menor por puntos
    top3.sort((a, b) => b.points - a.points);

    const first = top3[0];
    const second = top3[1];
    const third = top3[2];

    // Formato requerido para la UI: [2º (izquierda), 1º (centro), 3º (derecha)]
    this.topPodiumUsers.set([
      {
        position: 2,
        name: second.name,
        avatar: second.avatar,
        color: this.membership.getAvatarColorById(second.avatar),
        value: `${second.points.toLocaleString()} puntos`,
        place: '2º',
        wins: second.wins || 2
      },
      {
        position: 1,
        name: first.name,
        avatar: first.avatar,
        color: this.membership.getAvatarColorById(first.avatar),
        value: `${first.points.toLocaleString()} puntos`,
        place: '1º',
        wins: first.wins || 5
      },
      {
        position: 3,
        name: third.name,
        avatar: third.avatar,
        color: this.membership.getAvatarColorById(third.avatar),
        value: `${third.points.toLocaleString()} puntos`,
        place: '3º',
        wins: third.wins || 1
      }
    ]);
  }

  private processHistoricalRecords(records: CommunityLeaderboardUser[]) {
    const defaultMasters = [
      { name: 'Dragón Imperial', avatar: 'dragon', tomatoes: 142, wins: 5 },
      { name: 'Lobo Samurai', avatar: 'lobo', tomatoes: 128, wins: 3 },
      { name: 'Búho Sabio', avatar: 'buho', tomatoes: 105, wins: 1 },
      { name: 'Zorro Ninja', avatar: 'zorro', tomatoes: 94, wins: 4 },
      { name: 'Panda Zen', avatar: 'panda', tomatoes: 81, wins: 2 }
    ];

    const mergedList: HistoricalRecordItem[] = [];

    for (let i = 0; i < 5; i++) {
      if (records[i] && (records[i].focus_tomatoes || 0) > 0) {
        mergedList.push({
          rank: i + 1,
          name: records[i].username || 'Guerrero',
          avatar: records[i].selected_avatar || 'gato',
          color: this.membership.getAvatarColorById(records[i].selected_avatar || 'gato'),
          tomatoes: records[i].focus_tomatoes || 0,
          wins: records[i].podium_wins || 0
        });
      } else {
        const d = defaultMasters[i];
        mergedList.push({
          rank: i + 1,
          name: d.name,
          avatar: d.avatar,
          color: this.membership.getAvatarColorById(d.avatar),
          tomatoes: d.tomatoes,
          wins: d.wins
        });
      }
    }

    mergedList.sort((a, b) => b.tomatoes - a.tomatoes);
    mergedList.forEach((r, idx) => r.rank = idx + 1);

    this.topHistoricalRecords.set(mergedList);
  }

  private processRecentAvatars(recent: CommunityLeaderboardUser[]) {
    const list: CommunityCompanionItem[] = recent.map(u => ({
      id: u.id,
      name: u.username || 'Guerrero',
      avatar: u.selected_avatar || 'gato',
      color: this.membership.getAvatarColorById(u.selected_avatar || 'gato'),
      wins: u.podium_wins || 0
    }));

    if (list.length > 0) {
      this.liveCommunityUsers.set(list);
    }
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
      this.startTimerLoop();
    }
  }

  resetTimer() {
    this.stopTimerLoop();
    this.timeLeft.set(this.totalSessionTime());
  }

  selectMode(mode: 'focus' | 'break') {
    this.stopTimerLoop();
    if (mode === 'focus') {
      this.isBreak.set(false);
      this.totalSessionTime.set(25 * 60);
      this.timeLeft.set(25 * 60);
    } else {
      this.isBreak.set(true);
      this.totalSessionTime.set(5 * 60);
      this.timeLeft.set(5 * 60);
    }
  }

  private startTimerLoop() {
    this.timerRunning.set(true);
    this.pomodoroTimer = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(t => t - 1);
      } else {
        this.stopTimerLoop();
        if (!this.isBreak()) {
          this.selectMode('break');
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
        }
      }
    }, 1000);
  }

  private stopTimerLoop() {
    this.timerRunning.set(false);
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

  zoomAvatar(avatarId: string, name: string, guardian: string, color: string, winsCount: number = 0) {
    this.zoomAvatarId.set(avatarId);
    this.zoomAvatarName.set(name);
    this.zoomAvatarGuardian.set(guardian);
    this.zoomAvatarColor.set(color);
    this.zoomAvatarWins.set(winsCount);
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
    this.router.navigate(['/enfoque']);
  }

  cancelJoinRoom() {
    this.showJoinConfirmation.set(false);
  }
}
