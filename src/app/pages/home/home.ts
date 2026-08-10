import { Component, signal, computed, OnInit, OnDestroy, WritableSignal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { IdentitySettings } from '../../components/identity-settings';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IdentitySettings],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  Math = Math;

  constructor(public membership: MembershipService, private router: Router) {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
  }

  // Métricas de la Comunidad (Reducido a máximo 100 usuarios activos para una comunidad íntima)
  private readonly targetFocusedUsers = 74; 
  private readonly targetCompletedObjectives = 342; // Proporcional a una comunidad de ~74 personas

  liveFocusedUsersCount = signal(0); // Inicia en 0 para animación
  liveCompletedObjectivesToday = signal(0); // Inicia en 0 para animación
  
  // Simulación de fluctuación de ranking por hora en vivo
  private rankTimer: any = null;
  liveRankShift = signal(0);
  lastUpdated = signal('');

  rankingPosition = computed(() => {
    const base = !this.membership.isPremium() ? 42 : Math.max(1, 42 - Math.floor(this.membership.focusPoints() / 30));
    return Math.max(1, base + this.liveRankShift());
  });

  percentageBeaten = computed(() => {
    const currentPos = this.rankingPosition();
    return Math.min(99, Math.max(1, 100 - currentPos));
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
  activeRankingFilter = signal<'dia' | 'mes' | 'anio'>('dia');

  rankingData = computed(() => {
    const filter = this.activeRankingFilter();
    if (filter === 'dia') {
      return [
        { position: 2, name: 'Lobo Veloz', avatar: 'fa-shield-halved', color: '#3a86f0', value: '450 XP', place: '2º' },
        { position: 1, name: 'Dragón Imperial', avatar: 'fa-dragon', color: '#a855f7', value: '600 XP', place: '1º' },
        { position: 3, name: 'Búho Sabio', avatar: 'fa-glasses', color: '#10b981', value: '380 XP', place: '3º' }
      ];
    } else if (filter === 'mes') {
      return [
        { position: 2, name: 'Zorro Astuto', avatar: 'fa-mask', color: '#ff007f', value: '8,400 XP', place: '2º' },
        { position: 1, name: 'Dragón Imperial', avatar: 'fa-dragon', color: '#a855f7', value: '9,800 XP', place: '1º' },
        { position: 3, name: 'León Valiente', avatar: 'fa-crown', color: '#f59e0b', value: '7,900 XP', place: '3º' }
      ];
    } else {
      return [
        { position: 2, name: 'Lobo Veloz', avatar: 'fa-shield-halved', color: '#3a86f0', value: '74,200 XP', place: '2º' },
        { position: 1, name: 'Zorro Astuto', avatar: 'fa-mask', color: '#ff007f', value: '82,500 XP', place: '1º' },
        { position: 3, name: 'Búho Sabio', avatar: 'fa-glasses', color: '#10b981', value: '68,400 XP', place: '3º' }
      ];
    }
  });

  // Lógica del Temporizador Pomodoro
  timeLeft = signal(25 * 60);
  totalSessionTime = signal(25 * 60);
  timerRunning = signal(false);
  isBreak = signal(false);
  private pomodoroTimer: any = null;

  labels = computed(() => {
    return {
      logoText: 'Kaizen Focus',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Dojo',
      navZen: 'Arena',
      navTimer: 'Espejo',
      navShield: 'Resultados',
      title: 'El Dojo',
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

  // Auxiliar para obtener el icono de mi avatar
  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  // Auxiliar para obtener el nombre de mi avatar
  getAvatarName() {
    return this.membership.getSelectedAvatarName();
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

    // Simular fluctuación dinámica de ranking (comunidad en vivo) cada 15 segundos
    this.rankTimer = setInterval(() => {
      // El ranking puede fluctuar levemente hacia arriba o abajo según actividad
      const randomShift = Math.floor(Math.random() * 3) - 1; // -1, 0, o 1
      this.liveRankShift.update(current => {
        const next = current + randomShift;
        // Limitar la variación entre -3 y +3 para que sea realista
        return Math.max(-3, Math.min(3, next));
      });
      this.updateLastUpdatedTime();
    }, 15000);

    // Animación de conteo desde cero para ambas métricas
    const duration = 1500;
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easeProgress = progress * (2 - progress);
      
      const currentFocused = Math.round(easeProgress * this.targetFocusedUsers);
      this.liveFocusedUsersCount.set(currentFocused);

      const currentCompleted = Math.round(easeProgress * this.targetCompletedObjectives);
      this.liveCompletedObjectivesToday.set(currentCompleted);

      if (frame >= totalFrames) {
        this.liveFocusedUsersCount.set(this.targetFocusedUsers);
        this.liveCompletedObjectivesToday.set(this.targetCompletedObjectives);
        clearInterval(timer);
      }
    }, frameRate);
  }

  ngOnDestroy() {
    this.stopTimerLoop();
    if (this.rankTimer) {
      clearInterval(this.rankTimer);
    }
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
        // Al terminar
        this.stopTimerLoop();
        if (!this.isBreak()) {
          // Completó foco
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
          // Completó descanso
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
