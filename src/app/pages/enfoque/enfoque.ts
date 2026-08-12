import { Component, signal, computed, OnInit, OnDestroy, WritableSignal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { IdentitySettings } from '../../components/identity-settings';

@Component({
  selector: 'app-enfoque',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, IdentitySettings],
  templateUrl: './enfoque.html',
  styleUrl: './enfoque.css',
})
export class Enfoque implements OnInit, OnDestroy {
  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  Math = Math;

  constructor(private router: Router, public membership: MembershipService) {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
  }

  // Acompañante de sesión compartida
  showPaywallModal = signal<boolean>(false);
  partnerTimeLeft = signal<number>(1500); // 25 min default
  partnerTimeString = computed(() => {
    const min = Math.floor(this.partnerTimeLeft() / 60);
    const sec = this.partnerTimeLeft() % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });
  partnerActive = signal<boolean>(true);
  partnerStatusText = signal<string>('Enfocado');
  partnerSessionTicks = signal<number>(0);

  // Toast Notificaciones del Acompañante
  showPartnerNotification = signal<boolean>(false);
  partnerNotificationMessage = signal<string>('');
  partnerNotificationType = signal<'info' | 'warning' | 'success' | 'danger'>('info');

  // Escudo acústico / Ruido de fondo en vivo
  backgroundSound = signal<'off' | 'cafe' | 'lluvia' | 'reloj_pared' | 'reloj_pulsera'>('off');
  backgroundVolume = signal(0.4);

  // Web Audio Context refs
  private backgroundAudioCtx: AudioContext | null = null;
  private backgroundSource: AudioBufferSourceNode | null = null;
  private backgroundGain: GainNode | null = null;

  // Estados de la Arena según la especificación:
  // 'setup' -> Configurando objetivo y ajustes.
  // 'countdown' -> Ritual 3-2-1 para cortocircuitar la indecisión.
  // 'active' -> Sesión de trabajo activa (pantalla oscura total libre de menús).
  // 'summary' -> Cierre dopamínico (Cuestionario post-sesión).
  arenaState = signal<'setup' | 'countdown' | 'active' | 'summary'>('setup');

  // Configuración del Pomodoro (Tiempos científicos fijos según el filtro Pareto)
  focusDuration = signal(25); // Predeterminado a 25 min (Estándar Pomodoro)
  breakDuration = signal(5);   // Predeterminado a 5 min (Descanso)
  longBreakInterval = signal(4); // 4 pomodoros antes de un descanso largo
  longBreakDuration = signal(15); // Duración de descanso largo (15 min)
  dailyAttempts = signal<{ status: 'completed' | 'abandoned' | 'interrupted', time: string }[]>(
    localStorage.getItem('daily-attempts') 
      ? JSON.parse(localStorage.getItem('daily-attempts')!) 
      : [
          { status: 'completed', time: '09:00' },
          { status: 'completed', time: '10:30' },
          { status: 'completed', time: '12:00' },
          { status: 'abandoned', time: '13:15' },
          { status: 'completed', time: '14:30' },
          { status: 'interrupted', time: '15:45' },
          { status: 'completed', time: '17:00' },
          { status: 'completed', time: '18:30' }
        ]
  );
  completedPomodoros = computed(() => {
    return this.dailyAttempts().filter(a => a.status === 'completed').length;
  });
  completedPomodorosArray = computed(() => Array(this.completedPomodoros()));
  limitedDailyAttempts = computed(() => {
    const attempts = this.dailyAttempts();
    if (attempts.length <= 8) {
      return attempts;
    }
    return attempts.slice(0, 7);
  });
  moreAttemptsCount = computed(() => {
    const len = this.dailyAttempts().length;
    return len > 8 ? len - 7 : 0;
  });
  totalCommunityPoints = computed(() => {
    if (this.membership.isPremium()) {
      return this.membership.focusPoints();
    }
    return this.dailyAttempts().reduce((acc, attempt) => {
      if (attempt.status === 'completed') return acc + 100;
      if (attempt.status === 'abandoned') return acc - 50;
      if (attempt.status === 'interrupted') return acc - 20;
      return acc;
    }, 0);
  });
  attemptsTooltipText = computed(() => {
    const completed = this.dailyAttempts().filter(a => a.status === 'completed').length;
    const interrupted = this.dailyAttempts().filter(a => a.status === 'interrupted').length;
    const abandoned = this.dailyAttempts().filter(a => a.status === 'abandoned').length;
    return `Sesiones de hoy: ${completed} completadas, ${interrupted} interrumpidas, ${abandoned} abandonadas`;
  });

