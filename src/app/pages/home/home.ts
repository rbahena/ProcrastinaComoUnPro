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
  liveFocusedUsersCount = signal<number>(1);
  liveCompletedObjectivesToday = signal<number>(0);
  liveUserRank = signal<number>(1);
  totalCommunityUsers = signal<number>(1);

  // Realtime
  private realtimeChannel: any = null;
  lastUpdated = signal('');

  // Compañeros en vivo para avatar stack (inicia vacío y se llena con datos reales)
  liveCommunityUsers = signal<CommunityCompanionItem[]>([]);

  // Podio Semanal (Top 3 real en orden [2º, 1º, 3º] para la UI)
  topPodiumUsers = signal<PodiumDisplayItem[]>([]);

  // Récords Históricos (Top 5 real por Pomodoros)
  topHistoricalRecords = signal<HistoricalRecordItem[]>([]);

  rankingData = computed(() => {
    return this.topPodiumUsers();
  });

  hasPodiumWinners = computed(() => {
    const list = this.topPodiumUsers();
    if (!list || list.length < 3) return false;
    return list.some(u => u.name !== 'En disputa' && u.name !== 'Disponible' && (u.value && u.value !== '0 puntos' && u.value !== 'Disponible'));
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

    // 2. Suscribirse a cambios en tiempo real en la tabla profiles y focus_sessions
    if (this.supabaseService.isConfigured()) {
      this.realtimeChannel = this.supabaseService.client
        .channel('public:profiles_home_dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          this.loadDashboardFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => {
          this.loadDashboardFromSupabase();
        })
        .subscribe();
    }
  }

  ngOnDestroy() {
    this.stopTimerLoop();
    if (this.realtimeChannel && this.supabaseService.isConfigured()) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
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

      // 2. Ranking real del usuario
      this.liveUserRank.set(data.user_rank || 1);

      // 3. Podio Semanal (Top 3 real de base de datos)
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

  private processPodiumData(podiumUsers: CommunityLeaderboardUser[]) {
    // Filtrar solo usuarios que tengan puntos o tomates registrados en BD
    const activeUsers = (podiumUsers || []).filter(u => (u.focus_points || 0) > 0 || (u.focus_tomatoes || 0) > 0);

    if (activeUsers.length === 0) {
      this.topPodiumUsers.set([]);
      return;
    }

    const firstUser = activeUsers[0];
    const secondUser = activeUsers[1];
    const thirdUser = activeUsers[2];

    const first: PodiumDisplayItem = {
      position: 1,
      name: firstUser.username || 'Guerrero',
      avatar: firstUser.selected_avatar || 'gato',
      color: this.membership.getAvatarColorById(firstUser.selected_avatar || 'gato'),
      value: (firstUser.focus_points || 0) > 0 ? `${(firstUser.focus_points || 0).toLocaleString()} puntos` : `${firstUser.focus_tomatoes || 0} 🍅`,
      place: '1º',
      wins: firstUser.podium_wins || 0
    };

    const second: PodiumDisplayItem = secondUser ? {
      position: 2,
      name: secondUser.username || 'Guerrero',
      avatar: secondUser.selected_avatar || 'gato',
      color: this.membership.getAvatarColorById(secondUser.selected_avatar || 'gato'),
      value: (secondUser.focus_points || 0) > 0 ? `${(secondUser.focus_points || 0).toLocaleString()} puntos` : `${secondUser.focus_tomatoes || 0} 🍅`,
      place: '2º',
      wins: secondUser.podium_wins || 0
    } : {
      position: 2,
      name: 'En disputa',
      avatar: 'lobo',
      color: '#3a86f0',
      value: 'Disponible',
      place: '2º',
      wins: 0
    };

    const third: PodiumDisplayItem = thirdUser ? {
      position: 3,
      name: thirdUser.username || 'Guerrero',
      avatar: thirdUser.selected_avatar || 'gato',
      color: this.membership.getAvatarColorById(thirdUser.selected_avatar || 'gato'),
      value: (thirdUser.focus_points || 0) > 0 ? `${(thirdUser.focus_points || 0).toLocaleString()} puntos` : `${thirdUser.focus_tomatoes || 0} 🍅`,
      place: '3º',
      wins: thirdUser.podium_wins || 0
    } : {
      position: 3,
      name: 'En disputa',
      avatar: 'buho',
      color: '#10b981',
      value: 'Disponible',
      place: '3º',
      wins: 0
    };

    // Formato requerido para la UI: [2º (izquierda), 1º (centro), 3º (derecha)]
    this.topPodiumUsers.set([second, first, third]);
  }

  private processHistoricalRecords(records: CommunityLeaderboardUser[]) {
    const list: HistoricalRecordItem[] = [];

    if (records && records.length > 0) {
      records.forEach((r, idx) => {
        list.push({
          rank: idx + 1,
          name: r.username || 'Guerrero',
          avatar: r.selected_avatar || 'gato',
          color: this.membership.getAvatarColorById(r.selected_avatar || 'gato'),
          tomatoes: r.focus_tomatoes || 0,
          wins: r.podium_wins || 0
        });
      });
    } else {
      // Si no hay otros usuarios, registrar al usuario actual con sus pomodoros reales
      list.push({
        rank: 1,
        name: this.userName(),
        avatar: this.selectedAvatar(),
        color: this.getSelectedAvatarColor(),
        tomatoes: this.membership.focusTomatoes(),
        wins: this.membership.podiumWins()
      });
    }

    this.topHistoricalRecords.set(list.slice(0, 10));
  }

  private processRecentAvatars(recent: CommunityLeaderboardUser[]) {
    const list: CommunityCompanionItem[] = [];

    if (recent && recent.length > 0) {
      recent.forEach(u => {
        list.push({
          id: u.id,
          name: u.username || 'Guerrero',
          avatar: u.selected_avatar || 'gato',
          color: this.membership.getAvatarColorById(u.selected_avatar || 'gato'),
          wins: u.podium_wins || 0
        });
      });
    } else {
      list.push({
        id: 'self',
        name: this.userName(),
        avatar: this.selectedAvatar(),
        color: this.getSelectedAvatarColor(),
        wins: this.membership.podiumWins()
      });
    }

    this.liveCommunityUsers.set(list);
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
