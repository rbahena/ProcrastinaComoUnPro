import { Component, signal, computed, OnInit, OnDestroy, WritableSignal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { IdentitySettings } from '../../components/identity-settings';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-enfoque',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IdentitySettings, Navbar],
  templateUrl: './enfoque.html',
  styleUrl: './enfoque.css',
  host: {
    '[class.zen-inactive]': 'isInactive()'
  }
})
export class Enfoque implements OnInit, OnDestroy {
  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  sidebarCollapsed!: any;
  Math = Math;

  constructor(
    private router: Router, 
    public membership: MembershipService,
    public bossService: ComunidadBossService
  ) {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;

    // Initialize Comunidad Boss theme to Siren of Distractions
    this.bossService.updateBossTheme('siren');
  }

  // Acompañante de sesión compartida
  showPaywallModal = signal<boolean>(false);
  showComunidadUsers = signal<boolean>(false);
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
  coworkingMode = signal<'solo' | 'comunitario'>('comunitario');
  activeBackground = signal<'off' | 'fairy' | 'lofi_study_desktop' | 'lofi_moons' | 'lofi_study_rain'>(
    (localStorage.getItem('focus-active-bg') as any) || 'off'
  );
  backgroundOptions: ('off' | 'fairy' | 'lofi_study_desktop' | 'lofi_moons' | 'lofi_study_rain')[] = [
    'off', 'fairy', 'lofi_study_desktop', 'lofi_moons', 'lofi_study_rain'
  ];
  backgroundUrl = computed(() => {
    const bg = this.activeBackground();
    if (bg === 'fairy') return 'assets/images/fairy_world.webp';
    if (bg === 'lofi_study_desktop') return 'assets/images/lofi_study_desktop.webp';
    if (bg === 'lofi_moons') return 'assets/images/lofi_moons.webp';
    if (bg === 'lofi_study_rain') return 'assets/images/lofi_study_rain.webp';
    return '';
  });
  useFairyBackground = computed(() => this.activeBackground() !== 'off');

  // Opciones de sonido para evitar errores de tipado estricto en plantillas Angular
  soundOptions: ('zen' | 'digital' | 'chime')[] = ['zen', 'chime', 'digital'];
  themeOptions: ('samurai' | 'cyberpunk' | 'aurora' | 'zen')[] = ['samurai', 'cyberpunk', 'aurora', 'zen'];

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  showSettingsPanel = signal(false);
  showSetupSettings = signal(false);
  settingsActiveTab = signal<'time' | 'themes'>('time');
  showThemesPanel = signal(false);
  showStrategyCard = signal(false);
  showBossCard = signal(false);
  showCommunityConsole = signal(false);
  communityActiveTab = signal<'boss' | 'users' | 'strategy'>('strategy');
  showCelebration = signal<boolean>(false);
  celebrationPieces = signal<any[]>([]);

  // Inactividad y Modo Zen (Fondo Screensaver)
  isInactive = signal(false);
  private inactivityTimeout: any;
  private onActivityFn = () => this.onUserActivity();
  private onMouseLeaveFn = () => this.onMouseLeaveWindow();

  // Estilo del Temporizador (Clásico vs Fuego Premium)
  timerStyle = signal<'digital' | 'fire'>(
    (localStorage.getItem('focus-timer-style') as any) || 'digital'
  );

  // Porcentaje de tiempo restante
  timePercentage = computed(() => {
    const total = this.totalSessionTime();
    const left = this.timeLeft();
    if (total <= 0) return 0;
    return left / total;
  });

  // Escala del fuego basada en el tiempo restante (de 1.0 a 0.25)
  fireScale = computed(() => {
    const pct = this.timePercentage();
    if (pct <= 0) return 0;
    return 0.25 + pct * 0.75;
  });

  // Opacidad y parpadeo final del fuego
  fireOpacity = computed(() => {
    const pct = this.timePercentage();
    if (pct <= 0) return 0;
    if (pct < 0.05) {
      return (pct / 0.05) * 0.8;
    }
    return 1.0;
  });


  // Objetivo Activo (La batalla de hoy) e Integración Metodológica
  activeObjective = signal('');
  activeMethodology = signal<'sapo' | 'pareto' | 'normal'>('normal');

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

  // Datos del Co-worker asignado (Compatibilidad)
  partnerName = signal('');
  partnerAvatar = signal('');
  partnerStatus = signal<'focused' | 'left'>('focused');

