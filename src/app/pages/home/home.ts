import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  currentTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>('samurai');
  userName = signal('Ramiro');

  // Mi Avatar / Guardián activo
  selectedAvatar = signal<'lobo' | 'leon' | 'buho' | 'zorro' | 'dragon'>('zorro');

  // Métricas de la Comunidad (Reducido a máximo 100 usuarios activos para una comunidad íntima)
  private readonly targetFocusedUsers = 74; 
  private readonly targetCompletedObjectives = 342; // Proporcional a una comunidad de ~74 personas

  liveFocusedUsersCount = signal(0); // Inicia en 0 para animación
  liveCompletedObjectivesToday = signal(0); // Inicia en 0 para animación
  rankingPosition = signal(42);
  percentageBeaten = signal(84);

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
    switch (this.selectedAvatar()) {
      case 'lobo': return 'fa-shield-halved';
      case 'leon': return 'fa-crown';
      case 'buho': return 'fa-glasses';
      case 'dragon': return 'fa-dragon';
      default: return 'fa-mask';
    }
  }

  // Auxiliar para obtener el nombre de mi avatar
  getAvatarName() {
    switch (this.selectedAvatar()) {
      case 'lobo': return 'Lobo Samurai';
      case 'leon': return 'León Shogun';
      case 'buho': return 'Búho Estratega';
      case 'dragon': return 'Dragón Guardián';
      default: return 'Zorro Ninja';
    }
  }

  ngOnInit() {
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
}