  manuallyAbandoned = signal(false);
  interruptedByPause = signal(false);
  soundEnabled = signal(true);  
  soundType = signal<'zen' | 'digital' | 'chime'>('zen'); 
  coworkingMode = signal<'solo' | 'join' | 'host'>('solo');

  // Opciones de sonido para evitar errores de tipado estricto en plantillas Angular
  soundOptions: ('zen' | 'digital' | 'chime')[] = ['zen', 'chime', 'digital'];
  themeOptions: ('samurai' | 'cyberpunk' | 'aurora' | 'zen')[] = ['samurai', 'cyberpunk', 'aurora', 'zen'];

  // Control para mostrar ajustes secundarios de audio
  showSettingsPanel = signal(false);
  showSetupSettings = signal(false);

  // Notas rápidas / Ideas fugaces
  showIdeasModal = signal(false);

  openIdeasModal() {
    this.showIdeasModal.set(true);
  }

  closeIdeasModal() {
    this.showIdeasModal.set(false);
  }

  clearAllIdeas() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el baúl de ideas?')) {
      this.membership.clearAllIdeas();
    }
  }

  removeIdea(index: number) {
    this.membership.removeIdea(index);
  }

  // Objetivo Activo (La batalla de hoy) e Integración Metodológica
  activeObjective = signal('');
  activeMethodology = signal<'sapo' | 'pareto' | 'normal'>('sapo');

  selectMethodology(method: 'sapo' | 'pareto' | 'normal') {
    this.activeMethodology.set(method);
  }

  // Lógica del Temporizador
  timeLeft = signal(25 * 60);
  totalSessionTime = signal(25 * 60);
  timerRunning = signal(false);
  isBreak = signal(false);
  private pomodoroTimer: any = null;

  // Lógica del Ritual 3-2-1
  countdownValue = signal(3);
  private countdownTimer: any = null;

  // Lógica del Botón de Pánico (Pausa de Emergencia de 2 min)
  emergencyPauseActive = signal(false);
  emergencyTimeLeft = signal(120); // 2 minutos en segundos
  private emergencyTimer: any = null;

  // Datos del Co-worker asignado (Modo Acompañado)
  partnerName = signal('');
  partnerAvatar = signal('');
  partnerStatus = signal<'focused' | 'left'>('focused');

  // Listado de compañeros activos en el dojo (Simulación)
  onlinePartners = signal([
    { name: 'Ana', avatar: 'lobo', remainingMinutes: 47 },
    { name: 'Ramiro', avatar: 'zorro', remainingMinutes: 24 },
    { name: 'Sofía', avatar: 'aguila', remainingMinutes: 30 },
    { name: 'Carlos', avatar: 'panda', remainingMinutes: 15 },
    { name: 'Juan', avatar: 'lobo', remainingMinutes: 3 } // Menos de 5 minutos, filtrado
  ]);

  // Compañeros visibles (Filtrados: al menos 20 minutos restantes, máximo 5)
  visiblePartners = computed(() => {
    return this.onlinePartners()
      .filter(p => p.remainingMinutes >= 20)
      .slice(0, 5);
  });

  // Modal de Mensaje de Apoyo
  showSupportMessageModal = signal(false);
  predefinedSupportMessages = [
    '⚡ ¡Fuerza en este bloque! A darle con todo.',
    '🧠 Concentración absoluta. ¡Cero distracciones!',
    '🤝 Sincronización activada. ¡Hagamos que valga la pena!',
    '🎯 Tu futuro yo te agradecerá este enfoque. ¡Adelante!'
  ];
  selectedSupportMessage = signal('⚡ ¡Fuerza en este bloque! A darle con todo.');

  // Modal de Mensaje Post-Sesión (al salir y dejar a tu compañero)
  showPostSessionSupportModal = signal(false);
  predefinedPostSessionMessages = [
    '⚡ ¡Tú puedes con el cierre! Te espero en el dojo.',
    '🧠 ¡No aflojes ahora! Ya casi lo tienes.',
    '🎯 ¡Último esfuerzo! Termina con broche de oro.',
    '👋 ¡Sigue enfocado! Nos vemos en el próximo bloque.'
  ];
  selectedPostSessionMessage = signal('⚡ ¡Tú puedes con el cierre! Te espero en el dojo.');

  // Resultados del Cuestionario Post-Sesión
  sessionEndingStatus = signal<'completed' | 'interrupted' | 'abandoned'>('completed');
  objectiveCompleted = signal<'yes' | 'no' | 'progress' | null>(null);

  labels = computed(() => {
    return {
      logoText: 'COFU',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Inicio',
      navZen: 'Zona de concentración',
      navTimer: 'Estadísticas',
      navShield: 'Baúl de ideas',
      navIdeas: 'Baúl de Ideas',
      title: 'Zona de concentración',
      desc: 'Antes de comenzar tu viaje de enfoque, personaliza tu sesión y declara la misión que conquistarás hoy.'
    };
  });

  // Formato del tiempo en MM:SS
  timeString = computed(() => {
    const min = Math.floor(this.timeLeft() / 60);
    const sec = this.timeLeft() % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  // Formato de Pausa de Emergencia MM:SS
  emergencyTimeString = computed(() => {
    const min = Math.floor(this.emergencyTimeLeft() / 60);
    const sec = this.emergencyTimeLeft() % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  // Progreso circular (Radio r = 135, Circunferencia = 848)
  strokeDashoffset = computed(() => {
    const total = this.totalSessionTime();
    const left = this.timeLeft();
    const pct = left / total;
    return 848 * (1 - pct);
  });

  ngOnInit() {
    const partnerName = localStorage.getItem('shared-session-partner-name');
    const partnerAvatar = localStorage.getItem('shared-session-partner-avatar');
    if (partnerName && partnerAvatar) {
      this.coworkingMode.set('join');
      this.partnerName.set(partnerName);
      this.partnerAvatar.set(partnerAvatar);
      
      // Mostrar toast de entrada con el emoji del animal correspondiente
      const emoji = partnerAvatar === 'lobo' ? '🐺' : (partnerAvatar === 'zorro' ? '🦊' : '🐾');
      setTimeout(() => {
        this.showToast(`👥 ${emoji} ${partnerName} se unió a tu sesión.`, 'info');
      }, 1000);
      
      // Asignar tiempo inicial dinámico basado en cuándo iniciaron en el Dojo:
      // Ana inició hace 3 min en sesión de 50 min => 47 min restante (2820 seg)
      // Ramiro inició hace 1 min en sesión de 25 min => 24 min restante (1440 seg)
      if (partnerName.toLowerCase().includes('ana')) {
        this.partnerTimeLeft.set(2820);
      } else if (partnerName.toLowerCase().includes('ramiro')) {
        this.partnerTimeLeft.set(1440);
      } else {
        this.partnerTimeLeft.set(1500);
      }

      localStorage.removeItem('shared-session-partner-name');
      localStorage.removeItem('shared-session-partner-avatar');
    } else {
      // Fallback
      this.partnerTimeLeft.set(1500);
    }
  }

  // Iniciar Flujo: Lanza el Ritual 3-2-1
  startFocusFlow(bypassModal = false) {
    // Si nos estamos uniendo a una sesión y no hemos confirmado el mensaje de apoyo, mostramos el modal primero
    if (this.coworkingMode() === 'join' && this.partnerName() && !bypassModal) {
      this.showSupportMessageModal.set(true);
      return;
    }

    this.showSupportMessageModal.set(false);
    this.manuallyAbandoned.set(false);
    this.interruptedByPause.set(false);
    this.objectiveCompleted.set(null);
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.emergencyPauseActive.set(false);
    
    // Resetear variables del compañero
    this.partnerSessionTicks.set(0);
    this.partnerActive.set(true);
    this.partnerStatusText.set('Enfocado');
    this.showPartnerNotification.set(false);

    // Configurar tiempos iniciales según setup
    this.totalSessionTime.set(this.focusDuration() * 60);
    this.timeLeft.set(this.focusDuration() * 60);
    this.isBreak.set(false);
    
    // Cambiar a estado cuenta regresiva
    this.arenaState.set('countdown');
    this.countdownValue.set(3);

    // Sonido sutil de preparación
    this.playTone(220, 'sine', 0.1, 0.15);

    this.countdownTimer = setInterval(() => {
      if (this.countdownValue() > 1) {
        this.countdownValue.update(v => v - 1);
        this.playTone(220, 'sine', 0.1, 0.15);
      } else {
        // Al llegar a cero
        clearInterval(this.countdownTimer);
        this.arenaState.set('active');
        this.startTimerLoop();
        // Sonido de inicio
        this.playTone(440, 'triangle', 0.15, 0.3);
      }
    }, 1000);
  }

  confirmSupportMessageAndStart() {
    this.showSupportMessageModal.set(false);
    
    // Guardamos en localStorage el mensaje enviado para simular persistencia
    const msg = this.selectedSupportMessage();
    localStorage.setItem('last-sent-support-message', msg);
    
    // Arrancamos el pomodoro saltándonos la validación del modal
    this.startFocusFlow(true);
  }

  // Pausa de Emergencia (Botón de Pánico)
  toggleEmergencyPause() {
    if (this.emergencyPauseActive()) {
      // Reanudar
      this.stopEmergencyTimer();
      this.emergencyPauseActive.set(false);
      this.startTimerLoop();
    } else {
      // Activar pausa
      this.stopTimerLoop();
      this.emergencyPauseActive.set(true);
      
      const limitSeconds = this.membership.isPremium() ? 180 : 120;
      this.emergencyTimeLeft.set(limitSeconds);

      this.emergencyTimer = setInterval(() => {
        if (this.emergencyTimeLeft() > 0) {
          this.emergencyTimeLeft.update(t => t - 1);
          
          // Simular que a la mitad del tiempo de pausa Sofía "abandona" para motivarte
          const halfTime = this.membership.isPremium() ? 90 : 60;
          if (this.emergencyTimeLeft() === halfTime && (this.coworkingMode() === 'join' || this.coworkingMode() === 'host')) {
            this.partnerStatus.set('left');
          }
        } else {
          // Se acabó el tiempo de pausa -> Sesión Interrumpida automáticamente
          this.stopEmergencyTimer();
          this.sessionEndingStatus.set('interrupted');
          this.interruptedByPause.set(true);
          this.arenaState.set('summary');
          this.playTone(150, 'sawtooth', 0.15, 0.5);
        }
      }, 1000);
    }
  }

  // Abandonar Sesión (Lanza Cuestionario Post-Sesión)
  abandonSession() {
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    this.backgroundSound.set('off');
    this.sessionEndingStatus.set('abandoned');
    this.manuallyAbandoned.set(true);
    this.arenaState.set('summary');
  }

  simulateCompletion() {
    this.timeLeft.set(0);
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.sessionEndingStatus.set('completed');
    this.arenaState.set('summary');
    this.playAlarmTone();
  }

  finishSession() {
    this.stopBackgroundSound();
    this.backgroundSound.set('off');

    const currentStatus = this.sessionEndingStatus();
    if (currentStatus) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const newAttempt = { status: currentStatus as 'completed' | 'abandoned' | 'interrupted', time: timeStr };
      const updatedAttempts = [...this.dailyAttempts(), newAttempt];
      this.dailyAttempts.set(updatedAttempts);
      localStorage.setItem('daily-attempts', JSON.stringify(updatedAttempts));

      // Asignar puntos y recompensas
      if (currentStatus === 'completed') {
        const isShared = this.coworkingMode() === 'join' || this.coworkingMode() === 'host';
        const sessionId = `session-${Date.now()}`;
        this.membership.rewardCompletedSession(sessionId, isShared);
        
        // Recompensa adicional por objetivo cumplido (Pregunta 2)
        const objCompleted = this.objectiveCompleted();
        if (objCompleted === 'yes' || objCompleted === 'progress') {
          const objectiveId = `obj-${Date.now()}`;
          this.membership.rewardCompletedObjective(objectiveId);
        }

        // Si estamos en coworking (join) y el compañero aún no ha terminado, mostramos la modal post-sesión
        if (this.coworkingMode() === 'join' && this.partnerName() && !this.showPostSessionSupportModal()) {
          this.showPostSessionSupportModal.set(true);
          return;
        }
      } else if (currentStatus === 'abandoned' && this.membership.isPremium()) {
        // Castigo de -50 XP por abandonar
        this.membership.addFocusPoints(-50);
      }
    }

    this.objectiveCompleted.set(null);
    this.arenaState.set('setup');
    this.router.navigate(['/home']);
  }

  confirmPostSessionMessageAndExit() {
    this.showPostSessionSupportModal.set(false);
    
    // Guardamos en localStorage el mensaje enviado para simular persistencia
    const msg = this.selectedPostSessionMessage();
    localStorage.setItem('last-sent-post-session-message', msg);
    
    this.objectiveCompleted.set(null);
    this.arenaState.set('setup');
    this.router.navigate(['/home']);
  }

  resetDailyAttempts() {
    if (confirm('¿Quieres reiniciar todos los pomodoros y registros de hoy?')) {
      this.dailyAttempts.set([]);
      localStorage.setItem('daily-attempts', '[]');
    }
  }

  resumeSession() {
    this.manuallyAbandoned.set(false);
    this.interruptedByPause.set(false);
    this.arenaState.set('active');
    this.startTimerLoop();
  }

  // Reiniciar desde Setup
  cancelAndExit() {
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    this.backgroundSound.set('off');
    this.objectiveCompleted.set(null);
    this.arenaState.set('setup');
  }

  // Auxiliares de navegación sidebar
  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  getPartnerIcon(id: string) {
    const avatar = this.membership.avatarsCatalog().find(a => a.id === id);
    return avatar ? avatar.icon : 'fa-mask';
  }

  getPartnerColor(id: string) {
    const avatar = this.membership.avatarsCatalog().find(a => a.id === id);
    return avatar ? avatar.color : '#ff007f';
  }

  // Cambiar tema global
  changeTheme(theme: 'samurai' | 'cyberpunk' | 'aurora' | 'zen') {
    this.currentTheme.set(theme);
    localStorage.setItem('procrastina-theme', theme);
    const body = document.body;
    body.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        body.classList.remove(className);
      }
    });
    body.classList.add(`theme-${theme}`);
  }

  // Generadores de Ruido (Web Audio API)
  private createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2; // 2 segundos
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Normalización aproximada
    }
    return buffer;
  }

  private createRainNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.11;
    }
    return buffer;
  }

  private createWallClockBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2; // 2 segundos para "tick-tock" completo
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    const tickTime1 = 0;
    const tickTime2 = ctx.sampleRate; // a 1 segundo
    const duration = Math.round(ctx.sampleRate * 0.03); // 30ms
    
    // "Tick"
    for (let i = 0; i < duration; i++) {
      const t = i / ctx.sampleRate;
      const tone = Math.sin(2 * Math.PI * 2500 * t) * Math.exp(-150 * t);
      const noise = (Math.random() * 2 - 1) * Math.exp(-250 * t) * 0.2;
      data[tickTime1 + i] = (tone + noise) * 0.6;
    }
    
    // "Tock"
    for (let i = 0; i < duration; i++) {
      const t = i / ctx.sampleRate;
      const tone = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-120 * t);
      const noise = (Math.random() * 2 - 1) * Math.exp(-200 * t) * 0.2;
      data[tickTime2 + i] = (tone + noise) * 0.5;
    }
    
    return buffer;
  }

  private createWristwatchBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 1; // 1 segundo de bucle
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    const tickInterval = Math.round(ctx.sampleRate * 0.25); // 4 ticks por segundo (cada 250ms)
    const duration = Math.round(ctx.sampleRate * 0.015); // 15ms
    
    for (let tickIdx = 0; tickIdx < 4; tickIdx++) {
      const startOffset = tickIdx * tickInterval;
      const freq = tickIdx % 2 === 0 ? 3200 : 2800;
      const vol = tickIdx % 2 === 0 ? 0.4 : 0.35;
      
      for (let i = 0; i < duration; i++) {
        const t = i / ctx.sampleRate;
        const tone = Math.sin(2 * Math.PI * freq * t) * Math.exp(-300 * t);
        const noise = (Math.random() * 2 - 1) * Math.exp(-400 * t) * 0.15;
        data[startOffset + i] = (tone + noise) * vol;
      }
    }
    
    return buffer;
  }

  updateBackgroundSound(sound: 'off' | 'cafe' | 'lluvia' | 'reloj_pared' | 'reloj_pulsera') {
    this.backgroundSound.set(sound);
    this.stopBackgroundSound();

    if (sound === 'off') return;

    try {
      if (!this.backgroundAudioCtx) {
        this.backgroundAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.backgroundAudioCtx.state === 'suspended') {
        this.backgroundAudioCtx.resume();
      }

      let buffer: AudioBuffer;
      if (sound === 'cafe') {
        buffer = this.createBrownNoiseBuffer(this.backgroundAudioCtx);
      } else if (sound === 'lluvia') {
        buffer = this.createRainNoiseBuffer(this.backgroundAudioCtx);
      } else if (sound === 'reloj_pared') {
        buffer = this.createWallClockBuffer(this.backgroundAudioCtx);
      } else {
        buffer = this.createWristwatchBuffer(this.backgroundAudioCtx);
      }

      this.backgroundSource = this.backgroundAudioCtx.createBufferSource();
      this.backgroundSource.buffer = buffer;
      this.backgroundSource.loop = true;

      this.backgroundGain = this.backgroundAudioCtx.createGain();
      this.backgroundGain.gain.value = this.backgroundVolume();

      if (sound === 'lluvia') {
        const filter = this.backgroundAudioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1400; // filtro para lluvia suave
        this.backgroundSource.connect(filter);
        filter.connect(this.backgroundGain);
      } else {
        this.backgroundSource.connect(this.backgroundGain);
      }

      this.backgroundGain.connect(this.backgroundAudioCtx.destination);
      this.backgroundSource.start(0);
    } catch (e) {
      console.error('Error al iniciar audio de fondo:', e);
    }
  }

  updateBackgroundVolume(vol: number) {
    this.backgroundVolume.set(vol);
    if (this.backgroundGain) {
      this.backgroundGain.gain.setValueAtTime(vol, this.backgroundAudioCtx ? this.backgroundAudioCtx.currentTime : 0);
    }
  }

  stopBackgroundSound() {
    if (this.backgroundSource) {
      try {
        this.backgroundSource.stop();
      } catch (e) {}
      this.backgroundSource.disconnect();
      this.backgroundSource = null;
    }
    if (this.backgroundGain) {
      this.backgroundGain.disconnect();
      this.backgroundGain = null;
    }
  }

  ngOnDestroy() {
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  // Controles del Temporizador en Setup
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
      this.totalSessionTime.set(this.focusDuration() * 60);
      this.timeLeft.set(this.focusDuration() * 60);
    } else {
      this.isBreak.set(true);
      const isLongBreak = this.completedPomodoros() > 0 && (this.completedPomodoros() % this.longBreakInterval() === 0);
      const duration = isLongBreak ? this.longBreakDuration() : this.breakDuration();
      this.totalSessionTime.set(duration * 60);
      this.timeLeft.set(duration * 60);
    }
  }

  applyTimeSettings() {
    this.stopTimerLoop();
    if (!this.isBreak()) {
      this.totalSessionTime.set(this.focusDuration() * 60);
      this.timeLeft.set(this.focusDuration() * 60);
    } else {
      const isLongBreak = this.completedPomodoros() > 0 && (this.completedPomodoros() % this.longBreakInterval() === 0);
      const duration = isLongBreak ? this.longBreakDuration() : this.breakDuration();
      this.totalSessionTime.set(duration * 60);
      this.timeLeft.set(duration * 60);
    }
  }

  // Setter auxiliar de tipo de sonido
  setSoundType(type: 'zen' | 'digital' | 'chime') {
    this.soundType.set(type);
    this.playAlarmTone();
  }

  private startTimerLoop() {
    this.timerRunning.set(true);
    if (this.backgroundSound() !== 'off') {
      this.updateBackgroundSound(this.backgroundSound());
    }
    this.pomodoroTimer = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(t => t - 1);

        // Simulación en tiempo real del Acompañante
        if (this.coworkingMode() === 'join' || this.coworkingMode() === 'host') {
          if (this.partnerActive() && this.partnerTimeLeft() > 0) {
            this.partnerTimeLeft.update(pt => pt - 1);
          }
          this.partnerSessionTicks.update(ticks => ticks + 1);
          this.triggerPartnerSimulatedEvents();
        }
      } else {
        // Al terminar con éxito
        this.stopTimerLoop();
        if (!this.isBreak()) {
          // Cambiar a descanso y lanzar cuestionario como completado
          this.sessionEndingStatus.set('completed');
          this.arenaState.set('summary');
          this.playAlarmTone();
        } else {
          // Fin del descanso, vuelve a enfoque setup
          this.arenaState.set('setup');
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
    this.stopBackgroundSound();
  }

  private stopEmergencyTimer() {
    if (this.emergencyTimer) {
      clearInterval(this.emergencyTimer);
      this.emergencyTimer = null;
    }
  }

  // Generador de tonos genéricos Web Audio API
  private playTone(freq: number, type: OscillatorType, volume: number, duration: number) {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch(e){}
  }

  // Campana sonora configurable
  playAlarmTone() {
    if (!this.soundEnabled()) return;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const type = this.soundType();
      if (type === 'zen') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      } else if (type === 'chime') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch(e){}
  }

  buyAvatar(avatar: string, cost: number) {
    if (!this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }
    const success = this.membership.unlockAvatar(avatar, cost);
    if (success) {
      this.membership.selectedAvatar.set(avatar as any);
      alert(`¡Felicidades! Has desbloqueado el avatar ${avatar.toUpperCase()} con éxito.`);
    } else {
      alert('No tienes suficientes Pro Coins. Completa más sesiones para ganar monedas.');
    }
  }

  selectThemeOption(theme: 'samurai' | 'cyberpunk' | 'aurora' | 'zen') {
    if (theme === 'samurai' || this.membership.unlockedThemes().includes(theme)) {
      this.changeTheme(theme);
      return;
    }

    if (!this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }

    const cost = theme === 'cyberpunk' ? 100 : theme === 'aurora' ? 150 : 200;
    const confirmBuy = confirm(`El tema ${theme.toUpperCase()} cuesta ${cost} Pro Coins. ¿Deseas desbloquearlo? Tienes ${this.membership.proCoins()} Pro Coins.`);
    if (confirmBuy) {
      const success = this.membership.unlockTheme(theme, cost);
      if (success) {
        this.changeTheme(theme);
        alert(`¡Tema ${theme.toUpperCase()} desbloqueado y equipado!`);
      } else {
        alert('No tienes suficientes Pro Coins para desbloquear este tema.');
      }
    }
  }

  setFocusMode(mode: 'solo' | 'join' | 'host') {
    if (mode === 'solo') {
      this.disconnectPartner();
      return;
    }

    if (!this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }

    this.coworkingMode.set(mode);
    if (mode === 'host') {
      this.partnerName.set('');
      this.partnerAvatar.set('');
      this.partnerActive.set(false);
    }
  }

  connectPartner(name: string, avatar: string) {
    if (!this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }
    this.coworkingMode.set('join');
    this.partnerName.set(name);
    this.partnerAvatar.set(avatar);
    this.partnerActive.set(true);
    this.partnerStatus.set('focused');
    this.partnerStatusText.set('Enfocado');

    const emoji = avatar === 'lobo' ? '🐺' : (avatar === 'zorro' ? '🦊' : (avatar === 'panda' ? '🐼' : '🐾'));
    this.showToast(`👥 ${emoji} Conectado con ${name}. ¡Listos para enfocarse!`, 'info');

    // Asignar tiempo inicial dinámico basado en cuándo iniciaron en el Dojo:
    if (name.toLowerCase().includes('ana')) {
      this.partnerTimeLeft.set(2820);
    } else if (name.toLowerCase().includes('ramiro')) {
      this.partnerTimeLeft.set(1440);
    } else if (name.toLowerCase().includes('carlos')) {
      this.partnerTimeLeft.set(900);
    } else {
      this.partnerTimeLeft.set(1500);
    }
  }

  disconnectPartner() {
    this.coworkingMode.set('solo');
    this.partnerName.set('');
    this.partnerAvatar.set('');
    this.partnerActive.set(false);
    this.showToast(`👤 Has vuelto a enfocarte en solitario.`, 'info');
  }

  triggerPartnerSimulatedEvents() {
    const ticks = this.partnerSessionTicks();
    
    // Si estamos en modo host y todavía nadie se ha unido, simulamos que Ana se une a los 15 segundos
    if (this.coworkingMode() === 'host' && !this.partnerName()) {
      if (ticks === 15) {
        this.partnerName.set('Ana');
        this.partnerAvatar.set('lobo');
        this.partnerTimeLeft.set(this.timeLeft());
        this.partnerActive.set(true);
        this.partnerStatus.set('focused');
        this.partnerStatusText.set('Enfocado');
        
        // Simular notificación en consola/UI
        const emoji = '🐺';
        this.showToast(`👥 ${emoji} Ana se unió a tu sesión pública.`, 'info');
      }
      return;
    }

    const name = this.partnerName() || 'Tu compañero';

    if (ticks === 15 || (this.coworkingMode() === 'host' && ticks === 30)) {
      this.showToast(`${name}: "¡Qué buen ritmo llevamos! ¡Mucho éxito en tu sesión!"`, 'info');
    } else if (ticks === 45) {
      this.partnerActive.set(false);
      this.partnerStatusText.set('En Pausa');
      const msg = name.toLowerCase().includes('ana') 
        ? `⚠️ Ana ha activado Pausa de Emergencia: "¡Mucho éxito, termina pronto! Vuelvo en 2 min."`
        : `⚠️ ${name} ha pausado su sesión: "¡No aflojes el ritmo, termina pronto!"`;
      this.showToast(msg, 'warning');
    } else if (ticks === 75) {
      this.partnerActive.set(true);
      this.partnerStatusText.set('Enfocado');
      const msg = name.toLowerCase().includes('ana')
        ? `🟢 Ana ha reanudado su sesión. "¡Listo, sigamos concentrados!"`
        : `🟢 ${name} ha reanudado. "¡Seguimos dándole con todo!"`;
      this.showToast(msg, 'success');
    } else if (ticks === 110) {
      if (name.toLowerCase().includes('ana')) {
        this.partnerActive.set(false);
        this.partnerStatusText.set('Abandonado');
        this.showToast(`❌ Ana ha abandonado la sesión: "¡Uf! Me surgió una llamada urgente. ¡Sigue tú, no te rindas, mucha suerte!"`, 'danger');
      } else {
        this.showToast(`${name}: "¡Ya casi terminamos! Un último esfuerzo."`, 'info');
      }
    } else if (this.partnerTimeLeft() === 0 && this.partnerActive()) {
      this.partnerActive.set(false);
      this.partnerStatusText.set('Completado');
      const msg = `🎉 ${name} ha completado su sesión: "¡Misión cumplida! Mucha suerte, termina pronto."`;
      this.showToast(msg, 'success');
    }
  }

  showToast(msg: string, type: 'info' | 'warning' | 'success' | 'danger') {
    // Si estamos en la sesión activa de Pomodoro, se silencian las notificaciones para evitar cualquier distracción
    if (this.arenaState() === 'active') {
      return;
    }

    this.partnerNotificationMessage.set(msg);
    this.partnerNotificationType.set(type);
    this.showPartnerNotification.set(true);
    
    setTimeout(() => {
      if (this.partnerNotificationMessage() === msg) {
        this.showPartnerNotification.set(false);
      }
    }, 8000);
  }

  getPartnerSupportMessage() {
    const name = this.partnerName().toLowerCase();
    if (name.includes('ana')) {
      return '🧠 Concentración absoluta. ¡Cero distracciones!';
    } else if (name.includes('ramiro')) {
      return '⚡ ¡Fuerza en este bloque! A darle con todo.';
    } else if (name.includes('sofía')) {
      return '🤝 Sincronización activada. ¡Hagamos que valga la pena!';
    } else if (name.includes('carlos')) {
      return '🎯 Tu futuro yo te agradecerá este enfoque. ¡Adelante!';
    }
    return '⚡ ¡Fuerza en este bloque! A darle con todo.';
  }
}