  // Templo de Enfoque Comunitario
  comunidadUsers = signal<any[]>([]);
  comunidadViewStyle = signal<'cards' | 'desks' | 'floating'>('cards');
  comunidadViewOptions: ('cards' | 'desks' | 'floating')[] = ['cards', 'desks', 'floating'];
  comunidadEvents = signal<any[]>([]);
  userActiveReaction = signal<string>('');
  globalFocusedCount = signal<number>(74);
  communityInterval: any = null;
  comunidadPanelExpanded = signal<boolean>(false);

  private initialComunidadUsers = [
    { name: 'Ana', avatar: 'lobo', status: 'focused', mission: 'Refactorizando el dashboard en Angular', timeLeft: 1200, percentage: 40 },
    { name: 'Ramiro', avatar: 'zorro', status: 'focused', mission: 'Escribiendo post sobre procrastinación', timeLeft: 600, percentage: 80 },
    { name: 'Sofía', avatar: 'aguila', status: 'focused', mission: 'Diseñando pantallas en Figma', timeLeft: 1500, percentage: 20 },
    { name: 'Carlos', avatar: 'panda', status: 'break', mission: 'Pausa activa y estiramientos', timeLeft: 180, percentage: 40 },
    { name: 'Mateo', avatar: 'hamster', status: 'focused', mission: 'Optimizando consultas SQL pesadas', timeLeft: 900, percentage: 50 },
    { name: 'Valentina', avatar: 'buho', status: 'focused', mission: 'Preparando presentación de negocio', timeLeft: 300, percentage: 90 },
    { name: 'Lucas', avatar: 'rana', status: 'idle', mission: 'Planeando tareas de la semana', timeLeft: 0, percentage: 100 },
    { name: 'Clara', avatar: 'tortuga', status: 'focused', mission: 'Resolviendo bugs de renderizado CSS', timeLeft: 1350, percentage: 30 },
    { name: 'Esteban', avatar: 'abeja', status: 'focused', mission: 'Escribiendo pruebas unitarias con Vitest', timeLeft: 720, percentage: 60 },
    { name: 'Laura', avatar: 'castor', status: 'break', mission: 'Tomando café e hidratación', timeLeft: 240, percentage: 20 }
  ];

  private namesPool = ['Sofía', 'Alejandro', 'Valeria', 'Daniel', 'Mariana', 'Santiago', 'Camila', 'Mateo', 'Gabriela', 'Sebastián', 'Isabella', 'Nicolás', 'Lucía', 'Diego', 'Victoria', 'Felipe', 'Emma', 'Samuel', 'Elena', 'Tomás'];
  
  private missionsPool = [
    'Refactorizando componentes en Angular',
    'Escribiendo documentación técnica',
    'Optimizando base de datos PostgreSQL',
    'Estudiando algoritmos de búsqueda',
    'Diseñando wireframes en Figma',
    'Depurando fugas de memoria en JS',
    'Desarrollando API REST con Express',
    'Corrigiendo errores de linting',
    'Maquetando layouts con Flexbox',
    'Preparando presentación ejecutiva',
    'Investigando arquitectura limpia',
    'Configurando Webpack y Vite',
    'Escribiendo pruebas de integración',
    'Revisando Pull Requests en GitHub',
    'Analizando métricas de rendimiento',
    'Redactando post de blog técnico'
  ];

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
    '⚡ ¡Tú puedes con el cierre! Te espero en la comunidad.',
    '🧠 ¡No aflojes ahora! Ya casi lo tienes.',
    '🎯 ¡Último esfuerzo! Termina con broche de oro.',
    '👋 ¡Sigue enfocado! Nos vemos en el próximo bloque.'
  ];
  selectedPostSessionMessage = signal('⚡ ¡Tú puedes con el cierre! Te espero en la comunidad.');

  // Modal de Guía de Raid y Bestiario
  showRaidGuideModal = signal(false);
  activeRaidTab = signal<'guide' | 'bestiary' | 'stats'>('guide');

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
    this.initializeComunidadUsers();
    this.communityInterval = setInterval(() => {
      this.tickCommunity();
    }, 4000);

    const draft = localStorage.getItem('activeObjectiveDraft');
    if (draft) {
      this.activeObjective.set(draft);
      localStorage.removeItem('activeObjectiveDraft');
    }

    // Registración de escuchas de inactividad Zen
    document.addEventListener('mousemove', this.onActivityFn);
    document.addEventListener('mousedown', this.onActivityFn);
    document.addEventListener('keydown', this.onActivityFn);
    document.addEventListener('click', this.onActivityFn);
    document.addEventListener('touchstart', this.onActivityFn);
    document.addEventListener('mouseleave', this.onMouseLeaveFn);
    this.resetInactivityTimer();
  }

  // Iniciar Flujo: Lanza el Ritual 3-2-1
  startFocusFlow(bypassModal = false) {
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
          
          // Ocasionalmente alertar en el feed que estás en pausa
          const halfTime = this.membership.isPremium() ? 90 : 60;
          if (this.emergencyTimeLeft() === halfTime && this.coworkingMode() === 'comunitario') {
            this.addComunidadEvent('⚠️ Varios compañeros notaron tu pausa. ¡Reanuda pronto!', 'reaction');
          }
        } else {
          // Se acabó el tiempo de pausa -> Sesión Interrumpida automáticamente
          this.stopEmergencyTimer();
          this.sessionEndingStatus.set('interrupted');
          this.interruptedByPause.set(true);
          this.arenaState.set('summary');
          this.playTone(150, 'sawtooth', 0.15, 0.5);

          // Cura al jefe por agotarse la pausa en comunidad
          if (this.coworkingMode() === 'comunitario') {
            this.bossService.healBoss(this.userName() || 'Guerrero Anónimo');
            this.addComunidadEvent(`💔 ${this.userName() || 'Un Guerrero'} se distrajo por demasiado tiempo. ¡El Oni recupera fuerzas!`, 'reaction');
          }
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

    // Cura al jefe por abandono en comunidad
    if (this.coworkingMode() === 'comunitario') {
      this.bossService.healBoss(this.userName() || 'Guerrero Anónimo');
      this.addComunidadEvent(`💔 ${this.userName() || 'Un Guerrero'} ha abandonado la sesión de enfoque. ¡El Oni se fortalece!`, 'reaction');
    }
  }

  simulateCompletion() {
    this.timeLeft.set(0);
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.sessionEndingStatus.set('completed');
    this.arenaState.set('summary');
    this.playAlarmTone();
    this.triggerCelebration();
  }

  triggerCelebration() {
    const pieces: any[] = [];
    const colors = ['#ff5376', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ffeedd'];
    
    // Generar 100 pedacitos de confeti y serpentinas
    for (let i = 0; i < 100; i++) {
      const isStreamer = Math.random() > 0.6; // 40% serpentinas, 60% confeti
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = (Math.random() * 100).toFixed(2) + '%';
      const delay = (Math.random() * 2).toFixed(2) + 's';
      const duration = isStreamer 
        ? (Math.random() * 3 + 4).toFixed(2) + 's' 
        : (Math.random() * 2.5 + 2.5).toFixed(2) + 's';
      
      const width = isStreamer ? '4px' : (Math.random() * 6 + 6) + 'px';
      const height = isStreamer ? (Math.random() * 15 + 20) + 'px' : (Math.random() * 6 + 6) + 'px';
      const animName = isStreamer ? 'fallStreamer' : 'fallConfetti';
      
      pieces.push({
        left,
        color,
        class: isStreamer ? 'streamer-piece' : 'confetti-piece',
        animation: `${animName} ${duration} ${delay} linear 1 forwards`,
        transform: `rotate(${Math.random() * 360}deg)`,
        width,
        height
      });
    }
    
    this.celebrationPieces.set(pieces);
    this.showCelebration.set(true);
    
    // Ocultar después de 8 segundos
    setTimeout(() => {
      this.showCelebration.set(false);
      this.celebrationPieces.set([]);
    }, 8000);
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
        const isShared = this.coworkingMode() === 'comunitario';
        const sessionId = `session-${Date.now()}`;
        this.membership.rewardCompletedSession(sessionId, isShared);
        
        // Daño adicional al Boss por completar el Pomodoro en la Comunidad
        if (isShared) {
          const isCritical = this.activeMethodology() === 'sapo';
          const damage = isCritical ? 300 : 100;
          this.bossService.dealDamage(damage, isCritical);
          
          const eventText = isCritical 
            ? `🔥 ¡CRÍTICO! ${this.userName()} completó su Sapo e infligió ${damage} de daño al Boss.`
            : `🗡️ ${this.userName()} completó su Pomodoro e infligió ${damage} de daño al Boss.`;
          this.addComunidadEvent(eventText, 'complete');
        }
        
        // Recompensa adicional por objetivo cumplido (Pregunta 2)
        const objCompleted = this.objectiveCompleted();
        if (objCompleted === 'yes' || objCompleted === 'progress') {
          const objectiveId = `obj-${Date.now()}`;
          this.membership.rewardCompletedObjective(objectiveId);
        }

        // Seguir el progreso del reto / cualidades para desbloquear avatares
        this.membership.trackChallengeProgress(
          this.activeMethodology(),
          isShared,
          objCompleted === 'yes',
          this.activeObjective()
        );

        // Si estamos en comunidad, mostramos la modal post-sesión para dejar un mensaje de motivación en el muro
        if (this.coworkingMode() === 'comunitario' && !this.showPostSessionSupportModal()) {
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
    this.router.navigate(['/enfoque']);
  }

  confirmPostSessionMessageAndExit() {
    this.showPostSessionSupportModal.set(false);
    
    // Guardamos en localStorage el mensaje enviado para simular persistencia
    const msg = this.selectedPostSessionMessage();
    localStorage.setItem('last-sent-post-session-message', msg);
    
    this.objectiveCompleted.set(null);
    this.arenaState.set('setup');
    this.router.navigate(['/enfoque']);
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
    this.bossService.updateBossTheme('siren');
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
    if (this.communityInterval) clearInterval(this.communityInterval);

    // Limpieza de escuchas de inactividad Zen
    document.removeEventListener('mousemove', this.onActivityFn);
    document.removeEventListener('mousedown', this.onActivityFn);
    document.removeEventListener('keydown', this.onActivityFn);
    document.removeEventListener('click', this.onActivityFn);
    document.removeEventListener('touchstart', this.onActivityFn);
    document.removeEventListener('mouseleave', this.onMouseLeaveFn);
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
  }

  onUserActivity() {
    if (this.isInactive()) {
      this.isInactive.set(false);
    }
    this.resetInactivityTimer();
  }

  onMouseLeaveWindow() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    this.inactivityTimeout = setTimeout(() => {
      if (this.arenaState() !== 'summary') {
        this.isInactive.set(true);
      }
    }, 3000); // 3 segundos tras salir de la ventana se activa el modo Zen
  }

  private resetInactivityTimer() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    this.inactivityTimeout = setTimeout(() => {
      if (this.arenaState() !== 'summary') {
        this.isInactive.set(true);
      }
    }, 8000); // 8 segundos de inactividad física
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

  // Setter de fondo de pantalla Zen
  setBackground(bg: 'off' | 'fairy' | 'lofi_study_desktop' | 'lofi_moons' | 'lofi_study_rain') {
    this.activeBackground.set(bg);
    localStorage.setItem('focus-active-bg', bg);
  }

  // Setter del estilo de cronómetro Zen (con verificación Premium)
  setTimerStyle(style: 'digital' | 'fire') {
    if (style === 'fire' && !this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }
    this.timerStyle.set(style);
    localStorage.setItem('focus-timer-style', style);
  }

  private startTimerLoop() {
    this.timerRunning.set(true);
    if (this.backgroundSound() !== 'off') {
      this.updateBackgroundSound(this.backgroundSound());
    }
    this.pomodoroTimer = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(t => t - 1);

        // Simulación en tiempo real del Templo Comunitario y daño del Jefe
        if (this.coworkingMode() === 'comunitario') {
          this.partnerSessionTicks.update(ticks => ticks + 1);
          if (!this.isBreak() && this.bossService.activeBoss().status === 'active') {
            // El usuario inflige 1 de daño continuo por segundo
            this.bossService.activeBoss.update(boss => {
              if (boss.status === 'defeated') return boss;
              const nextHp = Math.max(0, boss.currentHp - 1);
              if (nextHp === 0) {
                setTimeout(() => {
                  this.bossService.addLog(`🏆 ¡VICTORIA! Has asestado el golpe final a ${boss.name}.`);
                  this.membership.proCoins.update(c => c + 150);
                }, 0);
                return { ...boss, currentHp: 0, status: 'defeated' };
              }
              return { ...boss, currentHp: nextHp };
            });
          }
        }
      } else {
        // Al terminar con éxito
        this.stopTimerLoop();
        if (!this.isBreak()) {
          // Cambiar a descanso y lanzar cuestionario como completado
          this.sessionEndingStatus.set('completed');
          this.arenaState.set('summary');
          this.playAlarmTone();
          this.triggerCelebration();
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

  setFocusMode(mode: 'solo' | 'comunitario') {
    if (mode === 'solo') {
      this.coworkingMode.set('solo');
      this.communityActiveTab.set('strategy');
      this.showToast('👤 Has vuelto a enfocarte en solitario.', 'info');
      return;
    }

    if (!this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }

    this.coworkingMode.set('comunitario');
    this.communityActiveTab.set('boss');
    this.showToast('👥 Te has unido al Templo de Enfoque Comunitario.', 'info');
  }

  initializeComunidadUsers() {
    const seeded = this.initialComunidadUsers.map((u, index) => ({
      ...u,
      x: Math.floor(Math.random() * 75) + 10,
      y: Math.floor(Math.random() * 65) + 15,
      desk: index + 1,
      reaction: ''
    }));
    this.comunidadUsers.set(seeded);
    // Generar un par de eventos iniciales
    this.addComunidadEvent('⚔️ El Comunidad de Concentración está activo.', 'join');
    this.addComunidadEvent('👥 Hay 10 guerreros trabajando en la sala.', 'join');
  }

  addComunidadEvent(text: string, type: 'join' | 'complete' | 'break' | 'reaction') {
    const current = this.comunidadEvents();
    const newEvent = { id: Date.now() + Math.random(), text, type };
    this.comunidadEvents.set([newEvent, ...current].slice(0, 8));
  }

  formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  getRandomMission(): string {
    return this.missionsPool[Math.floor(Math.random() * this.missionsPool.length)];
  }

  simulateUserJoining() {
    const currentNames = this.comunidadUsers().map(u => u.name);
    const availableNames = this.namesPool.filter(n => !currentNames.includes(n));
    if (availableNames.length === 0) return;
    
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    const avatars = ['lobo', 'zorro', 'buho', 'panda', 'tortuga', 'abeja', 'castor', 'hamster', 'rana', 'sloth'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    const mission = this.getRandomMission();
    
    const takenDesks = this.comunidadUsers().map(u => u.desk);
    let desk = 1;
    for (let i = 1; i <= 12; i++) {
      if (!takenDesks.includes(i)) {
        desk = i;
        break;
      }
    }

    const newUser = {
      name,
      avatar,
      status: 'focused' as const,
      mission,
      timeLeft: 1500,
      percentage: 0,
      x: Math.floor(Math.random() * 75) + 10,
      y: Math.floor(Math.random() * 65) + 15,
      desk,
      reaction: ''
    };

    this.comunidadUsers.update(users => [...users, newUser]);
    this.addComunidadEvent(`👥 ${name} se unió al Templo de Enfoque.`, 'join');
  }

  simulateUserLeaving() {
    const users = this.comunidadUsers();
    if (users.length <= 4) return;
    const candidates = users.filter(u => u.status === 'idle' || u.status === 'break');
    const target = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : users[Math.floor(Math.random() * users.length)];
      
    this.comunidadUsers.update(list => list.filter(u => u.name !== target.name));
    this.addComunidadEvent(`👋 ${target.name} salió del Templo.`, 'break');
  }

  simulateIncomingReaction() {
    const activeUsers = this.comunidadUsers().filter(u => u.status === 'focused');
    if (activeUsers.length === 0) return;
    
    const sender = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    const emojis = ['💪', '🔥', '👏', '🧠'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    this.userActiveReaction.set(emoji);
    this.addComunidadEvent(`¡${sender.name} te envió energía! ${emoji}`, 'reaction');
    
    if (this.arenaState() !== 'active') {
      this.showToast(`¡${sender.name} te envió apoyo! ${emoji}`, 'info');
    }
    
    setTimeout(() => {
      if (this.userActiveReaction() === emoji) {
        this.userActiveReaction.set('');
      }
    }, 3000);
  }

  sendSupportToUser(userName: string, emoji: string) {
    this.addComunidadEvent(`Le enviaste ${emoji} a ${userName}`, 'reaction');
    
    const updated = this.comunidadUsers().map(u => {
      if (u.name === userName) {
        return { ...u, reaction: emoji };
      }
      return u;
    });
    this.comunidadUsers.set(updated);
    
    setTimeout(() => {
      const reset = this.comunidadUsers().map(u => {
        if (u.name === userName && u.reaction === emoji) {
          return { ...u, reaction: '' };
        }
        return u;
      });
      this.comunidadUsers.set(reset);
    }, 3000);

    setTimeout(() => {
      const user = this.comunidadUsers().find(u => u.name === userName);
      if (user) {
        const replyEmoji = '💖';
        const updatedWithReply = this.comunidadUsers().map(u => {
          if (u.name === userName) {
            return { ...u, reaction: replyEmoji };
          }
          return u;
        });
        this.comunidadUsers.set(updatedWithReply);
        
        this.addComunidadEvent(`¡${userName} te agradece el apoyo! 💖`, 'reaction');

        setTimeout(() => {
          const finalReset = this.comunidadUsers().map(u => {
            if (u.name === userName && u.reaction === replyEmoji) {
              return { ...u, reaction: '' };
            }
            return u;
          });
          this.comunidadUsers.set(finalReset);
        }, 3000);
      }
    }, 2000);
  }

  tickCommunity() {
    // Daño continuo del resto de usuarios en el Comunidad al Boss
    if (this.coworkingMode() === 'comunitario' && this.arenaState() === 'active' && !this.isBreak()) {
      const activePartners = this.comunidadUsers().filter(u => u.status === 'focused');
      const activePartnersCount = activePartners.length;
      // Cada compañero inflige 4 de daño (1 por segundo durante 4 segundos)
      this.bossService.tickContinuousDamage(activePartnersCount * 4);

      // Simular eventos de combate detallados con iconos específicos (incluyendo poder premium)
      if (activePartnersCount > 0 && Math.random() < 0.65) {
        const luckyPartner = activePartners[Math.floor(Math.random() * activePartnersCount)];
        const suffix = ['bah11', 'dev23', 'boss99', 'pro', 'ninja', 'app', '77', '12', 'focus', 'zen'][Math.floor(Math.random() * 10)];
        const username = luckyPartner.name.toLowerCase() + '.' + suffix;
        
        const eventRand = Math.random();
        if (eventRand < 0.35) {
          // 1.- atacó al jefe con puntos (Espada)
          const damagePoints = Math.floor(Math.random() * 80) + 15; // 15 a 95 DMG
          this.bossService.addLog(`⚔️ ${username} atacó al jefe con ${damagePoints} puntos`);
        } else if (eventRand < 0.5) {
          // 4.- Poder Premium (Rayo) - Atacó severamente
          const damagePoints = Math.floor(Math.random() * 200) + 200; // 200 a 400 DMG (daño severo)
          this.bossService.addLog(`⚡ ${username} atacó severamente con ${damagePoints} puntos`);
        } else if (eventRand < 0.75) {
          // 2.- abandonó, jefe gana +puntos puntos (Gota)
          const healPoints = Math.floor(Math.random() * 120) + 80;
          this.bossService.addLog(`🩸 ${username} abandonó, jefe gana +${healPoints} puntos`);
        } else {
          // 3.- interrumpe, jefe gana +puntos puntos (Advertencia)
          const healPoints = Math.floor(Math.random() * 60) + 40;
          this.bossService.addLog(`⚠️ ${username} interrumpe, jefe gana +${healPoints} puntos`);
        }
      }
    }

    const updatedUsers = this.comunidadUsers().map(u => {
      if (u.status === 'focused') {
        const newTime = Math.max(0, u.timeLeft - 4);
        const total = 1500;
        const pct = Math.floor((1 - (newTime / total)) * 100);
        
        if (newTime === 0) {
          setTimeout(() => {
            this.addComunidadEvent(`🎉 ¡${u.name} completó su pomodoro de enfoque!`, 'complete');
            this.globalFocusedCount.update(c => Math.max(10, c - 1));
          }, 0);
          return {
            ...u,
            status: 'break' as const,
            timeLeft: 300,
            percentage: 0
          };
        }
        return {
          ...u,
          timeLeft: newTime,
          percentage: pct
        };
      } else if (u.status === 'break') {
        const newTime = Math.max(0, u.timeLeft - 4);
        const total = 300;
        const pct = Math.floor((1 - (newTime / total)) * 100);
        
        if (newTime === 0) {
          setTimeout(() => {
            this.addComunidadEvent(`☕ ¡${u.name} terminó su descanso y está listo para enfocar!`, 'join');
          }, 0);
          return {
            ...u,
            status: 'focused' as const,
            timeLeft: 1500,
            percentage: 0,
            mission: this.getRandomMission()
          };
        }
        return {
          ...u,
          timeLeft: newTime,
          percentage: pct
        };
      }
      return u;
    });

    this.comunidadUsers.set(updatedUsers);

    const idleCount = this.comunidadUsers().filter(u => u.status === 'idle').length;
    if (idleCount > 0 && Math.random() < 0.2) {
      const idles = this.comunidadUsers().filter(u => u.status === 'idle');
      const lucky = idles[Math.floor(Math.random() * idles.length)];
      const updated = this.comunidadUsers().map(u => {
        if (u.name === lucky.name) {
          const mission = this.getRandomMission();
          setTimeout(() => {
            this.addComunidadEvent(`⚔️ ${u.name} inició su misión: "${mission}"`, 'join');
          }, 0);
          return {
            ...u,
            status: 'focused' as const,
            timeLeft: 1500,
            percentage: 0,
            mission
          };
        }
        return u;
      });
      this.comunidadUsers.set(updated);
    }

    if (Math.random() < 0.4) {
      const change = Math.random() < 0.5 ? 1 : -1;
      this.globalFocusedCount.update(c => Math.max(10, Math.min(150, c + change)));
    }

    if (this.comunidadUsers().length < 12 && Math.random() < 0.15) {
      this.simulateUserJoining();
    }

    if (this.comunidadUsers().length > 6 && Math.random() < 0.08) {
      this.simulateUserLeaving();
    }

    if (this.arenaState() === 'active' && this.coworkingMode() === 'comunitario' && Math.random() < 0.1) {
      this.simulateIncomingReaction();
    }
  }

  showToast(msg: string, type: 'info' | 'warning' | 'success' | 'danger') {
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

  triggerDemoAttack(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const names = ['ramiro', 'sofia', 'carlos', 'mateo', 'lucas', 'ana', 'jose', 'elena', 'diego', 'julia'];
    const suffixes = ['bah11', 'dev23', 'boss99', 'pro', 'ninja', 'app', '77', '12', 'focus', 'zen'];
    const name = names[Math.floor(Math.random() * names.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const username = `${name}.${suffix}`;
    
    const eventRand = Math.random();
    if (eventRand < 0.35) {
      // 1.- atacó al jefe con puntos (Espada)
      const damagePoints = Math.floor(Math.random() * 80) + 15; // De 15 a 95 DMG
      this.bossService.activeBoss.update(boss => {
        const nextHp = Math.max(0, boss.currentHp - damagePoints);
        return { ...boss, currentHp: nextHp, status: nextHp === 0 ? 'defeated' : 'active' };
      });
      this.bossService.addLog(`⚔️ ${username} atacó al jefe con ${damagePoints} puntos`);
    } else if (eventRand < 0.5) {
      // 4.- Premium Power Attack (Rayo)
      const damagePoints = Math.floor(Math.random() * 200) + 200; // De 200 a 400 DMG
      this.bossService.activeBoss.update(boss => {
        const nextHp = Math.max(0, boss.currentHp - damagePoints);
        return { ...boss, currentHp: nextHp, status: nextHp === 0 ? 'defeated' : 'active' };
      });
      this.bossService.addLog(`⚡ ${username} atacó severamente con ${damagePoints} puntos`);
    } else if (eventRand < 0.75) {
      // 2.- abandonó, jefe gana +puntos puntos (Gota)
      const healPoints = Math.floor(Math.random() * 120) + 80;
      this.bossService.activeBoss.update(boss => {
        const nextHp = Math.min(boss.maxHp, boss.currentHp + healPoints);
        return { ...boss, currentHp: nextHp };
      });
      this.bossService.addLog(`🩸 ${username} abandonó, jefe gana +${healPoints} puntos`);
    } else {
      // 3.- interrumpe, jefe gana +puntos puntos (Advertencia)
      const healPoints = Math.floor(Math.random() * 60) + 40;
      this.bossService.activeBoss.update(boss => {
        const nextHp = Math.min(boss.maxHp, boss.currentHp + healPoints);
        return { ...boss, currentHp: nextHp };
      });
      this.bossService.addLog(`⚠️ ${username} interrumpe, jefe gana +${healPoints} puntos`);
    }
  }

  getPartnerSupportMessage() {
    return '⚡ ¡Fuerza en este bloque! A darle con todo.';
  }
}
