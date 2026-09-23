import { Component, signal, computed, OnInit, OnDestroy, WritableSignal, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { SupabaseService, FocusSessionData } from '../../services/supabase.service';
import { Navbar } from '../../components/navbar/navbar';
import { BACKGROUND_SOUNDS, END_SESSION_SOUNDS, BackgroundSoundOption, EndSessionSoundOption } from './sounds.data';

export interface MotivationItem {
  id: string;
  userName: string;
  avatar: string;
  text: string;
  category: 'metas' | 'familia' | 'disciplina' | 'crecimiento' | 'pasion';
  timestamp: string;
  createdAt?: number;
  likes: number;
  isUser?: boolean;
  likedByMe?: boolean;
}

export type BackgroundSoundType = string;

export type FocusBackgroundType = 
  | 'off' 
  | 'lofi_cat_window'
  | 'lofi_cat_rain'
  | 'lofi_cat_sun'
  | 'lofi_car_ride'
  | 'theme_autumn'
  | 'theme_sunset'
  | 'theme_aninditaerina_lofi'
  | 'fairy' 
  | 'lofi_study_desktop' 
  | 'lofi_moons' 
  | 'theme_airplane'
  | 'theme_tunezoro'
  | 'theme_tunezoro2'
  | 'theme_tunezoro_anime'
  | 'lofi_space_cosmos' 
  | 'lofi_space_nebula' 
  | 'lofi_space_moon' 
  | 'lofi_titanic_ocean' 
  | 'lofi_lighthouse_ocean';

export type FocusTimerStyle = 
  | 'digital' 
  | 'fire' 
  | 'hourglass' 
  | 'ice' 
  | 'battery' 
  | 'ring' 
  | 'line' 
  | 'solar' 
  | 'satellite' 
  | 'moon' 
  | 'titanic' 
  | 'lighthouse' 
  | 'airplane';

@Component({
  selector: 'app-enfoque',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, Navbar],
  templateUrl: './enfoque.html',
  styleUrl: './enfoque.css',
  host: {
    '[class.zen-inactive]': 'isInactive()',
    '[class.timer-titanic-mode]': 'timerStyle() === "titanic"',
    '[class.timer-lighthouse-mode]': 'timerStyle() === "lighthouse"',
    '[class.timer-airplane-mode]': 'timerStyle() === "airplane"'
  }
})
export class Enfoque implements OnInit, OnDestroy {
  public supabaseService = inject(SupabaseService);
  currentSessionNonceId: string | null = null;
  isSettlingSession = signal<boolean>(false);

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

    // Garantizar que todo usuario que entre vea por defecto "Otoño Lofi" (theme_autumn)
    const savedBg = localStorage.getItem('focus-active-bg') as FocusBackgroundType;
    if (!savedBg || savedBg === 'lofi_space_cosmos' || savedBg === 'lofi_cat_window' || !this.backgroundOptions.includes(savedBg)) {
      this.activeBackground.set('theme_autumn');
      localStorage.setItem('focus-active-bg', 'theme_autumn');
    }

    // Configuración por defecto de 25 min de pomodoro y 5 min de descanso
    const savedDuration = localStorage.getItem('focus-duration');
    if (!savedDuration || savedDuration === '1') {
      this.focusDuration.set(25);
      this.totalSessionTime.set(25 * 60);
      this.timeLeft.set(25 * 60);
      localStorage.setItem('focus-duration', '25');
    }
    const savedBreak = localStorage.getItem('break-duration');
    if (!savedBreak || savedBreak === '1') {
      this.breakDuration.set(5);
      localStorage.setItem('break-duration', '5');
    }
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

  // Draggable campfire state
  campfireX = signal<number>(0);
  campfireY = signal<number>(0);
  isDraggingCampfire = signal<boolean>(false);
  showCampfireDragTooltip = signal<boolean>(false);
  private dragStartX = 0;
  private dragStartY = 0;

  // toast notifications
  showPartnerNotification = signal<boolean>(false);
  partnerNotificationMessage = signal<string>('');
  partnerNotificationType = signal<'info' | 'warning' | 'success' | 'danger'>('info');

  // Escudo acústico / Ruido de fondo en vivo (Concentración)
  backgroundSound = signal<string>(
    localStorage.getItem('focus-bg-sound') || 'off'
  );

  // Sonido de fondo para el Descanso
  breakBackgroundSound = signal<string>(
    localStorage.getItem('focus-break-bg-sound') || 'off'
  );

  backgroundVolume = signal<number>(
    parseFloat(localStorage.getItem('focus-bg-volume') || '1.0')
  );
  isPlayingPreview = signal<boolean>(false);
  private previewSoundTimeout: any = null;

  // Catálogos de sonido
  backgroundSoundsList: BackgroundSoundOption[] = BACKGROUND_SOUNDS;
  endSessionSoundsList: EndSessionSoundOption[] = END_SESSION_SOUNDS;
  
  // Agrupaciones ordenadas para el selector desplegable
  soundGroups = [
    {
      name: 'Naturaleza & Clima',
      icon: 'fa-tree',
      sounds: BACKGROUND_SOUNDS.filter(s => s.category === 'natural')
    },
    {
      name: 'Cafeterías & Espacios Urbanos',
      icon: 'fa-mug-hot',
      sounds: BACKGROUND_SOUNDS.filter(s => s.category === 'urbano')
    },
    {
      name: 'Relojes & Tic-Tac Rítmico',
      icon: 'fa-clock',
      sounds: BACKGROUND_SOUNDS.filter(s => s.category === 'reloj')
    },
    {
      name: 'Sintéticos Zen & ASMR',
      icon: 'fa-sparkles',
      sounds: BACKGROUND_SOUNDS.filter(s => s.category === 'sintetico' && s.id !== 'off')
    }
  ];

  soundSectionView = signal<'background' | 'alarm'>('background');
  soundSearchQuery = signal<string>('');
  breakSoundSearchQuery = signal<string>('');
  longBreakSoundSearchQuery = signal<string>('');
  alarmSearchQuery = signal<string>('');
  backgroundCategoryFilter = signal<'all' | 'natural' | 'urbano' | 'reloj' | 'sintetico'>('all');
  breakBackgroundCategoryFilter = signal<'all' | 'natural' | 'urbano' | 'reloj' | 'sintetico'>('all');
  longBreakBackgroundCategoryFilter = signal<'all' | 'natural' | 'urbano' | 'reloj' | 'sintetico'>('all');

  filteredBackgroundSounds = computed(() => {
    const cat = this.backgroundCategoryFilter();
    const query = this.soundSearchQuery().toLowerCase().trim();
    let list = this.backgroundSoundsList;
    if (cat !== 'all') {
      list = list.filter(s => s.category === cat || s.id === 'off');
    }
    if (query) {
      list = list.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
    }
    return list;
  });

  filteredBreakBackgroundSounds = computed(() => {
    const cat = this.breakBackgroundCategoryFilter();
    const query = this.breakSoundSearchQuery().toLowerCase().trim();
    let list = this.backgroundSoundsList;
    if (cat !== 'all') {
      list = list.filter(s => s.category === cat || s.id === 'off');
    }
    if (query) {
      list = list.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
    }
    return list;
  });

  filteredLongBreakBackgroundSounds = computed(() => {
    const cat = this.longBreakBackgroundCategoryFilter();
    const query = this.longBreakSoundSearchQuery().toLowerCase().trim();
    let list = this.backgroundSoundsList;
    if (cat !== 'all') {
      list = list.filter(s => s.category === cat || s.id === 'off');
    }
    if (query) {
      list = list.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
    }
    return list;
  });

  filteredEndSessionSounds = computed(() => {
    const query = this.alarmSearchQuery().toLowerCase().trim();
    if (!query) return this.endSessionSoundsList;
    return this.endSessionSoundsList.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
  });

  getSoundCategoryCount(cat: 'all' | 'natural' | 'urbano' | 'reloj' | 'sintetico'): number {
    if (cat === 'all') return this.backgroundSoundsList.length;
    return this.backgroundSoundsList.filter(s => s.category === cat).length;
  }

  // Alerta de Fin de Sesión Pomodoro
  endSessionSound = signal<string>(
    localStorage.getItem('focus-end-sound') || 'tone'
  );

  // Alerta de Fin de Descanso
  breakSoundEnabled = signal<boolean>(
    localStorage.getItem('focus-break-sound-enabled') !== 'false'
  );
  breakEndSound = signal<string>(
    localStorage.getItem('focus-break-sound') || 'electronic_chime'
  );

  // Sonido de fondo para Descanso Largo
  longBreakBackgroundSound = signal<string>(
    localStorage.getItem('focus-long-break-bg-sound') || 'off'
  );
  longBreakEndSound = signal<string>(
    localStorage.getItem('focus-long-break-sound') || 'electronic_chime'
  );

  // Custom Select Dropdown UI States
  isBgDropdownOpen = signal<boolean>(false);
  isBreakBgDropdownOpen = signal<boolean>(false);
  isLongBreakBgDropdownOpen = signal<boolean>(false);
  isFocusAlarmDropdownOpen = signal<boolean>(false);
  isBreakAlarmDropdownOpen = signal<boolean>(false);
  isLongBreakAlarmDropdownOpen = signal<boolean>(false);
  previewingSoundId = signal<string | null>(null);

  // Dropdown aliases for template compatibility
  isBgSoundDropdownOpen = this.isBgDropdownOpen;
  isBreakBgSoundDropdownOpen = this.isBreakBgDropdownOpen;
  isLongBreakBgSoundDropdownOpen = this.isLongBreakBgDropdownOpen;
  isAlarmDropdownOpen = this.isFocusAlarmDropdownOpen;

  selectedBgSoundObj = computed(() => {
    return this.backgroundSoundsList.find(s => s.id === this.backgroundSound()) || this.backgroundSoundsList[0];
  });

  selectedBreakBgSoundObj = computed(() => {
    return this.backgroundSoundsList.find(s => s.id === this.breakBackgroundSound()) || this.backgroundSoundsList[0];
  });

  selectedLongBreakBgSoundObj = computed(() => {
    return this.backgroundSoundsList.find(s => s.id === this.longBreakBackgroundSound()) || this.backgroundSoundsList[0];
  });

  selectedFocusAlarmObj = computed(() => {
    return this.endSessionSoundsList.find(s => s.id === this.endSessionSound()) || this.endSessionSoundsList[0];
  });
  selectedAlarmSoundObj = this.selectedFocusAlarmObj;

  selectedBreakAlarmObj = computed(() => {
    return this.endSessionSoundsList.find(s => s.id === this.breakEndSound()) || this.endSessionSoundsList[0];
  });

  selectedLongBreakAlarmObj = computed(() => {
    return this.endSessionSoundsList.find(s => s.id === this.longBreakEndSound()) || this.endSessionSoundsList[0];
  });

  // Audio refs
  private currentBackgroundAudio: HTMLAudioElement | null = null;
  private tickingInterval: any = null;
  private currentEndAudio: HTMLAudioElement | null = null;
  private backgroundAudioCtx: AudioContext | null = null;
  private backgroundSource: AudioBufferSourceNode | null = null;
  private backgroundGain: GainNode | null = null;

  // Estados de la Arena según la especificación:
  // 'setup' -> Configurando objetivo y ajustes.
  // 'countdown' -> Ritual 3-2-1 para cortocircuitar la indecisión.
  // 'active' -> Sesión de trabajo activa (pantalla oscura total libre de menús).
  // 'summary' -> Cierre dopamínico (Cuestionario post-sesión).
  arenaState = signal<'setup' | 'countdown' | 'active' | 'summary'>('setup');

  // ==================== SUITE ANTI-PROCRASTINACIÓN: BATERÍA, BODY DOUBLING Y DISTRACCIONES ====================
  energyLevel = signal<'low' | 'medium' | 'high'>('medium');
  showEnergyModal = signal<boolean>(false);
  showBatteryButtonInArena = signal<boolean>(localStorage.getItem('show-battery-button-in-arena') !== 'false');
  isFreeExitChallenge = signal<boolean>(false);
  bodyDoublingCount = signal<number>(142);
  private bodyDoublingInterval: any = null;

  toggleBatteryButtonInArena() {
    const nextVal = !this.showBatteryButtonInArena();
    this.showBatteryButtonInArena.set(nextVal);
    localStorage.setItem('show-battery-button-in-arena', String(nextVal));
  }

  distractionInput = signal<string>('');
  distractionsList = signal<{ id: string; text: string; time: string }[]>([]);
  showDistractionFeedback = signal<boolean>(false);

  setEnergyLevel(level: 'low' | 'medium' | 'high') {
    this.energyLevel.set(level);
    this.isFreeExitChallenge.set(false);
    if (this.arenaState() === 'setup' && !this.isBreak()) {
      let duration = 25;
      if (level === 'low') duration = 10;
      else if (level === 'high') duration = 45;
      this.focusDuration.set(duration);
      this.totalSessionTime.set(duration * 60);
      this.timeLeft.set(duration * 60);
    }
    if (this.motivationNotificationEnabled() && this.notificationsEnabled()) {
      const label = level === 'low' ? 'Baja Motivación (10 min)' : level === 'medium' ? 'Media / Estándar (25 min)' : 'Alta Motivación (45 min)';
      const msg = level === 'low' ? 'Modo de baja fricción activado. ¡Arrancamos paso a paso!' : level === 'medium' ? 'Ritmo clásico Pomodoro establecido. ¡A darlo todo!' : '¡Modo de alto rendimiento activado! Concentración total.';
      this.sendDesktopNotification(`🔋 Batería de Motivación: ${label}`, msg);
    }
  }

  startFreeExit5MinChallenge() {
    this.isFreeExitChallenge.set(true);
    this.focusDuration.set(5);
    this.totalSessionTime.set(5 * 60);
    this.timeLeft.set(5 * 60);
    this.startFocusFlow(true);
  }

  addDistraction() {
    const text = this.distractionInput().trim();
    if (!text) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const item = {
      id: 'dist-' + Date.now(),
      text,
      time: timeStr
    };
    this.distractionsList.update(list => [item, ...list]);
    this.distractionInput.set('');
    this.showDistractionFeedback.set(true);
    setTimeout(() => {
      this.showDistractionFeedback.set(false);
    }, 3500);
  }

  removeDistraction(id: string) {
    this.distractionsList.update(list => list.filter(d => d.id !== id));
  }

  recoveredLifeMinutes = computed(() => {
    return this.completedPomodoros() * 25;
  });

  recoveredLifeFormatted = computed(() => {
    const mins = this.recoveredLifeMinutes();
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  });

  // Configuración del Pomodoro (25 minutos por defecto)
  focusDuration = signal(parseInt(localStorage.getItem('focus-duration') || '25', 10));
  breakDuration = signal(parseInt(localStorage.getItem('break-duration') || '5', 10));
  shortBreakDuration = this.breakDuration; // Alias para compatibilidad de plantillas
  longBreakInterval = signal(parseInt(localStorage.getItem('long-break-interval') || '4', 10));
  longBreakDuration = signal(parseInt(localStorage.getItem('long-break-duration') || '15', 10));
  dailyAttempts = signal<{ status: 'completed' | 'abandoned' | 'interrupted', time: string }[]>(
    (() => {
      const saved = localStorage.getItem('daily-attempts');
      if (!saved) return [];
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Si es el array demo antiguo de 8 elementos con las horas 09:00, 10:30, limpiarlo
          if (parsed.length === 8 && parsed[0]?.time === '09:00' && parsed[1]?.time === '10:30') {
            localStorage.setItem('daily-attempts', '[]');
            return [];
          }
          return parsed;
        }
        return [];
      } catch {
        return [];
      }
    })()
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
  activeBackground = signal<FocusBackgroundType>(
    (() => {
      const saved = localStorage.getItem('focus-active-bg');
      if (saved === 'lofi_girl_sunset' || saved === 'lofi_boy_study' || saved === 'theme_animation_studio' || saved === 'lofi_study_rain' || saved === 'forest_campfire') return 'theme_autumn';
      return (saved as FocusBackgroundType) || 'theme_autumn';
    })()
  );

  activeVideoLayer = signal<'A' | 'B'>('A');
  private isCrossfading = false;
  @ViewChild('bgVideoA') bgVideoARef?: ElementRef<HTMLVideoElement>;
  @ViewChild('bgVideoB') bgVideoBRef?: ElementRef<HTMLVideoElement>;

  backgroundOptions: FocusBackgroundType[] = [
    'off', 'lofi_cat_window', 'lofi_cat_rain', 'lofi_cat_sun', 'lofi_car_ride', 'theme_autumn', 'theme_sunset', 'theme_aninditaerina_lofi', 'fairy', 'lofi_study_desktop', 'lofi_moons', 'theme_airplane', 'theme_tunezoro', 'theme_tunezoro2', 'theme_tunezoro_anime', 'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon', 'lofi_titanic_ocean', 'lofi_lighthouse_ocean'
  ];

  isVideoBackground = computed(() => {
    const bg = this.activeBackground();
    return bg === 'lofi_cat_window' || bg === 'lofi_cat_rain' || bg === 'lofi_cat_sun' || bg === 'lofi_car_ride';
  });

  backgroundVideoUrl = computed(() => {
    const bg = this.activeBackground();
    if (bg === 'lofi_cat_window') return 'assets/videos/gatito-ventana.mp4';
    if (bg === 'lofi_cat_rain') return 'assets/videos/gatito-lluvia.mp4';
    if (bg === 'lofi_cat_sun') return 'assets/videos/gatito-sol.mp4';
    if (bg === 'lofi_car_ride') return 'assets/videos/auto.mp4';
    return '';
  });

  backgroundUrl = computed(() => {
    const bg = this.activeBackground();
    if (bg === 'lofi_cat_window') return 'assets/themes/lofi_cat_window_thumb.webp';
    if (bg === 'lofi_cat_rain') return 'assets/themes/lofi_cat_rain_thumb.webp';
    if (bg === 'lofi_cat_sun') return 'assets/themes/lofi_cat_sun_thumb.webp';
    if (bg === 'lofi_car_ride') return 'assets/themes/lofi_car_ride_thumb.webp';
    if (bg === 'theme_autumn') return 'assets/themes/autumn.webp';
    if (bg === 'theme_sunset') return 'assets/themes/sunset.webp';
    if (bg === 'theme_aninditaerina_lofi') return 'assets/themes/aninditaerina-lofi.webp';
    if (bg === 'fairy') return 'assets/themes/fairy_world.webp';
    if (bg === 'lofi_study_desktop') return 'assets/themes/lofi_study_desktop.webp';
    if (bg === 'lofi_moons') return 'assets/themes/lofi_moons.webp';
    if (bg === 'theme_airplane') return 'assets/themes/airplane_optimized.jpg';
    if (bg === 'theme_tunezoro') return 'assets/themes/tunezoro_optimized.jpg';
    if (bg === 'theme_tunezoro2') return 'assets/themes/tunezoro2_optimized.jpg';
    if (bg === 'theme_tunezoro_anime') return 'assets/themes/tunezoro_anime_optimized.jpg';
    if (bg === 'lofi_space_cosmos') return 'assets/themes/lofi_space_cosmos.webp';
    if (bg === 'lofi_space_nebula') return 'assets/themes/lofi_space_nebula.webp';
    if (bg === 'lofi_space_moon') return 'assets/themes/lofi_space_moon.webp';
    if (bg === 'lofi_titanic_ocean') return 'assets/themes/lofi_titanic_ocean.webp';
    if (bg === 'lofi_lighthouse_ocean') return 'assets/themes/lofi_lighthouse_ocean.webp';
    return '';
  });
  useFairyBackground = computed(() => this.activeBackground() !== 'off');
  // Verificación si el cronómetro actual es un reloj orbital (Sol, Satélite, Luna)
  isOrbitalTimer = computed(() => {
    const s = this.timerStyle();
    return s === 'solar' || s === 'satellite' || s === 'moon';
  });

  // Lista de fondos disponibles según el estilo de reloj seleccionado
  availableBackgroundOptions = computed(() => {
    if (this.isOrbitalTimer()) {
      return ['lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon'] as FocusBackgroundType[];
    }
    if (this.timerStyle() === 'lighthouse') {
      return ['lofi_lighthouse_ocean'] as FocusBackgroundType[];
    }
    if (this.timerStyle() === 'titanic') {
      return ['lofi_titanic_ocean'] as FocusBackgroundType[];
    }
    // Para todos los demás relojes normales, incluir los videos Lofi HD, los temas de ilustración y fondos estándar
    return ['off', 'lofi_cat_window', 'lofi_cat_rain', 'lofi_cat_sun', 'lofi_car_ride', 'theme_autumn', 'theme_sunset', 'theme_aninditaerina_lofi', 'fairy', 'lofi_study_desktop', 'lofi_moons', 'theme_airplane', 'theme_tunezoro', 'theme_tunezoro2', 'theme_tunezoro_anime', 'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon'] as FocusBackgroundType[];
  });

  // Información de color y fondo de la cuenta regresiva según el tema visual activo (samurai, cyberpunk, aurora, zen)
  countdownThemeInfo = computed(() => {
    const theme = this.membership.selectedTheme();
    switch (theme) {
      case 'cyberpunk':
        return {
          bg: 'radial-gradient(circle at 50% 0%, #201026 0%, #0b0b14 80%)',
          accent: '#ff5376',
          glow: 'rgba(255, 83, 118, 0.55)',
          name: 'Cyberpunk'
        };
      case 'aurora':
        return {
          bg: 'radial-gradient(circle at 50% 0%, #141b35 0%, #0b0f19 80%)',
          accent: '#5e62f5',
          glow: 'rgba(94, 98, 245, 0.55)',
          name: 'Aurora'
        };
      case 'zen':
        return {
          bg: 'radial-gradient(circle at 50% 0%, #0f241a 0%, #0c0f0d 80%)',
          accent: '#5c8f75',
          glow: 'rgba(92, 143, 117, 0.55)',
          name: 'Zen'
        };
      case 'samurai':
      default:
        return {
          bg: 'radial-gradient(circle at 50% 0%, #0c1630 0%, #050811 80%)',
          accent: '#00f2fe',
          glow: 'rgba(0, 242, 254, 0.55)',
          name: 'Samurai'
        };
    }
  });

  // ==================== MOTOR DE ANIMACIÓN FLUIDA A 60 FPS ====================
  private animFrameId: any = null;
  highPrecisionProgress = signal<number>(0);
  continuousTimeMs = signal<number>(Date.now());

  // ==================== CINEMÁTICA Y FÍSICAS DE EL FARO EN EL ACANTILADO ====================
  lighthouseProgress = computed(() => {
    if (this.arenaState() === 'setup') return 0;
    if (this.timerRunning() && !this.emergencyPauseActive()) {
      return this.highPrecisionProgress();
    }
    return Math.min(1, Math.max(0, 1 - this.timePercentage()));
  });

  // Fase del día en el Faro: Noche marina profunda con haz rotatorio y firmamento estrellado
  lighthouseTimePhase = computed<'night'>(() => 'night');

  // Opacidad del haz de luz del faro (Se mantiene encendido al 100% guiando la travesía del buque)
  lighthouseBeamOpacity = computed(() => 1.0);

  // Amanecer desactivado (Ambiente nocturno permanente)
  lighthouseSunriseOpacity = computed(() => 0.0);

  // Salida del sol desactivada
  lighthouseSunTransform = computed(() => 'translate(0px, 0px)');

  // Desplazamiento continuo del Buque Balizador desde el confín derecho más lejano hasta el faro en el extremo izquierdo durante todo el Pomodoro
  lighthouseSailboatTransform = computed(() => {
    const p = this.lighthouseProgress();
    const startX = 960; // Extremo derecho del horizonte marítimo
    const endX = 75;    // Muelle de atraque en el Faro a la izquierda (llegada exacta a las 00:00)
    if (this.arenaState() === 'setup') return `translate(${startX}px, 248px) scale(0.95)`;
    const currentX = startX - (p * (startX - endX));
    const scale = 0.95 + (p * 0.30); // Proporción reducida estilizada: 0.95x en el horizonte hasta 1.25x al atracar
    return `translate(${currentX.toFixed(1)}px, 248px) scale(${scale.toFixed(3)})`;
  });

  // Luces de navegación y trabajo del buque encendidas durante toda la noche marítima
  lighthouseBoatLightsOpacity = computed(() => 1.0);

  // Gaviotas al amanecer desactivadas
  lighthouseSeagullsOpacity = computed(() => 0.0);

  // ==================== CINEMÁTICA Y FÍSICAS DEL AVIÓN EN ATERRIZAJE (RUNWAY APPROACH) ====================
  airplaneProgress = computed(() => {
    if (this.arenaState() === 'setup') return 0;
    if (this.timerRunning() && !this.emergencyPauseActive()) {
      return this.highPrecisionProgress();
    }
    return Math.min(1, Math.max(0, 1 - this.timePercentage()));
  });

  // Fase de vuelo del avión: 'cruise' | 'descent' | 'approach' | 'flare' | 'rollout'
  airplaneFlightPhase = computed<'cruise' | 'descent' | 'approach' | 'flare' | 'rollout'>(() => {
    const p = this.airplaneProgress();
    if (p < 0.30) return 'cruise';
    if (p < 0.65) return 'descent';
    if (p < 0.88) return 'approach';
    if (p < 0.94) return 'flare';
    return 'rollout';
  });

  // Altitud aeronáutica simulada (de FL380 a 0 FT)
  airplaneAltitudeText = computed(() => {
    const p = this.airplaneProgress();
    if (p < 0.30) {
      const alt = Math.round(38000 - (p / 0.30) * 8000);
      return `FL${Math.round(alt / 100)}`;
    }
    if (p < 0.88) {
      const norm = (p - 0.30) / 0.58;
      const alt = Math.round(30000 - (norm * 28500));
      return `${alt.toLocaleString()} FT`;
    }
    if (p < 0.94) {
      const norm = (p - 0.88) / 0.06;
      const alt = Math.round(1500 - (norm * 1450));
      return `${alt} FT`;
    }
    return '0 FT (GND)';
  });

  // Desplazamiento y ángulo de planeo del avión (Glide Slope continuo a lo largo de toda la pantalla con tamaño reducido estilizado)
  airplaneTransform = computed(() => {
    const p = this.airplaneProgress();
    const startX = 1860;
    const startY = 48;
    const groundY = 238.9; // Contacto exacto de los neumáticos (9.4 * 1.18 = 11.09px) al ras de la pista (y=250)

    if (this.arenaState() === 'setup') {
      return `translate(${startX}px, ${startY}px) rotate(-0.5deg) scale(0.70)`;
    }

    if (p < 0.30) {
      // Fase 1: Vuelo de crucero en altitud alta desde el extremo derecho
      const t = p / 0.30;
      const x = startX - (t * 400); // 1860 -> 1460
      const y = startY + (t * 22);   // 48 -> 70
      const pitch = -1.0;
      const scale = 0.70 + (t * 0.15); // 0.70x -> 0.85x
      return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${pitch.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    } else if (p < 0.88) {
      // Fase 2: Senda de planeo y descenso diagonal sobre las luces de aproximación ALS (Glide Slope 3°)
      const t = (p - 0.30) / 0.58;
      const x = 1460 - (t * 540); // 1460 -> 920
      const y = 70 + (t * 160);   // 70 -> 230
      const pitch = -3.5; // Pitch down en senda de planeo
      const scale = 0.85 + (t * 0.25); // 0.85x -> 1.10x
      return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${pitch.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    } else if (p < 0.94) {
      // Fase 3: Nivelación y Flare (Eleva el morro y toca pista con tren principal en x=800)
      const t = (p - 0.88) / 0.06;
      const x = 920 - (t * 120); // 920 -> 800
      const y = 230 + (t * 8.9); // 230 -> 238.9 (toma de contacto al ras de pista)
      const pitch = -3.5 + (t * 6.0); // -3.5° -> +2.5° (Flare de aterrizaje)
      const scale = 1.10 + (t * 0.08); // 1.10x -> 1.18x
      return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${pitch.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    } else {
      // Fase 4: Carrera de frenado a lo largo de toda la pista hacia la izquierda (Rollout y desaceleración)
      const t = (p - 0.94) / 0.06;
      const x = 800 - (t * 720); // 800 -> 80
      const y = groundY;
      const pitch = 2.5 - (t * 2.5); // +2.5° -> 0.0° (Apoya tren delantero al ras del suelo)
      const scale = 1.18;
      return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${pitch.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    }
  });

  // Despliegue del tren de aterrizaje (baja entre p=0.45 y p=0.60)
  airplaneGearDeployed = computed(() => {
    const p = this.airplaneProgress();
    if (p < 0.45) return 0.0;
    if (p >= 0.60) return 1.0;
    return (p - 0.45) / 0.15;
  });

  // Focos de aterrizaje frontales encendidos en aproximación final (p >= 0.38 y se apagan al frenar p >= 0.98 o summary)
  airplaneLandingLightsOpacity = computed(() => {
    if (this.arenaState() === 'summary') return 0.0;
    const p = this.airplaneProgress();
    if (p < 0.38) return 0.0;
    if (p >= 0.98) {
      const norm = (p - 0.98) / 0.02;
      return Math.max(0.0, 1.0 - norm);
    }
    if (p < 0.48) {
      return (p - 0.38) / 0.10;
    }
    return 1.0;
  });

  // Humo y chispas de toma de contacto en ruedas (Touchdown tire smoke puff entre p=0.93 y p=0.96)
  airplaneTouchdownSmoke = computed(() => {
    const p = this.airplaneProgress();
    return p >= 0.93 && p <= 0.97;
  });

  // Spoilers e inversores de empuje activos durante el frenado (p >= 0.94)
  airplaneReversesActive = computed(() => {
    const p = this.airplaneProgress();
    return p >= 0.94 && p < 0.99;
  });

  // Luces de la cabina y navegación del avión (se apagan suavemente al llegar a destino en summary o p >= 0.99)
  airplaneCabinLightsOpacity = computed(() => {
    if (this.arenaState() === 'summary') return 0.0;
    const p = this.airplaneProgress();
    if (p < 0.98) return 1.0;
    const norm = (p - 0.98) / 0.02;
    return Math.max(0.0, 1.0 - norm);
  });

  // ==================== CINEMÁTICA Y FÍSICAS DE HUNDIMIENTO DEL TRONCO GRUESO ====================
  // Secuencia de inmersión y pérdida de flotabilidad del tronco de madera (0% a 100%):
  // - Fase 1 (0% a 20%): Flotación de superficie, equilibrio hidrostático y absorción lenta de agua.
  // - Fase 2 (20% a 48%): El extremo más pesado se satura de agua y comienza a inclinarse (0° -> 20°).
  // - Fase 3 (48% a 75%): Pérdida progresiva de empuje de Arquímedes, ángulo pronunciado (20° -> 48°), emanación de burbujas.
  // - Fase 4 (75% a 88%): Hundimiento crítico vertical (48° -> 78°), la punta superior se sumerge bajo la superficie.
  // - Fase 5 (88% a 100%): Descenso perpendicular majestuoso hacia el lecho oceánico profundo (78° -> 86°).
  titanicProgress = computed(() => {
    if (this.arenaState() === 'setup') {
      return 0;
    }
    if (this.timerRunning() && !this.emergencyPauseActive()) {
      return this.highPrecisionProgress();
    }
    return Math.min(1, Math.max(0, 1 - this.timePercentage()));
  });

  // Transformación del Contenedor Maestro del Titanic (Avanza hacia el Iceberg al iniciar y se centra para el hundimiento):
  titanicMasterTransform = computed(() => {
    const now = this.continuousTimeMs();
    if (this.arenaState() === 'setup') {
      const bob = Math.sin(now / 1300) * 1.5;
      const pitch = Math.sin(now / 1700) * 0.8;
      // En setup, el buque navega a gran distancia a estribor con amplio mar abierto frente al iceberg
      return `translate(450px, ${(204 + bob).toFixed(2)}px) rotate(${pitch.toFixed(2)}deg)`;
    }
    const p = this.titanicProgress();

    // Vaivén y cabeceo oceánico suave (se amortigua gradualmente conforme se sumerge)
    const swellDampening = Math.max(0, 1 - (p * 1.2));
    const bob = Math.sin(now / 1300) * 1.5 * swellDampening;
    const pitch = Math.sin(now / 1700) * 0.8 * swellDampening;

    let posX = 202;
    let impactJolt = 0;
    if (p < 0.08) {
      // Fase de avance: el barco navega a toda máquina por el océano hacia el iceberg
      const norm = p / 0.08;
      const ease = norm * norm * (3 - 2 * norm);
      posX = 450 - (ease * 248); // 450px -> 202px
    } else if (p >= 0.08 && p < 0.105) {
      // Momento de colisión contra la mole de hielo (estremecimiento / sacudida estructural)
      const joltNorm = (p - 0.08) / 0.025;
      impactJolt = Math.sin(joltNorm * Math.PI * 4) * 0.75;
    }

    return `translate(${(posX + impactJolt).toFixed(2)}px, ${(204 + bob).toFixed(2)}px) rotate(${pitch.toFixed(2)}deg)`;
  });

  // Transformación y posición del Iceberg en el océano (permanece fijo en su sitio en todo momento)
  titanicIcebergTransform = computed(() => {
    const now = this.continuousTimeMs();
    const bob = Math.sin(now / 1900) * 0.7;
    // El iceberg se mantiene en su posición fija en el mar con suave vaivén oceánico
    return `translate(25px, ${(204 + bob).toFixed(2)}px)`;
  });

  // Opacidad del Iceberg (permanece visible en el horizonte oceánico)
  titanicIcebergOpacity = computed(() => {
    return 0.95;
  });

  // Detección del instante de colisión y choque con hielo
  titanicIsColliding = computed(() => {
    const p = this.titanicProgress();
    return p >= 0.075 && p <= 0.105;
  });

  // Estado de fractura de cubiertas superiores (se desgarran en el aire)
  titanicIsSplit = computed(() => {
    return this.titanicProgress() >= 0.46;
  });

  // Estado del doble fondo / quilla que permanece unida hasta que la popa queda parada a 90 grados
  titanicKeelLinked = computed(() => {
    const p = this.titanicProgress();
    return p >= 0.46 && p < 0.82;
  });

  // Tensión y deformación del doble fondo
  titanicKeelTension = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.46 || p >= 0.82) return 0;
    return Math.min(1.0, (p - 0.46) / 0.36);
  });

  // Posición espacial compartida de la bisagra de quilla (12px, 18px) mientras el barco está unido (p < 0.82)
  private getTitanicHingePos(p: number): { dx: number; dy: number } {
    if (p <= 0.08) return { dx: 0, dy: 0 };
    if (p < 0.22) {
      // Fase 1: Aniego inicial de los compartimentos estancos tras el impacto
      const norm = (p - 0.08) / 0.14;
      const ease = norm * norm;
      return { dx: 0, dy: ease * 2.0 };
    } else if (p < 0.46) {
      // Fase 2: Inclinación continua hacia adelante
      const norm = (p - 0.22) / 0.24;
      const ease = norm * norm * (3 - 2 * norm);
      return {
        dx: -ease * 5.0,
        dy: 2.0 + (ease * 10.0), // 2 -> 12px
      };
    } else if (p < 0.68) {
      // Fase 3: Tras el quiebre, la popa cae y se mantiene a nivel del mar
      const norm = (p - 0.46) / 0.22;
      if (norm < 0.40) {
        // Caída de la quilla de vuelta al nivel de flotación del mar
        const fallNorm = norm / 0.40;
        const fallEase = fallNorm * fallNorm;
        return {
          dx: -5.0 + (fallEase * 2.0), // -5 -> -3px
          dy: 12.0 - (fallEase * 8.5), // 12 -> 3.5px (a nivel del mar)
        };
      } else {
        // Se mantiene estable a nivel del mar flotando en superficie
        const subNorm = (norm - 0.40) / 0.60;
        return {
          dx: -3.0,
          dy: 3.5 + (subNorm * 1.5), // 3.5 -> 5.0px (a nivel del mar)
        };
      }
    } else {
      // Fase 4: Arrastre por la proa sumergida levantando la popa hasta los 90° (p -> 0.82)
      const norm = Math.min(1.0, (p - 0.68) / 0.14);
      const ease = norm * norm * (3 - 2 * norm);
      return {
        dx: -3.0 - (ease * 15.0), // -3 -> -18px
        dy: 5.0 + (ease * 45.0),  // 5 -> 50px
      };
    }
  }

  // Transformación cinemática de la Proa (Levanta la popa a 90°, SE DESPRENDE Y SE HUNDE PRIMERO AL FONDO)
  titanicFrontTransform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.82) {
      const { dx, dy } = this.getTitanicHingePos(p);
      let angle = 0;
      if (p < 0.22) {
        angle = 0;
      } else if (p < 0.46) {
        const norm = (p - 0.22) / 0.24;
        const ease = norm * norm * (3 - 2 * norm);
        angle = -ease * 28.0;
      } else if (p < 0.68) {
        // La proa cuelga hacia el fondo mientras la popa está a nivel del mar
        const norm = (p - 0.46) / 0.22;
        angle = -28.0 - (Math.pow(norm, 0.75) * 50.0); // -28° -> -78°
      } else {
        // Tira de la popa hasta alinearla a 90°
        const norm = (p - 0.68) / 0.14;
        const ease = norm * norm * (3 - 2 * norm);
        angle = -78.0 - (ease * 10.0); // -78° -> -88°
      }
      return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
    } else {
      // ¡DESPRENDIMIENTO A 90 GRADOS! La proa se desprende y SE HUNDE PRIMERO rápidamente al abismo
      const norm = (p - 0.82) / 0.18;
      const ease = Math.pow(norm, 1.2);
      const dx = -18.0 - (norm * 14.0); // -18 -> -32px
      const dy = 50.0 + (ease * 270.0); // 50 -> 320px (se hunde primero y más profundo)
      const angle = -88.0 - (norm * 2.0); // -88° -> -90°
      return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
    }
  });

  // Transformación cinemática de la Popa (Cae a nivel del mar, se levanta parada a 90°, SE DESPRENDE Y TRAS ESTA VA LA POPA)
  titanicRearTransform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.82) {
      const { dx, dy } = this.getTitanicHingePos(p);
      let angle = 0;
      if (p < 0.22) {
        angle = 0;
      } else if (p < 0.46) {
        const norm = (p - 0.22) / 0.24;
        const ease = norm * norm * (3 - 2 * norm);
        angle = -ease * 28.0;
      } else if (p < 0.68) {
        // Cae y se mantiene a nivel del mar
        const norm = (p - 0.46) / 0.22;
        if (norm < 0.40) {
          const fallNorm = norm / 0.40;
          const fallEase = fallNorm * fallNorm;
          angle = -28.0 + (fallEase * 26.0); // -28° -> -2°
        } else {
          const subNorm = (norm - 0.40) / 0.60;
          angle = -2.0 - (subNorm * 3.0); // -2° -> -5° (flotando a nivel del mar)
        }
      } else {
        // Arrastrada por la proa hasta quedar COMPLETAMENTE PARADA A 90 GRADOS
        const norm = (p - 0.68) / 0.14;
        const ease = norm * norm * (3 - 2 * norm);
        angle = -5.0 - (ease * 85.0); // -5° -> -90.0° (parada perpendicular a 90°)
      }
      return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
    } else {
      // ¡DESPRENDIMIENTO A 90 GRADOS! Tras hundirse la proa, desciende la popa vertical
      let dy: number;
      let dx: number;
      if (p < 0.86) {
        // Se mantiene un momento parada a 90° tras desprenderse la proa
        const subNorm = (p - 0.82) / 0.04;
        dx = -18.0;
        dy = 50.0 + (subNorm * 4.0); // 50 -> 54px
      } else {
        // Desciende verticalmente hacia el abismo siguiendo a la proa
        const norm = (p - 0.86) / 0.14;
        const ease = Math.pow(norm, 1.5);
        dx = -18.0 - (norm * 3.0); // -18 -> -21px
        dy = 54.0 + (ease * 226.0); // 54 -> 280px
      }
      const angle = -90.0; // Completamente parada a 90 grados
      return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
    }
  });

  // Transformación del punto de unión de quilla / doble fondo
  titanicHingeTransform = computed(() => {
    const p = this.titanicProgress();
    const { dx, dy } = this.getTitanicHingePos(p);
    return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
  });

  // Alias y compatibilidad
  titanicLogTransform = this.titanicFrontTransform;
  titanicBowTransform = this.titanicFrontTransform;
  titanicSternTransform = this.titanicRearTransform;

  // Opacidad de la proa (se hunde primero y desaparece en las profundidades)
  titanicFrontOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.82) return 1.0;
    if (p >= 0.94) return 0.0;
    const t = (p - 0.82) / 0.12;
    return Math.max(0.0, 1.0 - Math.pow(t, 1.4));
  });

  // Opacidad de la popa (va tras la proa y se sumerge después)
  titanicRearOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.88) return 1.0;
    if (p >= 1.0) return 0.0;
    const t = (p - 0.88) / 0.12;
    return Math.max(0.0, 1.0 - Math.pow(t, 1.4));
  });

  titanicLogOpacity = this.titanicFrontOpacity;
  titanicBowOpacity = this.titanicFrontOpacity;
  titanicSternOpacity = this.titanicRearOpacity;

  // Actividad de burbujas de aire cristalinas
  titanicBubblesOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.15) return 0.0;
    if (p < 0.25) return (p - 0.15) / 0.10 * 0.8;
    if (p > 0.95) return Math.max(0.0, 1.0 - (p - 0.95) / 0.05);
    return 1.0;
  });

  // Transición suave o inmediata
  titanicDisableTransition = computed(() => false);

  // Estado del sistema eléctrico y luces del Titanic
  titanicLightsState = computed<'on' | 'flicker' | 'off'>(() => {
    const p = this.titanicProgress();
    if (p < 0.38) return 'on';
    if (p < 0.46) return 'flicker'; // Parpadeo agónico conforme los generadores se anegan
    return 'off'; // Apagón total al producirse la fractura estructural en el aire
  });

  // Cinemática de caída y hundimiento inmediato al fondo marino de la Chimenea 1
  titanicFallenFunnel1Transform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.32) return 'translate(-53.85px, -3.00px) rotate(-10.53deg)';
    const norm = Math.min(1.0, (p - 0.32) / 0.16); // Se va al fondo rápidamente al desprenderse (0.32 -> 0.48)
    const ease = Math.pow(norm, 1.6);
    const x = -53.85 + (norm * 12.0);
    const y = -3.00 + (ease * 260.0); // Se hunde directo hasta el fondo del mar (y > 250px)
    const angle = -10.53 + (norm * 65.0);
    return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
  });
  titanicFunnel1Transform = this.titanicFallenFunnel1Transform;

  titanicFunnel1Opacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.42) return 1.0;
    if (p >= 0.49) return 0.0;
    return Math.max(0.0, 1.0 - Math.pow((p - 0.42) / 0.07, 1.3));
  });

  titanicFunnel1Fallen = computed(() => this.titanicProgress() >= 0.32);

  // Cinemática de caída y hundimiento inmediato al fondo marino de la Chimenea 2
  titanicFallenFunnel2Transform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.40) return 'translate(-34.93px, 5.65px) rotate(-23.63deg)';
    const norm = Math.min(1.0, (p - 0.40) / 0.16); // Se va al fondo rápidamente al desprenderse (0.40 -> 0.56)
    const ease = Math.pow(norm, 1.6);
    const x = -34.93 + (norm * 10.0);
    const y = 5.65 + (ease * 260.0); // Se precipita al fondo marino
    const angle = -23.63 + (norm * 55.0);
    return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
  });
  titanicFunnel2Transform = this.titanicFallenFunnel2Transform;

  titanicFunnel2Opacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.50) return 1.0;
    if (p >= 0.57) return 0.0;
    return Math.max(0.0, 1.0 - Math.pow((p - 0.50) / 0.07, 1.3));
  });

  titanicFunnel2Fallen = computed(() => this.titanicProgress() >= 0.40);

  // Cinemática de caída y hundimiento inmediato al fondo marino de la Chimenea 3 (quiebre estructural)
  titanicFallenFunnel3Transform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.46) return 'translate(-2.01px, -8.24px) rotate(-28.00deg)';
    const norm = Math.min(1.0, (p - 0.46) / 0.16); // Se va al fondo rápidamente al desprenderse (0.46 -> 0.62)
    const ease = Math.pow(norm, 1.6);
    const x = -2.01 - (norm * 10.0);
    const y = -8.24 + (ease * 270.0); // Cae a la fosa abisal
    const angle = -28.00 - (norm * 50.0);
    return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
  });
  titanicFunnel3Transform = this.titanicFallenFunnel3Transform;

  titanicFunnel3Opacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.56) return 1.0;
    if (p >= 0.63) return 0.0;
    return Math.max(0.0, 1.0 - Math.pow((p - 0.56) / 0.07, 1.3));
  });

  titanicFunnel3Fallen = computed(() => this.titanicProgress() >= 0.46);

  // Cinemática de caída y hundimiento inmediato al fondo marino de la Chimenea 4 (popa vertical)
  titanicFallenFunnel4Transform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.70) return 'translate(40.96px, -18.88px) rotate(-10.00deg)';
    const norm = Math.min(1.0, (p - 0.70) / 0.15); // Se va al fondo rápidamente al desprenderse (0.70 -> 0.85)
    const ease = Math.pow(norm, 1.6);
    const x = 40.96 - (norm * 12.0);
    const y = -18.88 + (ease * 280.0); // Se desploma verticalmente hasta el lecho
    const angle = -10.00 - (norm * 65.0);
    return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
  });
  titanicFunnel4Transform = this.titanicFallenFunnel4Transform;

  titanicFunnel4Opacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.80) return 1.0;
    if (p >= 0.86) return 0.0;
    return Math.max(0.0, 1.0 - Math.pow((p - 0.80) / 0.06, 1.3));
  });

  titanicFunnel4Fallen = computed(() => this.titanicProgress() >= 0.70);

  // Cinemática y caída del Mástil Trinquete y varillas de proa
  titanicForeMastTransform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.34) return 'rotate(0deg)';
    const norm = Math.min(1.0, (p - 0.34) / 0.06);
    const ease = norm * norm;
    const angle = ease * 36.0;
    const dy = ease * 12.0;
    return `translate(0px, ${dy.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;
  });

  titanicForeMastOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.37) return 1.0;
    if (p >= 0.40) return 0.0;
    return Math.max(0.0, 1.0 - (p - 0.37) / 0.03);
  });

  titanicBowJackstaffOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.28) return 1.0;
    if (p >= 0.32) return 0.0;
    return Math.max(0.0, 1.0 - (p - 0.28) / 0.04);
  });

  // Cinemática y desprendimiento del Mástil Mayor y varillas de popa
  titanicMainMastTransform = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.72) return 'rotate(0deg)';
    const norm = Math.min(1.0, (p - 0.72) / 0.06);
    const ease = norm * norm;
    const angle = -ease * 40.0;
    const dy = ease * 15.0;
    return `translate(0px, ${dy.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;
  });

  titanicMainMastOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.75) return 1.0;
    if (p >= 0.78) return 0.0;
    return Math.max(0.0, 1.0 - (p - 0.75) / 0.03);
  });

  titanicAftFlagstaffOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.78) return 1.0;
    if (p >= 0.82) return 0.0;
    return Math.max(0.0, 1.0 - (p - 0.78) / 0.04);
  });

  // Visibilidad del tendido de cable de antena Marconi principal
  titanicAntennaVisible = computed(() => {
    return this.titanicProgress() < 0.34;
  });

  // Botes salvavidas que son arriados / arrastrados por las olas
  titanicBowBoatsOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.30) return 1.0;
    if (p >= 0.35) return 0.0;
    return Math.max(0.0, 1.0 - (p - 0.30) / 0.05);
  });

  titanicRearBoatsOpacity = computed(() => {
    const p = this.titanicProgress();
    if (p < 0.55) return 1.0;
    if (p >= 0.62) return 0.0;
    return Math.max(0.0, 1.0 - (p - 0.55) / 0.07);
  });

  titanicMarconiOpacity = computed(() => 0.0);
  titanicFlare1Transform = computed(() => 'rotate(0deg)');
  titanicFlare2Transform = computed(() => 'rotate(0deg)');
  titanicShowFlares = computed(() => false);

  soundOptions: ('zen' | 'digital' | 'chime')[] = ['zen', 'chime', 'digital'];
  themeOptions: ('samurai' | 'cyberpunk' | 'aurora' | 'zen')[] = ['samurai', 'cyberpunk', 'aurora', 'zen'];

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  showSettingsPanel = signal(false);
  showSetupSettings = signal(false);
  settingsActiveTab = signal<'time' | 'notifications' | 'themes' | 'timerStyle'>('time');
  showThemesPanel = signal(false);
  showStrategyCard = signal(false);
  showBossCard = signal(false);
  showCommunityConsole = signal(false);
  communityActiveTab = signal<'boss' | 'users' | 'strategy' | 'motivation'>('strategy');
  showCelebration = signal<boolean>(false);
  celebrationPieces = signal<any[]>([]);

  // ==================== SISTEMA DE MOTIVACIÓN Y CHAT COLECTIVO ====================
  newMotivationText = signal<string>('');
  newMotivationCategory = signal<'metas' | 'familia' | 'disciplina' | 'crecimiento' | 'pasion'>('metas');
  motivationCategories: ('metas' | 'familia' | 'disciplina' | 'crecimiento' | 'pasion')[] = [
    'metas', 'familia', 'disciplina', 'crecimiento', 'pasion'
  ];
  motivationFilter = signal<'all' | 'mine' | 'popular' | 'metas' | 'familia' | 'disciplina' | 'crecimiento' | 'pasion'>('all');
  pinnedMantra = signal<string>(localStorage.getItem('focus-pinned-mantra') || '');
  motivationToast = signal<{ show: boolean; message: string; type: 'success' | 'info' | 'like' }>({
    show: false,
    message: '',
    type: 'success'
  });
  private toastTimeout: any = null;

  private initialMotivations: MotivationItem[] = [
    {
      id: 'mot-3',
      userName: 'Mateo',
      avatar: 'hamster',
      text: 'La paz mental de irme a dormir sabiendo que no pospuse lo importante por distracciones tontas.',
      category: 'disciplina',
      timestamp: 'Hoy, 10:02',
      createdAt: Date.now() - 1000 * 60 * 5,
      likes: 35,
      isUser: false,
      likedByMe: false
    },
    {
      id: 'mot-1',
      userName: 'Sofía',
      avatar: 'aguila',
      text: 'Demostrarme a mí misma que soy capaz de terminar proyectos difíciles sin rendirme a la mitad.',
      category: 'disciplina',
      timestamp: 'Hoy, 09:15',
      createdAt: Date.now() - 1000 * 60 * 25,
      likes: 42,
      isUser: false,
      likedByMe: false
    },
    {
      id: 'mot-2',
      userName: 'Ramiro',
      avatar: 'gato',
      text: 'Darle una mejor calidad de vida a mi familia y construir algo de lo que me sienta verdaderamente orgulloso.',
      category: 'familia',
      timestamp: 'Hoy, 08:40',
      createdAt: Date.now() - 1000 * 60 * 55,
      likes: 58,
      isUser: false,
      likedByMe: true
    },
    {
      id: 'mot-6',
      userName: 'Ana',
      avatar: 'lobo',
      text: 'La increíble sensación de victoria cuando marcas esa tarea que llevabas semanas postergando.',
      category: 'pasion',
      timestamp: 'Ayer',
      createdAt: Date.now() - 1000 * 60 * 60 * 18,
      likes: 61,
      isUser: false,
      likedByMe: true
    },
    {
      id: 'mot-5',
      userName: 'Carlos',
      avatar: 'panda',
      text: 'Cada bloque de enfoque de 25 minutos me acerca un paso más a lanzar mi propia aplicación.',
      category: 'metas',
      timestamp: 'Ayer',
      createdAt: Date.now() - 1000 * 60 * 60 * 22,
      likes: 48,
      isUser: false,
      likedByMe: false
    },
    {
      id: 'mot-4',
      userName: 'Valentina',
      avatar: 'buho',
      text: 'Aprender algo nuevo cada día y convertirme en una experta en lo que me apasiona.',
      category: 'crecimiento',
      timestamp: 'Ayer',
      createdAt: Date.now() - 1000 * 60 * 60 * 26,
      likes: 29,
      isUser: false,
      likedByMe: false
    },
    {
      id: 'mot-8',
      userName: 'Clara',
      avatar: 'tortuga',
      text: 'Pasos pequeños pero constantes. No necesito ser la más rápida, solo necesito no detenerme.',
      category: 'crecimiento',
      timestamp: 'Hace 2 días',
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      likes: 53,
      isUser: false,
      likedByMe: false
    },
    {
      id: 'mot-7',
      userName: 'Lucas',
      avatar: 'rana',
      text: 'Vencer la resistencia inicial de los primeros 5 minutos. Sé que después de eso, todo fluye solo.',
      category: 'disciplina',
      timestamp: 'Hace 2 días',
      createdAt: Date.now() - 1000 * 60 * 60 * 52,
      likes: 27,
      isUser: false,
      likedByMe: false
    },
    {
      id: 'mot-9',
      userName: 'Esteban',
      avatar: 'abeja',
      text: 'Construir hábitos sólidos hoy para que mi futuro yo no tenga que sufrir por falta de disciplina.',
      category: 'metas',
      timestamp: 'Hace 3 días',
      createdAt: Date.now() - 1000 * 60 * 60 * 72,
      likes: 39,
      isUser: false,
      likedByMe: false
    }
  ];

  motivationsList = signal<MotivationItem[]>(this.loadMotivations());

  filteredMotivations = computed(() => {
    const filter = this.motivationFilter();
    const list = this.motivationsList();

    let result: MotivationItem[];
    if (filter === 'all') {
      result = list;
    } else if (filter === 'mine') {
      result = list.filter(m => m.isUser);
    } else if (filter === 'popular') {
      // Pestaña Más Populares: ordenar prioritariamente por corazones
      return [...list].sort((a, b) => b.likes - a.likes || (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      result = list.filter(m => m.category === filter);
    }

    // Ordenar por fecha (recién publicados primero) y luego por corazones
    return [...result].sort((a, b) => {
      const timeDiff = (b.createdAt || 0) - (a.createdAt || 0);
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return b.likes - a.likes;
    });
  });

  myMotivationsCount = computed(() => {
    return this.motivationsList().filter(m => m.isUser).length;
  });

  totalCommunityLikes = computed(() => {
    return this.motivationsList().reduce((acc, m) => acc + m.likes, 0);
  });

  loadMotivations(): MotivationItem[] {
    try {
      const savedUserMotivations = localStorage.getItem('user-custom-motivations');
      const userMots: MotivationItem[] = savedUserMotivations ? JSON.parse(savedUserMotivations) : [];
      const savedLikedIds: string[] = JSON.parse(localStorage.getItem('user-liked-motivations') || '[]');
      
      const community = this.initialMotivations.map(m => ({
        ...m,
        likedByMe: savedLikedIds.includes(m.id) || m.likedByMe
      }));

      const all = [...userMots, ...community];
      return all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || b.likes - a.likes);
    } catch (e) {
      return [...this.initialMotivations].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || b.likes - a.likes);
    }
  }

  saveCustomMotivations() {
    try {
      const userOnly = this.motivationsList().filter(m => m.isUser);
      localStorage.setItem('user-custom-motivations', JSON.stringify(userOnly));
    } catch (e) {}
  }

  saveLikedMotivations() {
    try {
      const likedIds = this.motivationsList().filter(m => m.likedByMe).map(m => m.id);
      localStorage.setItem('user-liked-motivations', JSON.stringify(likedIds));
    } catch (e) {}
  }

  addMotivation() {
    const text = this.newMotivationText().trim();
    if (!text) return;

    const user = this.userName() || 'Tú';
    const avatar = this.selectedAvatar() || 'gato';
    const category = this.newMotivationCategory();

    const newMot: MotivationItem = {
      id: 'user-mot-' + Date.now(),
      userName: user,
      avatar: avatar,
      text: text,
      category: category,
      timestamp: 'Justo ahora',
      createdAt: Date.now(),
      likes: 1,
      isUser: true,
      likedByMe: true
    };

    this.motivationsList.update(list => [newMot, ...list]);
    this.newMotivationText.set('');
    this.saveCustomMotivations();
    this.saveLikedMotivations();

    this.showToastFeedback('✨ ¡Tu motivación ha sido publicada en el muro!', 'success');
  }

  deleteMotivation(id: string) {
    this.motivationsList.update(list => list.filter(m => m.id !== id));
    this.saveCustomMotivations();
    this.showToastFeedback('🗑️ Motivación eliminada', 'info');
  }

  toggleLikeMotivation(item: MotivationItem) {
    this.motivationsList.update(list => {
      return list.map(m => {
        if (m.id === item.id) {
          const liked = !m.likedByMe;
          return {
            ...m,
            likedByMe: liked,
            likes: liked ? m.likes + 1 : Math.max(0, m.likes - 1)
          };
        }
        return m;
      });
    });
    this.saveLikedMotivations();
    if (!item.likedByMe) {
      this.showToastFeedback('❤️ ¡Te inspira esta motivación!', 'like');
    }
  }

  setMotivationAsObjective(text: string) {
    this.activeObjective.set(text);
    this.confirmObjective();
    this.showToastFeedback('🎯 ¡Establecida como misión de tu sesión de enfoque!', 'success');
  }

  pinMotivationAsMantra(text: string) {
    if (this.pinnedMantra() === text) {
      this.pinnedMantra.set('');
      localStorage.removeItem('focus-pinned-mantra');
      this.showToastFeedback('Mantra de enfoque retirado', 'info');
    } else {
      this.pinnedMantra.set(text);
      localStorage.setItem('focus-pinned-mantra', text);
      this.showToastFeedback('🔥 ¡Mantra fijado para inspirar tu concentración!', 'success');
    }
  }

  getRandomMotivation() {
    const list = this.motivationsList();
    if (list.length === 0) return;
    const randomIndex = Math.floor(Math.random() * list.length);
    const mot = list[randomIndex];
    this.showToastFeedback(`🎲 Inspiración de ${mot.userName}: "${mot.text}"`, 'info');
  }

  showToastFeedback(message: string, type: 'success' | 'info' | 'like' = 'success') {
    const toastType: 'info' | 'warning' | 'success' | 'danger' = type === 'like' ? 'info' : type;
    this.showToast(message, toastType);
  }

  getCategoryLabel(category: string): string {
    switch(category) {
      case 'metas': return '🎯 Metas';
      case 'familia': return '👨‍👩‍👧 Familia';
      case 'disciplina': return '⚡ Disciplina';
      case 'crecimiento': return '🧠 Crecimiento';
      case 'pasion': return '🎨 Pasión';
      default: return category;
    }
  }

  getCategoryColor(category: string): string {
    switch(category) {
      case 'metas': return '#a855f7';
      case 'familia': return '#f59e0b';
      case 'disciplina': return '#00f2fe';
      case 'crecimiento': return '#10b981';
      case 'pasion': return '#ec4899';
      default: return 'var(--accent)';
    }
  }

  // Inactividad y Modo Zen (Fondo Screensaver)
  isInactive = signal(false);
  private inactivityTimeout: any;
  private onActivityFn = () => this.onUserActivity();
  private onMouseLeaveFn = () => this.onMouseLeaveWindow();

  // Estilo del Temporizador (Clásico vs Fuego Premium vs Órbita Solar vs Titanic vs El Faro vs Avión en Pista)
  timerStyle = signal<'digital' | 'fire' | 'hourglass' | 'ice' | 'battery' | 'ring' | 'line' | 'solar' | 'satellite' | 'moon' | 'titanic' | 'lighthouse' | 'airplane'>(
    (localStorage.getItem('focus-timer-style') as any) || 'digital'
  );

  // Porcentaje de tiempo restante
  timePercentage = computed(() => {
    const total = this.totalSessionTime();
    const left = this.timeLeft();
    if (total <= 0) return 0;
    return left / total;
  });

  // Ancho de recorte dinámico para devorar la manzana (de 85 a 15)
  clipWidth = computed(() => {
    return 15 + this.timePercentage() * 70;
  });

  // Escala del fuego basada en el tiempo restante (de 1.20 a 0.35)
  fireScale = computed(() => {
    if (this.isBreak()) {
      const pct = this.timePercentage();
      return 0.40 + pct * 0.15;
    }
    const pct = this.timePercentage();
    if (pct <= 0) return 0;
    return 0.35 + pct * 0.85;
  });

  // Opacidad y parpadeo final del fuego
  fireOpacity = computed(() => {
    if (this.isBreak()) return 1.0;
    const pct = this.timePercentage();
    if (pct <= 0) return 0;
    if (pct < 0.05) {
      return (pct / 0.05) * 0.8;
    }
    return 1.0;
  });

  // Opacidades individuales para las capas de la llama y chispas
  sparksOpacity = computed(() => {
    if (this.isBreak()) return 0.50; // Chispas constantes en descanso
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.3) return 1.0;
    if (pct <= 0.2) return 0.25; // Se mantienen al 25% siempre
    return 0.25 + ((pct - 0.2) / 0.1) * 0.75;
  });

  innerFlameOpacity = computed(() => {
    if (this.isBreak()) return 0.0;
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.2) return 1.0;
    if (pct <= 0.1) return 0.0;
    return (pct - 0.1) / 0.1;
  });

  middleFlameOpacity = computed(() => {
    if (this.isBreak()) return 0.0;
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.1) return 1.0;
    if (pct <= 0.05) return 0.0;
    return (pct - 0.05) / 0.05;
  });

  outerFlameOpacity = computed(() => {
    if (this.isBreak()) return 0.0;
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.05) return 1.0;
    if (pct <= 0) return 0;
    return pct / 0.05;
  });


  // Objetivo Activo (La batalla de hoy) e Integración Metodológica
  activeObjective = signal('');
  associatedIdeaId = signal<string | null>(null);
  activeMethodology = signal<'sapo' | 'pareto' | 'normal'>('normal');

  selectMethodology(method: 'sapo' | 'pareto' | 'normal') {
    this.activeMethodology.set(method);
  }

  onObjectiveInputChange(val: string) {
    this.activeObjective.set(val);
    if (!val || !val.trim()) {
      this.associatedIdeaId.set(null);
      localStorage.removeItem('activeObjectiveDraft');
      localStorage.removeItem('activeObjectiveIdeaId');
      localStorage.removeItem('focus-session-objective');
      localStorage.removeItem('focus-session-idea-id');
    }
  }

  disassociateObjective() {
    this.activeObjective.set('');
    this.associatedIdeaId.set(null);
    this.objectiveConfirmed.set(false);
    localStorage.removeItem('activeObjectiveDraft');
    localStorage.removeItem('activeObjectiveIdeaId');
    localStorage.removeItem('focus-session-objective');
    localStorage.removeItem('focus-session-idea-id');
    this.showToastFeedback('Objetivo desasociado.', 'info');
  }

  associatedIdeaObj = computed(() => {
    const id = this.associatedIdeaId();
    if (!id) return null;
    return this.membership.capturedIdeas().find(i => i.id === id) || null;
  });

  formatDedicatedTime(minutes?: number): string {
    if (!minutes || minutes <= 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Lógica del Temporizador (25 minutos = 1500 segundos)
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

  isConsolePinned = signal(false);
  showAbandonConfirmModal = signal(false);
  showInterruptedModal = signal(false);
  bossHealAmount = computed(() => Math.round(this.bossService.activeBoss().maxHp * 0.02));
  objectiveConfirmed = signal(false);

  confirmObjective() {
    this.objectiveConfirmed.set(true);
    setTimeout(() => {
      this.objectiveConfirmed.set(false);
    }, 2000);
  }

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

  generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async settleCurrentSession(
    status: 'completed' | 'abandoned' | 'interrupted',
    objCompleted?: 'yes' | 'no' | 'progress' | 'partial',
    overrideObjective?: string,
    overrideIdeaId?: string | null
  ) {
    if (!this.supabaseService.isConfigured() || !this.supabaseService.currentUser()) {
      return;
    }

    const nonceId = this.currentSessionNonceId || this.generateUUID();
    const plannedSeconds = Math.max(60, this.totalSessionTime() > 0 ? this.totalSessionTime() : this.focusDuration() * 60);
    const actualSeconds = status === 'completed'
      ? plannedSeconds
      : Math.max(0, plannedSeconds - Math.max(0, this.timeLeft()));
    
    const objectiveCompletion = objCompleted || (this.objectiveCompleted() as any) || (status === 'completed' ? 'yes' : 'no');
    
    const distractions = this.distractionsList().map(d => ({
      id: d.id,
      text: d.text,
      time: d.time
    }));

    const finalObjective = (overrideObjective !== undefined ? overrideObjective : this.activeObjective())?.trim() || 'Sesión de Enfoque';
    const finalIdeaId = overrideIdeaId !== undefined ? overrideIdeaId : this.associatedIdeaId();

    const sessionPayload: FocusSessionData = {
      nonce_id: nonceId,
      avatar_id: this.membership.selectedAvatar() || 'gato',
      methodology: this.activeMethodology() || 'normal',
      coworking_mode: this.coworkingMode() === 'comunitario' ? 'comunitario' : 'individual',
      energy_level: this.energyLevel() || 'medium',
      objective_text: finalObjective,
      idea_id: finalIdeaId || undefined,
      planned_duration_seconds: plannedSeconds,
      actual_duration_seconds: actualSeconds,
      pause_count: this.interruptedByPause() ? 1 : 0,
      total_pause_seconds: 0,
      status: status,
      objective_completed: objectiveCompletion
    };

    try {
      this.isSettlingSession.set(true);
      const { success, result, error } = await this.supabaseService.settleFocusSession(
        sessionPayload,
        undefined,
        distractions
      );

      if (success && result) {
        if (result.remaining_coins !== undefined) {
          this.membership.proCoins.set(result.remaining_coins);
        }
        if (result.streak_days !== undefined) {
          this.membership.streak.set(result.streak_days);
        }
        // Sincronizar perfil completo desde Supabase
        await this.membership.syncProfileFromSupabase();
      } else if (error) {
        console.warn('Error al liquidar sesión en Supabase:', error);
      }
    } catch (e) {
      console.warn('Excepción al liquidar sesión en Supabase:', e);
    } finally {
      this.isSettlingSession.set(false);
      this.currentSessionNonceId = null;
    }
  }

  // ==========================================
  // NOTIFICACIONES DE ESCRITORIO & ALERTAS DE PESTAÑA (B & C)
  // ==========================================
  private titleFlashingInterval: any = null;
  private originalDocumentTitle = 'COFU - Procrastina Como un Pro';
  notificationPermission = signal<string>('default');
  notificationsEnabled = signal<boolean>(
    localStorage.getItem('desktop-notifications-enabled') !== 'false'
  );
  tabNotificationsEnabled = signal<boolean>(
    localStorage.getItem('tab-notifications-enabled') !== 'false'
  );
  focusNotificationEnabled = signal<boolean>(
    localStorage.getItem('focus-notification-enabled') !== 'false'
  );
  breakNotificationEnabled = signal<boolean>(
    localStorage.getItem('break-notification-enabled') !== 'false'
  );
  longBreakNotificationEnabled = signal<boolean>(
    localStorage.getItem('long-break-notification-enabled') !== 'false'
  );
  motivationNotificationEnabled = signal<boolean>(
    localStorage.getItem('motivation-notification-enabled') !== 'false'
  );
  abandonSoundEnabled = signal<boolean>(
    localStorage.getItem('abandon-sound-enabled') !== 'false'
  );

  // Aliases and helpers for notifications settings UI
  notifyOnPomodoroEnd = this.focusNotificationEnabled;
  notifyOnShortBreakEnd = this.breakNotificationEnabled;
  notifyOnLongBreakEnd = this.longBreakNotificationEnabled;
  notifyOnMotivationReminder = this.motivationNotificationEnabled;
  tabFlashingEnabled = this.tabNotificationsEnabled;

  toggleAbandonSound(enabled?: boolean) {
    const newVal = enabled !== undefined ? enabled : !this.abandonSoundEnabled();
    this.abandonSoundEnabled.set(newVal);
    localStorage.setItem('abandon-sound-enabled', String(newVal));
    if (newVal) {
      this.showToastFeedback('🔊 Sonido de abandono activado.', 'info');
    } else {
      this.showToastFeedback('🔇 Sonido de abandono desactivado.', 'info');
    }
  }

  toggleMasterNotifications() {
    this.toggleDesktopNotifications(!this.notificationsEnabled());
  }

  toggleTabFlashing() {
    this.toggleTabNotifications(!this.tabNotificationsEnabled());
  }

  toggleNotification(type: 'pomodoroEnd' | 'shortBreakEnd' | 'longBreakEnd' | 'motivationReminder' | string) {
    switch (type) {
      case 'pomodoroEnd':
        this.toggleFocusNotification(!this.focusNotificationEnabled());
        break;
      case 'shortBreakEnd':
        this.toggleBreakNotification(!this.breakNotificationEnabled());
        break;
      case 'longBreakEnd':
        this.toggleLongBreakNotification(!this.longBreakNotificationEnabled());
        break;
      case 'motivationReminder':
        this.toggleMotivationNotification(!this.motivationNotificationEnabled());
        break;
    }
  }

  testNotification(type: 'pomodoroEnd' | 'shortBreakEnd' | 'longBreakEnd' | 'motivationReminder' | string) {
    switch (type) {
      case 'pomodoroEnd':
        this.testFocusNotification();
        break;
      case 'shortBreakEnd':
        this.testBreakNotification();
        break;
      case 'longBreakEnd':
        this.testLongBreakNotification();
        break;
      case 'motivationReminder':
        this.testMotivationNotification();
        break;
    }
  }

  toggleDesktopNotifications(enabled: boolean) {
    this.notificationsEnabled.set(enabled);
    localStorage.setItem('desktop-notifications-enabled', String(enabled));
    if (enabled) {
      this.requestNotificationPermission(true);
    } else {
      this.showToastFeedback('🔕 Notificaciones de escritorio desactivadas.', 'info');
    }
  }

  toggleTabNotifications(enabled: boolean) {
    this.tabNotificationsEnabled.set(enabled);
    localStorage.setItem('tab-notifications-enabled', String(enabled));
  }

  toggleFocusNotification(enabled: boolean) {
    this.focusNotificationEnabled.set(enabled);
    localStorage.setItem('focus-notification-enabled', String(enabled));
  }

  toggleBreakNotification(enabled: boolean) {
    this.breakNotificationEnabled.set(enabled);
    localStorage.setItem('break-notification-enabled', String(enabled));
  }

  toggleLongBreakNotification(enabled: boolean) {
    this.longBreakNotificationEnabled.set(enabled);
    localStorage.setItem('long-break-notification-enabled', String(enabled));
  }

  toggleMotivationNotification(enabled: boolean) {
    this.motivationNotificationEnabled.set(enabled);
    localStorage.setItem('motivation-notification-enabled', String(enabled));
  }

  testFocusNotification() {
    this.sendDesktopNotification(
      '🍅 ¡Pomodoro Completado! (Prueba)',
      '¡Excelente trabajo! Has completado tu bloque de concentración.'
    );
    this.showToastFeedback('🔔 Notificación de prueba de enfoque enviada.', 'success');
  }

  testBreakNotification() {
    this.sendDesktopNotification(
      '☕ ¡Descanso Breve Finalizado! (Prueba)',
      'Tu energía está recargada. Es hora de volver al bloque de concentración.'
    );
    this.showToastFeedback('🔔 Notificación de prueba de descanso breve enviada.', 'success');
  }

  testLongBreakNotification() {
    this.sendDesktopNotification(
      '🌴 ¡Descanso Largo Finalizado! (Prueba)',
      'Tu pausa extendida ha concluido. ¡Energía al 100% para continuar!'
    );
    this.showToastFeedback('🔔 Notificación de prueba de descanso largo enviada.', 'success');
  }

  testMotivationNotification() {
    const list = this.motivationsList();
    const mot = list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
    const text = mot ? `"${mot.text}" — ${mot.userName || 'Comunidad'}` : '¡Tu disciplina de hoy es tu éxito de mañana!';
    this.sendDesktopNotification(
      '🔋 Batería de Motivación (Prueba)',
      text
    );
    this.showToastFeedback('⚡ Notificación de prueba de motivación enviada.', 'success');
  }

  requestNotificationPermission(showTestNotif: boolean = false) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const current = Notification.permission;
        this.notificationPermission.set(current);

        if (current === 'default') {
          const handleResult = (perm: NotificationPermission) => {
            this.notificationPermission.set(perm);
            if (perm === 'granted') {
              this.showToastFeedback('🔔 ¡Notificaciones de escritorio activadas!', 'success');
              if (showTestNotif) {
                this.sendDesktopNotification(
                  '🔔 Notificaciones Activadas - COFU',
                  '¡Excelente! Recibirás avisos en tu pantalla cuando termine cada Pomodoro y descanso.'
                );
              }
            } else if (perm === 'denied') {
              this.showToastFeedback('⚠️ Notificaciones bloqueadas en el navegador.', 'info');
            }
          };

          try {
            const promise = Notification.requestPermission(handleResult);
            if (promise && typeof promise.then === 'function') {
              promise.then(handleResult).catch(err => {
                console.warn('Error en promise de requestPermission:', err);
              });
            }
          } catch(e) {
            console.warn('Error llamando requestPermission:', e);
          }
        } else if (current === 'granted') {
          this.notificationPermission.set('granted');
          if (showTestNotif) {
            this.sendDesktopNotification(
              '🔔 Prueba de Notificación COFU',
              '¡Las notificaciones de escritorio funcionan correctamente!'
            );
            this.showToastFeedback('🔔 Notificación de prueba enviada al escritorio.', 'success');
          }
        } else if (current === 'denied') {
          this.notificationPermission.set('denied');
          if (showTestNotif) {
            this.showToastFeedback(
              '⚠️ Las notificaciones están bloqueadas. Haz clic en el icono 🔒 en la barra de tu navegador para permitirlas.',
              'info'
            );
          }
        }
      } catch(e) {
        console.warn('Error en requestNotificationPermission:', e);
      }
    } else {
      this.notificationPermission.set('unsupported');
    }
  }

  sendDesktopNotification(title: string, body: string, icon?: string) {
    if (!this.notificationsEnabled()) {
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notification API no soportada en este entorno o contexto no seguro.');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('No se puede enviar notificación porque el permiso actual es:', Notification.permission);
      this.notificationPermission.set(Notification.permission);
      return;
    }

    const iconUrl = icon || (window.location.origin ? `${window.location.origin}/cofu_logo.jpg` : 'cofu_logo.jpg');

    try {
      const notif = new Notification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        requireInteraction: true,
        silent: false
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch (e) {}
        notif.close();
      };
    } catch (e) {
      console.warn('Error al instanciar Notification con opciones avanzadas, intentando formato estándar:', e);
      try {
        const simpleNotif = new Notification(title, { body });
        simpleNotif.onclick = () => {
          try { window.focus(); } catch(err) {}
          simpleNotif.close();
        };
      } catch (err) {
        console.error('Fallo total al crear Notification:', err);
      }
    }
  }

  handleTimerCompleted() {
    this.clearPersistedSession();
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.membership.isFocusActive.set(false);

    if (!this.isBreak()) {
      // 🍅 Fin del Pomodoro (Sesión de concentración completada)
      this.sessionEndingStatus.set('completed');
      this.objectiveCompleted.set(null);
      this.arenaState.set('summary');
      this.playFocusAlarm(); // Alarma sonora de Pomodoro
      this.triggerCelebration();

      if (this.focusNotificationEnabled()) {
        this.sendDesktopNotification(
          '🍅 ¡Pomodoro Completado!',
          '¡Excelente trabajo! Has completado tu bloque de concentración.'
        );
      }
      this.startTitleFlashing(
        'COFU - 00:00 ¡Completado! 🍅',
        'COFU - Concentración 🎯'
      );

      if (this.motivationNotificationEnabled()) {
        const list = this.motivationsList();
        if (list.length > 0) {
          const mot = list[Math.floor(Math.random() * list.length)];
          setTimeout(() => {
            this.sendDesktopNotification(
              '⚡ Impulso de Motivación COFU',
              `"${mot.text}" — ${mot.userName || 'Comunidad'}`
            );
          }, 1500);
        }
      }
    } else {
      // ⚡ Fin del Descanso (breve o largo)
      const isLong = this.completedPomodoros() > 0 && (this.completedPomodoros() % this.longBreakInterval() === 0);
      this.isBreak.set(false);
      this.totalSessionTime.set(this.focusDuration() * 60);
      this.timeLeft.set(this.focusDuration() * 60);
      this.arenaState.set('setup');

      if (isLong) {
        this.playLongBreakAlarm();
        if (this.longBreakNotificationEnabled()) {
          this.sendDesktopNotification(
            '🌴 ¡Descanso Largo Finalizado!',
            'Tu pausa extendida ha concluido. ¡Energía al 100% para continuar!'
          );
        }
      } else {
        this.playBreakAlarm();
        if (this.breakNotificationEnabled()) {
          this.sendDesktopNotification(
            '☕ ¡Descanso Breve Finalizado!',
            'Tu energía está recargada. Es hora de volver al enfoque.'
          );
        }
      }

      this.startTitleFlashing(
        'COFU - 00:00 ¡Descanso listo! ⚡',
        'COFU - Concentración 🎯'
      );
    }
  }

  startTitleFlashing(text1: string, text2: string) {
    if (!this.tabNotificationsEnabled()) return;
    this.stopTitleFlashing();
    let toggle = false;
    document.title = text1;

    // Alternancia suave y discreta del título cada 1.5s
    this.titleFlashingInterval = setInterval(() => {
      toggle = !toggle;
      document.title = toggle ? text1 : text2;
    }, 1500);
  }

  stopTitleFlashing() {
    if (this.titleFlashingInterval) {
      clearInterval(this.titleFlashingInterval);
      this.titleFlashingInterval = null;
    }
    document.title = this.originalDocumentTitle;
  }

  @HostListener('window:focus')
  onWindowFocusAlert() {
    if (this.titleFlashingInterval) {
      this.stopTitleFlashing();
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChangeAlert() {
    if (typeof document !== 'undefined' && !document.hidden && this.titleFlashingInterval) {
      this.stopTitleFlashing();
    }
  }

  updateLiveTabTitle() {
    if (this.titleFlashingInterval) return;

    if (this.arenaState() === 'active') {
      const timeStr = this.timeString();
      if (this.emergencyPauseActive()) {
        const pauseMin = Math.floor(this.emergencyTimeLeft() / 60);
        const pauseSec = this.emergencyTimeLeft() % 60;
        const pauseStr = `${pauseMin.toString().padStart(2, '0')}:${pauseSec.toString().padStart(2, '0')}`;
        document.title = `COFU - ${pauseStr} ⏸️`;
      } else if (!this.isBreak()) {
        document.title = `COFU - ${timeStr} 🎯`;
      } else {
        document.title = `COFU - ${timeStr} ☕`;
      }
    } else if (this.arenaState() === 'countdown') {
      document.title = `COFU - ${this.countdownValue()} ⚡`;
    } else {
      document.title = this.originalDocumentTitle;
    }
  }

  ngOnInit() {
    this.requestNotificationPermission();
    this.membership.syncProfileFromSupabase();
    this.initializeComunidadUsers();
    this.communityInterval = setInterval(() => {
      this.tickCommunity();
    }, 4000);

    // Fluctación orgánica de Body Doubling en silencio
    this.bodyDoublingInterval = setInterval(() => {
      const delta = (Math.floor(Math.random() * 5) - 2); // -2 a +2
      this.bodyDoublingCount.update(c => Math.max(95, Math.min(180, c + delta)));
    }, 12000);

    const draft = localStorage.getItem('activeObjectiveDraft');
    const draftIdeaId = localStorage.getItem('activeObjectiveIdeaId');
    if (draft) {
      this.activeObjective.set(draft);
      this.objectiveConfirmed.set(true);
      localStorage.setItem('focus-session-objective', draft);
    }
    if (draftIdeaId) {
      this.associatedIdeaId.set(draftIdeaId);
      localStorage.setItem('focus-session-idea-id', draftIdeaId);
    }

    // Registración de escuchas de inactividad Zen
    document.addEventListener('mousemove', this.onActivityFn);
    document.addEventListener('mousedown', this.onActivityFn);
    document.addEventListener('keydown', this.onActivityFn);
    document.addEventListener('click', this.onActivityFn);
    document.addEventListener('touchstart', this.onActivityFn);
    document.addEventListener('mouseleave', this.onMouseLeaveFn);
    this.resetInactivityTimer();

    // Cargar posición guardada de la fogata
    const savedX = localStorage.getItem('campfire-pos-x');
    const savedY = localStorage.getItem('campfire-pos-y');
    if (savedX) this.campfireX.set(parseFloat(savedX));
    if (savedY) this.campfireY.set(parseFloat(savedY));

    // Mostrar tip de arrastre temporalmente al inicio si está seleccionado el reloj de fogata
    if (this.timerStyle() === 'fire') {
      this.showCampfireDragTooltip.set(true);
      setTimeout(() => {
        this.showCampfireDragTooltip.set(false);
      }, 8000);
    }

    // Verificar si hay una sesión activa persistente y restaurar el tiempo exacto
    this.checkAndRestoreActiveSession();
  }

  // Iniciar Flujo: Lanza el Ritual 3-2-1
  startFocusFlow(bypassModal = false) {
    this.requestNotificationPermission();
    this.stopTitleFlashing();
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

    // Configurar tiempos iniciales según setup (respetando si es descanso o enfoque)
    if (!this.isBreak()) {
      this.totalSessionTime.set(this.focusDuration() * 60);
      this.timeLeft.set(this.focusDuration() * 60);
      this.currentSessionNonceId = this.generateUUID();
      this.membership.isFocusActive.set(true);
    } else {
      const isLongBreak = this.completedPomodoros() > 0 && (this.completedPomodoros() % this.longBreakInterval() === 0);
      const duration = isLongBreak ? this.longBreakDuration() : this.breakDuration();
      this.totalSessionTime.set(duration * 60);
      this.timeLeft.set(duration * 60);
      this.currentSessionNonceId = null;
      this.membership.isFocusActive.set(false);
    }
    
    // Cambiar a estado cuenta regresiva
    this.arenaState.set('countdown');
    this.countdownValue.set(5);
    this.updateLiveTabTitle();

    // Sonido sutil de preparación
    this.playTone(220, 'sine', 0.1, 0.15);

    this.countdownTimer = setInterval(() => {
      if (this.countdownValue() > 1) {
        this.countdownValue.update(v => v - 1);
        this.updateLiveTabTitle();
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

  // Interrupción / Pausa (Botón de Pánico - Cuenta regresiva de 2 minutos)
  toggleEmergencyPause() {
    if (this.emergencyPauseActive()) {
      // Reanudar
      this.stopEmergencyTimer();
      this.emergencyPauseActive.set(false);
      this.startTimerLoop();
    } else {
      // Activar interrupción
      this.stopTimerLoop();
      this.emergencyPauseActive.set(true);
      
      const limitSeconds = 120; // 2 minutos para todos
      this.emergencyTimeLeft.set(limitSeconds);
      this.updateLiveTabTitle();

      this.emergencyTimer = setInterval(() => {
        if (this.emergencyTimeLeft() > 0) {
          this.emergencyTimeLeft.update(t => t - 1);
          this.updateLiveTabTitle();
          
          // Ocasionalmente alertar en el feed que estás en pausa/interrupción
          if (this.emergencyTimeLeft() === 60 && this.coworkingMode() === 'comunitario') {
            this.addComunidadEvent('⚠️ Varios compañeros notaron tu interrupción. ¡Reanuda pronto!', 'reaction');
          }
        } else {
          // Se acabó el tiempo de interrupción -> Sesión Cancelada automáticamente
          this.stopEmergencyTimer();
          this.stopTimerLoop();
          this.stopBackgroundSound();
          this.membership.isFocusActive.set(false);
          
          this.sessionEndingStatus.set('interrupted');
          this.interruptedByPause.set(true);
          
          // Penalización de monedas (ProCoins)
          this.membership.proCoins.update(coins => Math.max(0, coins - 50));

          // Registrar intento diario
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const newAttempt = { status: 'interrupted' as const, time: timeStr };
          const updatedAttempts = [...this.dailyAttempts(), newAttempt];
          this.dailyAttempts.set(updatedAttempts);
          localStorage.setItem('daily-attempts', JSON.stringify(updatedAttempts));

          if (this.membership.isPremium()) {
            this.membership.addFocusPoints(-50);
          }

          // Cura al jefe por agotarse la interrupción en comunidad
          if (this.coworkingMode() === 'comunitario') {
            this.bossService.healBoss(this.userName() || 'Guerrero Anónimo');
            this.addComunidadEvent(`💔 ${this.userName() || 'Un Guerrero'} se distrajo por demasiado tiempo. ¡El Oni recupera fuerzas!`, 'reaction');
          }

          // Liquidar sesión en Supabase y limpiar persistencia
          this.settleCurrentSession('interrupted', 'no');
          this.clearPersistedSession();

          // Reiniciar pomodoro directamente al estado setup
          this.isBreak.set(false);
          this.totalSessionTime.set(this.focusDuration() * 60);
          this.timeLeft.set(this.focusDuration() * 60);
          this.arenaState.set('setup');
          this.emergencyPauseActive.set(false);
          this.objectiveCompleted.set(null);
          this.router.navigate(['/enfoque']);

          // Mostrar modal informativo de cancelación
          this.showInterruptedModal.set(true);
          this.playAbandonmentSadSound();
          const healHpInterrupted = this.bossHealAmount();
          this.showToast(`⚠️ Sesión cancelada por inactividad (-50 ProCoins). El Jefe recuperó +${healHpInterrupted} HP.`, 'danger');

          // Notificación de escritorio y alerta de pestaña
          this.sendDesktopNotification(
            '⚠️ ¡Tiempo de Pausa Agotado!',
            'La sesión de enfoque se ha cancelado por inactividad prolongada.'
          );
          this.startTitleFlashing(
            '⚠️ COFU - ¡SESIÓN CANCELADA! ⚠️',
            '⚡ ¡Vuelve a COFU para intentarlo! ⚡'
          );
        }
      }, 1000);
    }
  }

  // Abandonar Sesión (Muestra la confirmación de abandono)
  abandonSession() {
    this.showAbandonConfirmModal.set(true);
  }

  // Confirmación de Abandono (Ejecuta la penalización y reinicia el Pomodoro)
  confirmAbandon() {
    this.stopTitleFlashing();
    this.showAbandonConfirmModal.set(false);
    this.membership.isFocusActive.set(false);

    const currentIdeaId = this.associatedIdeaId();
    const currentObjective = this.activeObjective()?.trim() || 'Sesión de Enfoque';

    // Guardar minutos dedicados a la tarea antes del abandono
    const plannedSeconds = Math.max(60, this.totalSessionTime() > 0 ? this.totalSessionTime() : this.focusDuration() * 60);
    const actualSeconds = Math.max(0, plannedSeconds - Math.max(0, this.timeLeft()));
    const actualMins = Math.floor(actualSeconds / 60);
    if (actualMins > 0 && currentIdeaId) {
      this.membership.addDedicatedTimeToIdea(currentIdeaId, actualMins);
    }

    // Liquidar sesión en Supabase con estado abandoned preservando tarea e idea_id
    this.settleCurrentSession('abandoned', 'no', currentObjective, currentIdeaId);
    this.clearPersistedSession();

    // Penalización de monedas (ProCoins)
    this.membership.proCoins.update(coins => Math.max(0, coins - 50));

    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    this.sessionEndingStatus.set('abandoned');
    this.manuallyAbandoned.set(true);
    this.objectiveCompleted.set('no');

    // Registrar intento diario
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newAttempt = { status: 'abandoned' as const, time: timeStr };
    const updatedAttempts = [...this.dailyAttempts(), newAttempt];
    this.dailyAttempts.set(updatedAttempts);
    localStorage.setItem('daily-attempts', JSON.stringify(updatedAttempts));

    if (this.membership.isPremium()) {
      // Castigo de -50 XP por abandonar
      this.membership.addFocusPoints(-50);
    }

    // Cura al jefe por abandono en comunidad
    this.bossService.healBoss(this.userName() || 'Guerrero Anónimo');
    const healHp = this.bossHealAmount();
    if (this.coworkingMode() === 'comunitario') {
      this.addComunidadEvent(`💔 ${this.userName() || 'Un Guerrero'} ha abandonado la sesión de enfoque. ¡El Oni recuperó +${healHp} HP!`, 'reaction');
    }

    // Reiniciar pomodoro directamente al estado setup
    this.isBreak.set(false);
    this.totalSessionTime.set(this.focusDuration() * 60);
    this.timeLeft.set(this.focusDuration() * 60);
    this.arenaState.set('setup');
    this.objectiveCompleted.set(null);

    // Reproducir sonido triste / deprimente al abandonar la sesión
    this.playAbandonmentSadSound();

    // Notificación toast en la parte inferior informando de cuánto ayudó al jefe
    this.showToast(`💔 Has abandonado la sesión (-50 ProCoins). El Jefe de la Comunidad recuperó +${healHp} HP.`, 'danger');
    this.router.navigate(['/enfoque']);
  }

  simulateCompletion() {
    this.timeLeft.set(0);
    this.handleTimerCompleted();
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

  async finishSessionAndStart(nextState: 'short' | 'long' | 'exit') {
    this.requestNotificationPermission();
    this.stopTitleFlashing();
    this.stopBackgroundSound();
    this.membership.isFocusActive.set(false);

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
        
        // Daño al Boss por completar el Pomodoro en la Comunidad (únicamente el daño marcado en la ficha del avatar)
        if (isShared) {
          const equippedAvatar = this.membership.selectedAvatar() || 'gato';
          const damage = this.membership.getAvatarDamagePoints(equippedAvatar);
          this.bossService.dealDamage(damage);
          
          const eventText = `🗡️ ${this.userName()} completó su Pomodoro e infligió ${damage} de daño al Boss.`;
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

        const targetIdeaId = this.associatedIdeaId();
        const currentObjective = this.activeObjective()?.trim() || 'Sesión de Enfoque';
        const plannedSeconds = Math.max(60, this.totalSessionTime() > 0 ? this.totalSessionTime() : this.focusDuration() * 60);
        const actualSeconds = currentStatus === 'completed'
          ? plannedSeconds
          : Math.max(0, plannedSeconds - Math.max(0, this.timeLeft()));
        const dedicatedMins = Math.max(1, Math.round(actualSeconds / 60));

        if (targetIdeaId) {
          // Acumular el tiempo dedicado en la nota/idea
          await this.membership.addDedicatedTimeToIdea(targetIdeaId, dedicatedMins);
        }

        // Liquidar e insertar la sesión inmutable en Supabase ANTES de resetear el estado local
        await this.settleCurrentSession(
          currentStatus as 'completed' | 'abandoned' | 'interrupted',
          (this.objectiveCompleted() as any) || (currentStatus === 'completed' ? 'yes' : 'no'),
          currentObjective,
          targetIdeaId
        );

        // Si el usuario confirmó que SÍ terminó el objetivo al final del pomodoro
        if (objCompleted === 'yes') {
          if (targetIdeaId) {
            await this.membership.completeIdea(targetIdeaId);
          }
          // Limpiar el objetivo ya completado
          this.activeObjective.set('');
          this.associatedIdeaId.set(null);
          this.objectiveConfirmed.set(false);
          localStorage.removeItem('activeObjectiveDraft');
          localStorage.removeItem('activeObjectiveIdeaId');
          localStorage.removeItem('focus-session-objective');
          localStorage.removeItem('focus-session-idea-id');
          this.showToastFeedback('🎯 ¡Objetivo completado y archivado en tus victorias!', 'success');
        } else if (targetIdeaId) {
          this.showToastFeedback(`⏱️ Se registraron +${dedicatedMins}m dedicados a tu tarea en el baúl.`, 'info');
        }

        // Bono de Coraje (Grit Bonus): Si empezó con baja energía y venció la desmotivación
        if (this.energyLevel() === 'low') {
          if (this.membership.isPremium()) {
            this.membership.addFocusPoints(50);
          }
          this.showToastFeedback('🛡️ ¡Bono de Coraje (+50 XP)! Venciste la desmotivación.', 'success');
        }
      } else if (currentStatus === 'abandoned' && this.membership.isPremium()) {
        // Castigo de -50 XP por abandonar
        this.membership.addFocusPoints(-50);
        await this.settleCurrentSession(
          'abandoned',
          'no',
          this.activeObjective()?.trim() || 'Sesión de Enfoque',
          this.associatedIdeaId()
        );
      }

      this.clearPersistedSession();
    }

    // Configurar e INICIAR la siguiente sesión según la elección del usuario
    if (nextState === 'short') {
      this.isBreak.set(true);
      const duration = this.breakDuration();
      this.totalSessionTime.set(duration * 60);
      this.timeLeft.set(duration * 60);
      this.arenaState.set('active');
      this.startTimerLoop();
    } else if (nextState === 'long') {
      this.isBreak.set(true);
      const duration = this.longBreakDuration();
      this.totalSessionTime.set(duration * 60);
      this.timeLeft.set(duration * 60);
      this.arenaState.set('active');
      this.startTimerLoop();
    } else { // exit (concentrarme / setup view)
      this.isBreak.set(false);
      this.totalSessionTime.set(this.focusDuration() * 60);
      this.timeLeft.set(this.focusDuration() * 60);
      this.arenaState.set('setup');
    }

    this.objectiveCompleted.set(null);
    this.router.navigate(['/enfoque']);
  }

  
  resetToFocus() {
    this.stopTitleFlashing();
    this.isBreak.set(false);
    this.totalSessionTime.set(this.focusDuration() * 60);
    this.timeLeft.set(this.focusDuration() * 60);
    this.membership.isFocusActive.set(false);
  }

  // Verificación si el cronómetro actual tiene habilitada la función de arrastre
  isDraggableTimer = computed(() => {
    const s = this.timerStyle();
    return s === 'fire' || s === 'hourglass' || s === 'ice' || s === 'battery' || s === 'ring' || s === 'line';
  });

  // Métodos para arrastrar el cronómetro interactivo (Solo permitido en: fogata, reloj de arena, cubo de hielo, batería, anillo, línea)
  onDragStart(event: MouseEvent) {
    if (!this.isDraggableTimer()) return;

    // Evitar iniciar arrastre si se hace click en algún botón o control interno
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    event.preventDefault();
    this.dragStartX = event.clientX - this.campfireX();
    this.dragStartY = event.clientY - this.campfireY();
    this.isDraggingCampfire.set(true);
  }

  onTouchStart(event: TouchEvent) {
    if (!this.isDraggableTimer()) return;

    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.dragStartX = touch.clientX - this.campfireX();
      this.dragStartY = touch.clientY - this.campfireY();
      this.isDraggingCampfire.set(true);
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDraggingCampfire()) {
      this.campfireX.set(event.clientX - this.dragStartX);
      this.campfireY.set(event.clientY - this.dragStartY);
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    if (this.isDraggingCampfire()) {
      this.isDraggingCampfire.set(false);
      localStorage.setItem('campfire-pos-x', this.campfireX().toString());
      localStorage.setItem('campfire-pos-y', this.campfireY().toString());
    }
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isDraggingCampfire() && event.touches.length > 0) {
      // Evitar scroll de pantalla mientras se arrastra la fogata
      event.preventDefault();
      const touch = event.touches[0];
      this.campfireX.set(touch.clientX - this.dragStartX);
      this.campfireY.set(touch.clientY - this.dragStartY);
    }
  }

  @HostListener('window:touchend')
  onTouchEnd() {
    this.onMouseUp();
  }

  resetCampfirePosition() {
    this.campfireX.set(0);
    this.campfireY.set(0);
    localStorage.removeItem('campfire-pos-x');
    localStorage.removeItem('campfire-pos-y');
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
    this.stopTitleFlashing();
    this.clearPersistedSession();
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    this.objectiveCompleted.set(null);
    this.isBreak.set(false);
    this.totalSessionTime.set(this.focusDuration() * 60);
    this.timeLeft.set(this.focusDuration() * 60);
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

  private createCampfireBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 5; // 5 segundos de bucle para excelente variedad y ASMR
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
    let lastOut = 0.0;
    
    // 1. Calor de fondo sordo (un rumor extremadamente tenue y cálido, sin llamaradas ni soplidos fuertes)
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      // Filtro rosa de 6 polos para calidez profunda
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      
      // Filtro pasabajos profundo
      const heatBase = (lastOut + (0.005 * pink)) / 1.005;
      lastOut = heatBase;
      
      // Volumen muy bajo y sutil para emular el calor del carbón encendido
      data[i] = heatBase * 0.18;
    }
    
    // 2. Crepitación de brasas secas (chasquidos rápidos de carbón y chispas cristalinas de ceniza)
    for (let i = 0; i < bufferSize; i++) {
      const rand = Math.random();
      
      // A) Pequeños chasquidos secos de carbón agrietándose (Chasquidos de ruido rápido muy frecuentes)
      if (rand > 0.99980) {
        const popLen = Math.min(bufferSize - i, Math.round(ctx.sampleRate * 0.006)); // 6ms
        for (let j = 0; j < popLen; j++) {
          const t = j / ctx.sampleRate;
          data[i + j] += (Math.random() * 2 - 1) * Math.exp(-700 * t) * 0.15;
        }
      }
      
      // B) Chispas diminutas de ceniza (Alta frecuencia cristalina instantánea)
      else if (rand > 0.99935) {
        const popLen = Math.min(bufferSize - i, Math.round(ctx.sampleRate * 0.0025)); // 2.5ms
        for (let j = 0; j < popLen; j++) {
          const t = j / ctx.sampleRate;
          data[i + j] += (Math.random() * 2 - 1) * Math.exp(-1200 * t) * 0.08;
        }
      }
      
      // C) Asentamiento sordo de brasas (Crujido bajo ocasional)
      else if (rand > 0.99996) {
        const popLen = Math.min(bufferSize - i, Math.round(ctx.sampleRate * 0.025)); // 25ms
        const pitch = 180 + Math.random() * 60; // tono de asentamiento bajo
        for (let j = 0; j < popLen; j++) {
          const t = j / ctx.sampleRate;
          data[i + j] += Math.sin(2 * Math.PI * pitch * t) * Math.exp(-120 * t) * 0.08;
        }
      }
    }
    
    return buffer;
  }

  private createForestBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 3; // 3 segundos
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Ruido de viento suave de fondo
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.015 * white)) / 1.015;
      lastOut = data[i];
      data[i] *= 0.3; // muy tenue
    }
    
    // Agregar píos de aves simulados por oscilaciones moduladas
    const birdTimes = [Math.round(ctx.sampleRate * 0.5), Math.round(ctx.sampleRate * 2.0)];
    for (const startTime of birdTimes) {
      const chirpDuration = Math.round(ctx.sampleRate * 0.15); // 150ms
      for (let j = 0; j < chirpDuration; j++) {
        const t = j / ctx.sampleRate;
        const freq = 2800 + 700 * Math.sin(2 * Math.PI * 4 * t);
        const chirpVal = Math.sin(2 * Math.PI * freq * t) * Math.sin(Math.PI * (j / chirpDuration)) * 0.15;
        data[startTime + j] += chirpVal;
      }
    }
    
    return buffer;
  }

  private createOceanWavesBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4; // 4 segundos de ciclo
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      
      const waveFreq = (2 * Math.PI * i) / bufferSize;
      const waveMod = 0.3 + 0.7 * Math.sin(waveFreq); // oscila entre 0.3 y 1.0
      data[i] *= waveMod * 2.0;
    }
    return buffer;
  }

  private createDigitalClockBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 1; // 1 segundo (1 pulso sutil por segundo)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    const duration = Math.round(ctx.sampleRate * 0.012); // 12ms ultra suave
    for (let i = 0; i < duration; i++) {
      const t = i / ctx.sampleRate;
      const tone1 = Math.sin(2 * Math.PI * 1050 * t);
      const tone2 = Math.sin(2 * Math.PI * 1400 * t) * 0.35;
      const env = Math.exp(-380 * t);
      data[i] = (tone1 + tone2) * env * 0.22;
    }
    return buffer;
  }

  private createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
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
      data[i] = pink * 0.16;
    }
    return buffer;
  }

  private createWindBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4; // 4 segundos
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.008 * white)) / 1.008;
      lastOut = data[i];
      const mod = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((2 * Math.PI * 0.25 * i) / ctx.sampleRate));
      data[i] *= mod * 1.8;
    }
    return buffer;
  }

  private createKeyboardBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4; // 4 segundos
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const keyTimes = [0.15, 0.38, 0.62, 0.85, 1.25, 1.45, 1.70, 2.05, 2.30, 2.55, 2.90, 3.20, 3.50, 3.75];
    
    for (const sec of keyTimes) {
      const startIdx = Math.round(sec * ctx.sampleRate);
      const clickDuration = Math.round(ctx.sampleRate * 0.018); // 18ms
      const basePitch = 420 + Math.random() * 180;
      
      for (let j = 0; j < clickDuration; j++) {
        if (startIdx + j >= bufferSize) break;
        const t = j / ctx.sampleRate;
        const click = Math.sin(2 * Math.PI * basePitch * t) * Math.exp(-220 * t);
        const texture = (Math.random() * 2 - 1) * Math.exp(-400 * t) * 0.15;
        data[startIdx + j] += (click + texture) * 0.22;
      }
    }
    return buffer;
  }

  getBackgroundSoundLabel(sound: string): string {
    const found = this.backgroundSoundsList.find(s => s.id === sound);
    return found ? found.name : 'Silencio';
  }

  getEndSessionSoundLabel(sound: string): string {
    const found = this.endSessionSoundsList.find(s => s.id === sound);
    return found ? found.name : 'Tone';
  }

  updateBackgroundSound(sound: string) {
    this.backgroundSound.set(sound);
    localStorage.setItem('focus-bg-sound', sound);
    
    // Limpiar timeout de prueba previa si existía
    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
      this.previewSoundTimeout = null;
    }
    this.isPlayingPreview.set(false);
    this.stopBackgroundSound();

    if (sound === 'off') return;

    // Si el pomodoro está actualmente activo y corriendo, reproducir continuo
    if (this.timerRunning() && this.arenaState() === 'active' && !this.isBreak() && !this.emergencyPauseActive()) {
      this.startBackgroundAudio(sound);
      return;
    }

    // Si está en setup o pausa, reproducir vista previa de prueba por 4 segundos
    this.isPlayingPreview.set(true);
    this.startBackgroundAudio(sound);

    this.previewSoundTimeout = setTimeout(() => {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewSoundTimeout = null;
    }, 4000);
  }

  updateBreakBackgroundSound(sound: string) {
    this.breakBackgroundSound.set(sound);
    localStorage.setItem('focus-break-bg-sound', sound);
    
    // Limpiar timeout de prueba previa si existía
    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
      this.previewSoundTimeout = null;
    }
    this.isPlayingPreview.set(false);
    this.stopBackgroundSound();

    if (sound === 'off') return;

    // Si el descanso está actualmente activo y corriendo, reproducir continuo
    if (this.timerRunning() && this.arenaState() === 'active' && this.isBreak() && !this.emergencyPauseActive()) {
      this.startBackgroundAudio(sound);
      return;
    }

    // Si no está corriendo en descanso, reproducir vista previa de prueba por 4 segundos
    this.isPlayingPreview.set(true);
    this.startBackgroundAudio(sound);

    this.previewSoundTimeout = setTimeout(() => {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewSoundTimeout = null;
    }, 4000);
  }

  updateLongBreakBackgroundSound(sound: string) {
    this.longBreakBackgroundSound.set(sound);
    localStorage.setItem('focus-long-break-bg-sound', sound);
    
    // Limpiar timeout de prueba previa si existía
    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
      this.previewSoundTimeout = null;
    }
    this.isPlayingPreview.set(false);
    this.stopBackgroundSound();

    if (sound === 'off') return;

    const isLongBreak = this.isBreak() && this.completedPomodoros() > 0 && (this.completedPomodoros() % this.longBreakInterval() === 0);
    if (this.timerRunning() && this.arenaState() === 'active' && isLongBreak && !this.emergencyPauseActive()) {
      this.startBackgroundAudio(sound);
      return;
    }

    this.isPlayingPreview.set(true);
    this.startBackgroundAudio(sound);

    this.previewSoundTimeout = setTimeout(() => {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewSoundTimeout = null;
    }, 4000);
  }

  private startBackgroundAudio(sound: string) {
    if (sound === 'off') return;
    this.stopBackgroundSound();

    const soundOption = this.backgroundSoundsList.find(s => s.id === sound);
    if (!soundOption) return;

    try {
      if (soundOption.type === 'file' && soundOption.file) {
        const audio = new Audio('assets/sounds/' + soundOption.file);
        audio.loop = true;
        audio.volume = this.backgroundVolume();
        audio.play().catch(e => console.warn('Audio play background error:', e));
        this.currentBackgroundAudio = audio;
      } else if (soundOption.type === 'ticking' && soundOption.files && soundOption.files.length > 0) {
        let tickIdx = 0;
        const playTick = () => {
          const file = soundOption.files![tickIdx % soundOption.files!.length];
          tickIdx++;
          const a = new Audio('assets/sounds/' + file);
          a.volume = this.backgroundVolume();
          a.play().catch(() => {});
        };
        playTick();
        this.tickingInterval = setInterval(playTick, 1000);
      } else if (soundOption.type === 'synth') {
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
        } else if (sound === 'reloj_digital') {
          buffer = this.createDigitalClockBuffer(this.backgroundAudioCtx);
        } else if (sound === 'fogata') {
          buffer = this.createCampfireBuffer(this.backgroundAudioCtx);
        } else if (sound === 'bosque') {
          buffer = this.createForestBuffer(this.backgroundAudioCtx);
        } else if (sound === 'viento') {
          buffer = this.createWindBuffer(this.backgroundAudioCtx);
        } else if (sound === 'teclado') {
          buffer = this.createKeyboardBuffer(this.backgroundAudioCtx);
        } else if (sound === 'ruido_rosa') {
          buffer = this.createPinkNoiseBuffer(this.backgroundAudioCtx);
        } else {
          buffer = this.createOceanWavesBuffer(this.backgroundAudioCtx);
        }

        this.backgroundSource = this.backgroundAudioCtx.createBufferSource();
        this.backgroundSource.buffer = buffer;
        this.backgroundSource.loop = true;

        this.backgroundGain = this.backgroundAudioCtx.createGain();
        this.backgroundGain.gain.value = this.backgroundVolume();

        if (sound === 'lluvia' || sound === 'viento') {
          const filter = this.backgroundAudioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = sound === 'viento' ? 600 : 1400;
          this.backgroundSource.connect(filter);
          filter.connect(this.backgroundGain);
        } else {
          this.backgroundSource.connect(this.backgroundGain);
        }

        this.backgroundGain.connect(this.backgroundAudioCtx.destination);
        this.backgroundSource.start(0);
      }
    } catch (e) {
      console.error('Error al iniciar audio de fondo:', e);
    }
  }

  updateBackgroundVolume(vol: number) {
    this.backgroundVolume.set(vol);
    localStorage.setItem('focus-bg-volume', vol.toString());
    if (this.currentBackgroundAudio) {
      this.currentBackgroundAudio.volume = vol;
    }
    if (this.backgroundGain) {
      this.backgroundGain.gain.setValueAtTime(vol, this.backgroundAudioCtx ? this.backgroundAudioCtx.currentTime : 0);
    }
  }

  stopBackgroundSound() {
    if (this.currentBackgroundAudio) {
      try {
        this.currentBackgroundAudio.pause();
        this.currentBackgroundAudio.currentTime = 0;
      } catch (e) {}
      this.currentBackgroundAudio = null;
    }
    if (this.tickingInterval) {
      clearInterval(this.tickingInterval);
      this.tickingInterval = null;
    }
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

  togglePreviewBackgroundSound() {
    if (this.isPlayingPreview()) {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      if (this.previewSoundTimeout) {
        clearTimeout(this.previewSoundTimeout);
        this.previewSoundTimeout = null;
      }
      return;
    }

    if (this.backgroundSound() === 'off') {
      this.updateBackgroundSound('lluvia');
      return;
    }

    this.isPlayingPreview.set(true);
    this.startBackgroundAudio(this.backgroundSound());

    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
    }
    this.previewSoundTimeout = setTimeout(() => {
      if (this.isPlayingPreview() && (!this.timerRunning() || this.arenaState() !== 'active')) {
        this.stopBackgroundSound();
        this.isPlayingPreview.set(false);
      }
      this.previewSoundTimeout = null;
    }, 8000);
  }

  togglePreviewBreakBackgroundSound() {
    if (this.isPlayingPreview()) {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      if (this.previewSoundTimeout) {
        clearTimeout(this.previewSoundTimeout);
        this.previewSoundTimeout = null;
      }
      return;
    }

    if (this.breakBackgroundSound() === 'off') {
      this.updateBreakBackgroundSound('olas');
      return;
    }

    this.isPlayingPreview.set(true);
    this.startBackgroundAudio(this.breakBackgroundSound());

    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
    }
    this.previewSoundTimeout = setTimeout(() => {
      if (this.isPlayingPreview() && (!this.timerRunning() || this.arenaState() !== 'active')) {
        this.stopBackgroundSound();
        this.isPlayingPreview.set(false);
      }
      this.previewSoundTimeout = null;
    }, 8000);
  }

  togglePreviewLongBreakBackgroundSound() {
    if (this.isPlayingPreview()) {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      if (this.previewSoundTimeout) {
        clearTimeout(this.previewSoundTimeout);
        this.previewSoundTimeout = null;
      }
      return;
    }

    if (this.longBreakBackgroundSound() === 'off') {
      this.updateLongBreakBackgroundSound('bosque');
      return;
    }

    this.isPlayingPreview.set(true);
    this.startBackgroundAudio(this.longBreakBackgroundSound());

    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
    }
    this.previewSoundTimeout = setTimeout(() => {
      if (this.isPlayingPreview() && (!this.timerRunning() || this.arenaState() !== 'active')) {
        this.stopBackgroundSound();
        this.isPlayingPreview.set(false);
      }
      this.previewSoundTimeout = null;
    }, 8000);
  }

  toggleFocusSound(enabled: boolean) {
    this.soundEnabled.set(enabled);
    localStorage.setItem('focus-sound-enabled', String(enabled));
  }

  toggleBreakSound(enabled: boolean) {
    this.breakSoundEnabled.set(enabled);
    localStorage.setItem('focus-break-sound-enabled', String(enabled));
  }

  setEndSessionSound(soundId: string) {
    this.endSessionSound.set(soundId);
    localStorage.setItem('focus-end-sound', soundId);
    this.previewAlarmSound(soundId);
  }

  setBreakEndSound(soundId: string) {
    this.breakEndSound.set(soundId);
    localStorage.setItem('focus-break-sound', soundId);
    this.previewAlarmSound(soundId);
  }

  setLongBreakEndSound(soundId: string) {
    this.longBreakEndSound.set(soundId);
    localStorage.setItem('focus-long-break-sound', soundId);
    this.previewAlarmSound(soundId);
  }

  previewAlarmSound(soundId: string) {
    const sound = this.endSessionSoundsList.find(s => s.id === soundId);
    if (!sound) return;
    try {
      if (this.currentEndAudio) {
        this.currentEndAudio.pause();
        this.currentEndAudio = null;
      }
      const audio = new Audio('assets/sounds/' + sound.file);
      audio.volume = 1.0;
      audio.play().catch(e => console.warn('Preview alarm error:', e));
      this.currentEndAudio = audio;
    } catch (e) {}
  }

  playFocusAlarm() {
    if (!this.soundEnabled()) return;
    this.previewAlarmSound(this.endSessionSound());
  }

  playBreakAlarm() {
    if (!this.breakSoundEnabled()) return;
    this.previewAlarmSound(this.breakEndSound());
  }

  playLongBreakAlarm() {
    if (!this.breakSoundEnabled()) return;
    this.previewAlarmSound(this.longBreakEndSound());
  }

  // ==================== INTERACCIONES DEL CUSTOM SELECT MODERNO ====================
  toggleBgDropdown(event?: Event) {
    if (event) event.stopPropagation();
    const curr = this.isBgDropdownOpen();
    this.closeAllSoundDropdowns();
    this.isBgDropdownOpen.set(!curr);
  }

  toggleBreakBgDropdown(event?: Event) {
    if (event) event.stopPropagation();
    const curr = this.isBreakBgDropdownOpen();
    this.closeAllSoundDropdowns();
    this.isBreakBgDropdownOpen.set(!curr);
  }

  toggleLongBreakBgDropdown(event?: Event) {
    if (event) event.stopPropagation();
    const curr = this.isLongBreakBgDropdownOpen();
    this.closeAllSoundDropdowns();
    this.isLongBreakBgDropdownOpen.set(!curr);
  }

  toggleFocusAlarmDropdown(event?: Event) {
    if (event) event.stopPropagation();
    const curr = this.isFocusAlarmDropdownOpen();
    this.closeAllSoundDropdowns();
    this.isFocusAlarmDropdownOpen.set(!curr);
  }

  toggleBreakAlarmDropdown(event?: Event) {
    if (event) event.stopPropagation();
    const curr = this.isBreakAlarmDropdownOpen();
    this.closeAllSoundDropdowns();
    this.isBreakAlarmDropdownOpen.set(!curr);
  }

  toggleLongBreakAlarmDropdown(event?: Event) {
    if (event) event.stopPropagation();
    const curr = this.isLongBreakAlarmDropdownOpen();
    this.closeAllSoundDropdowns();
    this.isLongBreakAlarmDropdownOpen.set(!curr);
  }

  // Aliases for dropdown toggle methods
  toggleBgSoundDropdown(event?: Event) {
    this.toggleBgDropdown(event);
  }

  toggleBreakBgSoundDropdown(event?: Event) {
    this.toggleBreakBgDropdown(event);
  }

  toggleLongBreakBgSoundDropdown(event?: Event) {
    this.toggleLongBreakBgDropdown(event);
  }

  toggleAlarmDropdown(event?: Event) {
    this.toggleFocusAlarmDropdown(event);
  }

  closeAllSoundDropdowns() {
    this.isBgDropdownOpen.set(false);
    this.isBreakBgDropdownOpen.set(false);
    this.isLongBreakBgDropdownOpen.set(false);
    this.isFocusAlarmDropdownOpen.set(false);
    this.isBreakAlarmDropdownOpen.set(false);
    this.isLongBreakAlarmDropdownOpen.set(false);
  }

  selectBgSound(soundId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.updateBackgroundSound(soundId);
    this.isBgDropdownOpen.set(false);
    this.previewingSoundId.set(null);
  }

  selectBreakBgSound(soundId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.updateBreakBackgroundSound(soundId);
    this.isBreakBgDropdownOpen.set(false);
    this.previewingSoundId.set(null);
  }

  selectLongBreakBgSound(soundId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.updateLongBreakBackgroundSound(soundId);
    this.isLongBreakBgDropdownOpen.set(false);
    this.previewingSoundId.set(null);
  }

  selectFocusAlarm(soundId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.setEndSessionSound(soundId);
    this.isFocusAlarmDropdownOpen.set(false);
  }

  selectAlarmSound(soundId: string, event?: Event) {
    this.selectFocusAlarm(soundId, event);
  }

  selectBreakAlarm(soundId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.setBreakEndSound(soundId);
    this.isBreakAlarmDropdownOpen.set(false);
  }

  selectLongBreakAlarm(soundId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.setLongBreakEndSound(soundId);
    this.isLongBreakAlarmDropdownOpen.set(false);
  }

  previewSpecificBgSound(soundId: string, event?: Event) {
    if (event) event.stopPropagation();
    
    if (this.previewingSoundId() === soundId && this.isPlayingPreview()) {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewingSoundId.set(null);
      if (this.previewSoundTimeout) {
        clearTimeout(this.previewSoundTimeout);
        this.previewSoundTimeout = null;
      }
      return;
    }

    if (soundId === 'off') {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewingSoundId.set(null);
      return;
    }

    this.isPlayingPreview.set(true);
    this.previewingSoundId.set(soundId);
    this.startBackgroundAudio(soundId);

    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
    }
    this.previewSoundTimeout = setTimeout(() => {
      if (this.previewingSoundId() === soundId) {
        this.stopBackgroundSound();
        this.isPlayingPreview.set(false);
        this.previewingSoundId.set(null);
      }
      this.previewSoundTimeout = null;
    }, 6000);
  }

  getCategoryInfo(cat: 'natural' | 'urbano' | 'reloj' | 'sintetico' | string) {
    switch (cat) {
      case 'natural':
        return { name: 'Naturaleza HQ', icon: 'fa-tree', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'urbano':
        return { name: 'Ciudad & Cafés', icon: 'fa-mug-hot', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'reloj':
        return { name: 'Tic-Tac Rítmico', icon: 'fa-clock', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
      case 'sintetico':
        return { name: 'Zen & ASMR', icon: 'fa-sparkles', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' };
      default:
        return { name: 'Frecuencia', icon: 'fa-headphones', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)' };
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-sound-select-box')) {
      this.closeAllSoundDropdowns();
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.membership.isFocusActive()) {
      event.preventDefault();
      event.returnValue = 'Tienes una sesión de concentración activa. Si sales, se cancelará o pausará tu progreso.';
      return event.returnValue;
    }
    return undefined;
  }

  ngOnDestroy() {
    this.stopTitleFlashing();
    if (!this.timerRunning() || this.isBreak()) {
      this.membership.isFocusActive.set(false);
    }
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    if (this.previewSoundTimeout) clearTimeout(this.previewSoundTimeout);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.communityInterval) clearInterval(this.communityInterval);
    if (this.bodyDoublingInterval) clearInterval(this.bodyDoublingInterval);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

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
      if (this.arenaState() === 'active') {
        this.isInactive.set(true);
      }
    }, 3000); // 3 segundos tras salir de la ventana se activa el modo Zen
  }

  private resetInactivityTimer() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    this.inactivityTimeout = setTimeout(() => {
      if (this.arenaState() === 'active') {
        this.isInactive.set(true);
      }
    }, 6000); // 6 segundos de inactividad física
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
    this.clearPersistedSession();
    this.stopTimerLoop();
    this.timeLeft.set(this.totalSessionTime());
  }

  selectMode(mode: 'focus' | 'break') {
    this.clearPersistedSession();
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
    localStorage.setItem('focus-duration', String(this.focusDuration()));
    localStorage.setItem('break-duration', String(this.breakDuration()));
    localStorage.setItem('long-break-interval', String(this.longBreakInterval()));
    localStorage.setItem('long-break-duration', String(this.longBreakDuration()));

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

  updateFocusDuration(val: number | string) {
    const num = Math.min(180, Math.max(1, parseInt(String(val), 10) || 25));
    this.focusDuration.set(num);
    this.applyTimeSettings();
  }

  updateBreakDuration(val: number | string) {
    const num = Math.min(60, Math.max(1, parseInt(String(val), 10) || 5));
    this.breakDuration.set(num);
    this.applyTimeSettings();
  }

  updateLongBreakDuration(val: number | string) {
    const num = Math.min(120, Math.max(1, parseInt(String(val), 10) || 15));
    this.longBreakDuration.set(num);
    this.applyTimeSettings();
  }

  updateLongBreakInterval(val: number | string) {
    const num = Math.min(24, Math.max(1, parseInt(String(val), 10) || 4));
    this.longBreakInterval.set(num);
    this.applyTimeSettings();
  }

  // Setter auxiliar de tipo de sonido
  setSoundType(type: 'zen' | 'digital' | 'chime') {
    this.soundType.set(type);
    this.playAlarmTone();
  }

  // Setter de fondo de pantalla Zen con restricciones temáticas
  setBackground(bg: FocusBackgroundType) {
    // El fondo Océano Estelar es exclusivo del Faro
    if (bg === 'lofi_lighthouse_ocean' && this.timerStyle() !== 'lighthouse') {
      return;
    }
    // Si el cronómetro activo es El Faro, solo se permite Océano Estelar
    if (this.timerStyle() === 'lighthouse' && bg !== 'lofi_lighthouse_ocean') {
      return;
    }
    // El fondo Mar es exclusivo e inseparable del Titanic
    if (bg === 'lofi_titanic_ocean' && this.timerStyle() !== 'titanic') {
      return;
    }
    // Si el cronómetro activo es el Titanic, solo se permite Mar
    if (this.timerStyle() === 'titanic' && bg !== 'lofi_titanic_ocean') {
      return;
    }
    // Si el cronómetro activo es de órbitas (Sol, Satélite, Luna), solo se permiten Espacio, Nebulosa y Lunar
    if (this.isOrbitalTimer() && bg !== 'lofi_space_cosmos' && bg !== 'lofi_space_nebula' && bg !== 'lofi_space_moon') {
      return;
    }
    this.activeBackground.set(bg);
    localStorage.setItem('focus-active-bg', bg);
    this.activeVideoLayer.set('A');
    this.isCrossfading = false;

    if (this.isVideoBackground()) {
      setTimeout(() => {
        if (this.bgVideoARef?.nativeElement) {
          this.bgVideoARef.nativeElement.currentTime = 0;
          this.bgVideoARef.nativeElement.muted = true;
          this.bgVideoARef.nativeElement.volume = 0;
          this.bgVideoARef.nativeElement.play().catch(() => {});
        }
      }, 50);
    }
  }

  // Garantiza 0 volumen y silencio absoluto en la carga del video
  onVideoLoaded(event: Event) {
    const video = event.target as HTMLVideoElement;
    if (video) {
      video.muted = true;
      video.volume = 0;
      video.play().catch(() => {});
    }
  }

  // Motor de Bucle Continuo Imperceptible: Crossfade dinámico de capas A/B
  onVideoTimeUpdate(event: Event, layer: 'A' | 'B') {
    if (this.activeVideoLayer() !== layer || this.isCrossfading) {
      return;
    }
    const currentVideo = event.target as HTMLVideoElement;
    if (!currentVideo || !currentVideo.duration) return;

    currentVideo.muted = true;
    currentVideo.volume = 0;

    const remainingTime = currentVideo.duration - currentVideo.currentTime;
    // Disparar la transición suave 0.45s antes del final del clip para eliminar saltos
    if (remainingTime <= 0.45 && remainingTime > 0.05) {
      this.isCrossfading = true;
      const nextLayer = layer === 'A' ? 'B' : 'A';
      const nextVideo = nextLayer === 'A' ? this.bgVideoARef?.nativeElement : this.bgVideoBRef?.nativeElement;
      
      if (nextVideo) {
        nextVideo.currentTime = 0;
        nextVideo.muted = true;
        nextVideo.volume = 0;
        nextVideo.play().catch(() => {});
        this.activeVideoLayer.set(nextLayer);

        setTimeout(() => {
          this.isCrossfading = false;
        }, 500);
      } else {
        this.isCrossfading = false;
      }
    }
  }

  onVideoEnded(event: Event, layer: 'A' | 'B') {
    const video = event.target as HTMLVideoElement;
    if (video) {
      video.currentTime = 0;
      video.muted = true;
      video.volume = 0;
      video.play().catch(() => {});
    }
  }

  // Obtener URL de miniatura del fondo de pantalla Zen
  getBackgroundThumbnailUrl(bg: string): string {
    if (bg === 'lofi_cat_window') return 'assets/themes/lofi_cat_window_thumb.webp';
    if (bg === 'lofi_cat_rain') return 'assets/themes/lofi_cat_rain_thumb.webp';
    if (bg === 'lofi_cat_sun') return 'assets/themes/lofi_cat_sun_thumb.webp';
    if (bg === 'lofi_car_ride') return 'assets/themes/lofi_car_ride_thumb.webp';
    if (bg === 'theme_autumn') return 'assets/themes/autumn_thumb.webp';
    if (bg === 'theme_sunset') return 'assets/themes/sunset_thumb.webp';
    if (bg === 'theme_aninditaerina_lofi') return 'assets/themes/aninditaerina-lofi_thumb.webp';
    if (bg === 'fairy') return 'assets/themes/fairy_world_thumb.webp';
    if (bg === 'lofi_study_desktop') return 'assets/themes/lofi_study_desktop_thumb.webp';
    if (bg === 'lofi_moons') return 'assets/themes/lofi_moons_thumb.webp';
    if (bg === 'theme_airplane') return 'assets/themes/airplane_thumb.webp';
    if (bg === 'theme_tunezoro') return 'assets/themes/tunezoro_thumb.webp';
    if (bg === 'theme_tunezoro2') return 'assets/themes/tunezoro2_thumb.webp';
    if (bg === 'theme_tunezoro_anime') return 'assets/themes/tunezoro_anime_thumb.webp';
    if (bg === 'lofi_space_cosmos') return 'assets/themes/lofi_space_cosmos_thumb.webp';
    if (bg === 'lofi_space_nebula') return 'assets/themes/lofi_space_nebula_thumb.webp';
    if (bg === 'lofi_space_moon') return 'assets/themes/lofi_space_moon_thumb.webp';
    if (bg === 'lofi_titanic_ocean') return 'assets/themes/lofi_space_cosmos_thumb.webp';
    if (bg === 'lofi_lighthouse_ocean') return 'assets/themes/lofi_space_cosmos_thumb.webp';
    return '';
  }

  // Nombre legible del fondo en selector
  getBackgroundLabel(bg: string): string {
    switch (bg) {
      case 'off': return 'Apagado';
      case 'lofi_cat_window': return 'Gato Ventana';
      case 'lofi_cat_rain': return 'Gatito Lluvia';
      case 'lofi_cat_sun': return 'Gatito Sol';
      case 'lofi_car_ride': return 'Viaje en Auto';
      case 'theme_autumn': return 'Otoño Lofi';
      case 'theme_sunset': return 'Atardecer Dorado';
      case 'theme_aninditaerina_lofi': return 'Anindita Erina';
      case 'fairy': return 'Fairy';
      case 'lofi_study_desktop': return 'Estudio';
      case 'lofi_moons': return 'Luna';
      case 'theme_airplane': return 'Aeronave';
      case 'theme_tunezoro': return 'Tunezoro';
      case 'theme_tunezoro2': return 'Tunezoro II';
      case 'theme_tunezoro_anime': return 'Zoro Anime';
      case 'lofi_space_cosmos': return 'Espacio';
      case 'lofi_space_nebula': return 'Nebulosa';
      case 'lofi_space_moon': return 'Luz Lunar';
      case 'lofi_titanic_ocean': return 'Mar';
      case 'lofi_lighthouse_ocean': return 'Océano Estelar';
      default: return bg;
    }
  }

  // Descripción textual del fondo activo
  getBackgroundActiveDescription(): string {
    const bg = this.activeBackground();
    if (bg === 'off') return 'Fondo por defecto del tema activo';
    switch (bg) {
      case 'lofi_cat_window': return 'Fondo interactivo en video HD "Gato Ventana Lofi" con bucle continuo imperceptible';
      case 'lofi_cat_rain': return 'Fondo interactivo en video HD "Gatito Lluvia Lofi" con bucle continuo imperceptible';
      case 'lofi_cat_sun': return 'Fondo interactivo en video HD "Gatito Sol Lofi" con bucle continuo imperceptible';
      case 'lofi_car_ride': return 'Fondo interactivo en video HD "Viaje en Auto Lofi" con bucle continuo imperceptible';
      case 'theme_autumn': return 'Fondo artístico Ultra HD "Bosque y Calle de Otoño Lofi"';
      case 'theme_sunset': return 'Fondo artístico Ultra HD "Atardecer Dorado en la Ciudad Lofi"';
      case 'theme_aninditaerina_lofi': return 'Fondo artístico Ultra HD "Anindita Erina Lofi"';
      case 'fairy': return 'Fondo lofi "Fairy" activo';
      case 'lofi_study_desktop': return 'Fondo lofi "Estudio" activo';
      case 'lofi_moons': return 'Fondo lofi "Luna" activo';
      case 'theme_airplane': return 'Fondo artístico Ultra HD "Aeronave / Cabina de Vuelo"';
      case 'theme_tunezoro': return 'Fondo artístico Ultra HD "Tunezoro"';
      case 'theme_tunezoro2': return 'Fondo artístico Ultra HD "Tunezoro II"';
      case 'theme_tunezoro_anime': return 'Fondo artístico Ultra HD "Zoro Anime"';
      case 'lofi_space_cosmos': return 'Fondo lofi "Espacio Cósmico con Saturno y Luceros" activo con aura cósmica';
      case 'lofi_space_nebula': return 'Fondo lofi "Nebulosa Cósmica" activo con aura cósmica';
      case 'lofi_space_moon': return 'Fondo lofi "Polvo Lunar y Vía Láctea" activo con aura cósmica';
      case 'lofi_titanic_ocean': return 'Fondo lofi "Mar y Cielo Nocturno" activo con aura cósmica';
      case 'lofi_lighthouse_ocean': return 'Fondo lofi "Océano Cósmico y Cielo Estelar" activo con aura cósmica';
      default: return `Fondo "${bg}" activo`;
    }
  }

  // Información de nivel de complejidad y monetización del estilo de cronómetro (Todos 100% libres y desbloqueados)
  getTimerStyleTier(style: string): { label: string; class: string; icon: string; color: string; bg: string; type: 'free' | 'coins' | 'premium' } {
    return { label: 'GRATIS', class: 'tier-free', icon: 'fa-lock-open', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', type: 'free' };
  }

  // Verificación si un estilo está bloqueado por monedas o membresía (Todos desbloqueados)
  isTimerStyleLocked(style: string): boolean {
    return false;
  }

  // Estado del modal de desbloqueo con monedas
  coinTimerToUnlock = signal<{ id: string; name: string; cost: number } | null>(null);

  confirmUnlockWithCoins() {
    const item = this.coinTimerToUnlock();
    if (!item) return;
    this.setTimerStyle(item.id as FocusTimerStyle);
    this.coinTimerToUnlock.set(null);
  }

  closeCoinUnlockModal() {
    this.coinTimerToUnlock.set(null);
  }

  goToMembership() {
    this.showPaywallModal.set(false);
    this.router.navigate(['/membresia']);
  }

  // Setter del estilo de cronómetro Zen (100% libre para todos)
  setTimerStyle(style: FocusTimerStyle) {
    this.timerStyle.set(style);
    localStorage.setItem('focus-timer-style', style);

    // Auto-asignación y validación de fondos según el cronómetro
    if (style === 'lighthouse') {
      this.activeBackground.set('lofi_lighthouse_ocean');
      localStorage.setItem('focus-active-bg', 'lofi_lighthouse_ocean');
    } else if (style === 'titanic') {
      this.activeBackground.set('lofi_titanic_ocean');
      localStorage.setItem('focus-active-bg', 'lofi_titanic_ocean');
    } else {
      // Si se cambia a cualquier otro reloj que no sea marítimo y el fondo actual es marítimo exclusivo, reasignar
      if (this.activeBackground() === 'lofi_titanic_ocean' || this.activeBackground() === 'lofi_lighthouse_ocean') {
        if (style === 'solar') {
          this.activeBackground.set('lofi_space_cosmos');
          localStorage.setItem('focus-active-bg', 'lofi_space_cosmos');
        } else if (style === 'satellite') {
          this.activeBackground.set('lofi_space_nebula');
          localStorage.setItem('focus-active-bg', 'lofi_space_nebula');
        } else if (style === 'moon') {
          this.activeBackground.set('lofi_space_moon');
          localStorage.setItem('focus-active-bg', 'lofi_space_moon');
        } else {
          this.activeBackground.set('theme_autumn');
          localStorage.setItem('focus-active-bg', 'theme_autumn');
        }
      } else {
        if (style === 'solar') {
          const cur = this.activeBackground();
          if (cur !== 'lofi_space_cosmos' && cur !== 'lofi_space_nebula' && cur !== 'lofi_space_moon') {
            this.setBackground('lofi_space_cosmos');
          }
        } else if (style === 'satellite') {
          const cur = this.activeBackground();
          if (cur !== 'lofi_space_cosmos' && cur !== 'lofi_space_nebula' && cur !== 'lofi_space_moon') {
            this.setBackground('lofi_space_nebula');
          }
        } else if (style === 'moon') {
          const cur = this.activeBackground();
          if (cur !== 'lofi_space_cosmos' && cur !== 'lofi_space_nebula' && cur !== 'lofi_space_moon') {
            this.setBackground('lofi_space_moon');
          }
        }
      }
    }

    if (style === 'fire') {
      this.showCampfireDragTooltip.set(true);
      setTimeout(() => {
        this.showCampfireDragTooltip.set(false);
      }, 8000);
    } else {
      this.showCampfireDragTooltip.set(false);
    }

    // Si el nuevo estilo no es arrastrable, centrarlo limpiamente a (0, 0)
    if (!this.isDraggableTimer()) {
      this.campfireX.set(0);
      this.campfireY.set(0);
    }
  }

  private clearPersistedSession() {
    localStorage.removeItem('focus-session-target-end');
    localStorage.removeItem('focus-session-total-duration');
    localStorage.removeItem('focus-session-is-break');
    localStorage.removeItem('focus-session-objective');
    localStorage.removeItem('focus-session-idea-id');
    localStorage.removeItem('focus-session-methodology');
    localStorage.removeItem('focus-session-coworking');
    localStorage.removeItem('focus-session-energy');
    localStorage.removeItem('focus-session-started-at');
    localStorage.removeItem('focus-session-nonce');
    this.currentSessionNonceId = null;
  }

  private persistSessionState() {
    const targetEndTime = Date.now() + this.timeLeft() * 1000;
    localStorage.setItem('focus-session-target-end', targetEndTime.toString());
    localStorage.setItem('focus-session-total-duration', this.totalSessionTime().toString());
    localStorage.setItem('focus-session-is-break', this.isBreak().toString());
    localStorage.setItem('focus-session-objective', this.activeObjective());
    if (this.associatedIdeaId()) {
      localStorage.setItem('focus-session-idea-id', this.associatedIdeaId()!);
    } else {
      localStorage.removeItem('focus-session-idea-id');
    }
    localStorage.setItem('focus-session-methodology', this.activeMethodology());
    localStorage.setItem('focus-session-coworking', this.coworkingMode());
    localStorage.setItem('focus-session-energy', this.energyLevel());
    if (!this.currentSessionNonceId) {
      this.currentSessionNonceId = localStorage.getItem('focus-session-nonce') || this.generateUUID();
    }
    localStorage.setItem('focus-session-nonce', this.currentSessionNonceId);
    if (!localStorage.getItem('focus-session-started-at')) {
      localStorage.setItem('focus-session-started-at', Date.now().toString());
    }
  }

  checkAndRestoreActiveSession() {
    const targetEndStr = localStorage.getItem('focus-session-target-end');
    if (!targetEndStr) return;

    const targetEndTime = parseInt(targetEndStr, 10);
    if (isNaN(targetEndTime)) {
      this.clearPersistedSession();
      return;
    }

    const savedNonce = localStorage.getItem('focus-session-nonce');
    if (savedNonce) {
      this.currentSessionNonceId = savedNonce;
    }

    const now = Date.now();
    const remaining = Math.round((targetEndTime - now) / 1000);

    const totalDuration = parseInt(localStorage.getItem('focus-session-total-duration') || '1500', 10);
    const isBreak = localStorage.getItem('focus-session-is-break') === 'true';
    const objective = localStorage.getItem('focus-session-objective') || '';
    const ideaId = localStorage.getItem('focus-session-idea-id') || null;
    const methodology = (localStorage.getItem('focus-session-methodology') as any) || 'normal';
    const coworking = (localStorage.getItem('focus-session-coworking') as any) || 'comunitario';
    const energy = (localStorage.getItem('focus-session-energy') as any) || 'medium';

    this.totalSessionTime.set(totalDuration);
    this.isBreak.set(isBreak);
    if (objective) this.activeObjective.set(objective);
    if (ideaId) this.associatedIdeaId.set(ideaId);
    this.activeMethodology.set(methodology);
    this.coworkingMode.set(coworking);
    this.energyLevel.set(energy);

    if (remaining > 0) {
      // Sesión en curso: actualizar el tiempo exacto transcurrido y continuar
      this.timeLeft.set(remaining);
      this.arenaState.set('active');
      if (!isBreak) {
        this.membership.isFocusActive.set(true);
      } else {
        this.membership.isFocusActive.set(false);
      }
      if (!this.timerRunning() && !this.emergencyPauseActive()) {
        this.startTimerLoop(true);
      }
    } else {
      // El tiempo expiró mientras la pestaña estuvo cerrada o en segundo plano
      this.handleTimerCompleted();
    }
  }

  private startSmoothAnimationLoop() {
    this.stopSmoothAnimationLoop();

    const updateLoop = () => {
      if (!this.timerRunning() || this.emergencyPauseActive()) {
        this.animFrameId = null;
        return;
      }

      const now = Date.now();
      this.continuousTimeMs.set(now);

      const targetEndStr = localStorage.getItem('focus-session-target-end');
      if (targetEndStr) {
        const targetEndTime = parseInt(targetEndStr, 10);
        const totalDurationMs = Math.max(1000, this.totalSessionTime() * 1000);
        const startTime = targetEndTime - totalDurationMs;
        const elapsed = Math.max(0, Math.min(totalDurationMs, now - startTime));
        const progress = elapsed / totalDurationMs;
        this.highPrecisionProgress.set(progress);
      } else {
        const total = this.totalSessionTime();
        const left = this.timeLeft();
        const progress = total > 0 ? Math.min(1, Math.max(0, 1 - (left / total))) : 0;
        this.highPrecisionProgress.set(progress);
      }

      this.animFrameId = requestAnimationFrame(updateLoop);
    };

    this.animFrameId = requestAnimationFrame(updateLoop);
  }

  private stopSmoothAnimationLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private startTimerLoop(fromRestore: boolean = false) {
    this.timerRunning.set(true);
    this.startSmoothAnimationLoop();
    if (!this.isBreak()) {
      this.membership.isFocusActive.set(true);
    } else {
      this.membership.isFocusActive.set(false);
    }

    if (!fromRestore) {
      this.persistSessionState();
    }

    if (!this.isBreak()) {
      if (this.backgroundSound() !== 'off' && !this.emergencyPauseActive()) {
        this.startBackgroundAudio(this.backgroundSound());
      }
    } else {
      const isLong = this.completedPomodoros() > 0 && (this.completedPomodoros() % this.longBreakInterval() === 0);
      const soundToPlay = isLong && this.longBreakBackgroundSound() !== 'off' 
        ? this.longBreakBackgroundSound() 
        : this.breakBackgroundSound();
      if (soundToPlay !== 'off' && !this.emergencyPauseActive()) {
        this.startBackgroundAudio(soundToPlay);
      }
    }

    if (this.pomodoroTimer) {
      clearInterval(this.pomodoroTimer);
    }

    this.pomodoroTimer = setInterval(() => {
      const targetEndStr = localStorage.getItem('focus-session-target-end');
      if (targetEndStr) {
        const targetEndTime = parseInt(targetEndStr, 10);
        const now = Date.now();
        const remaining = Math.max(0, Math.round((targetEndTime - now) / 1000));
        this.timeLeft.set(remaining);
        this.updateLiveTabTitle();

        // Simulación en tiempo real del Templo Comunitario
        if (this.coworkingMode() === 'comunitario' && remaining > 0) {
          this.partnerSessionTicks.update(ticks => ticks + 1);
        }

        if (remaining <= 0) {
          this.handleTimerCompleted();
        }
      } else {
        if (this.timeLeft() > 0) {
          this.timeLeft.update(t => t - 1);
          this.updateLiveTabTitle();
          if (this.timeLeft() <= 0) {
            this.handleTimerCompleted();
          }
        } else {
          this.handleTimerCompleted();
        }
      }
    }, 1000);
  }

  private stopTimerLoop() {
    this.timerRunning.set(false);
    this.stopSmoothAnimationLoop();
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

  // Sonido triste / deprimente y melancólico al abandonar la sesión
  playAbandonmentSadSound(forcePlay: boolean = false) {
    if (!forcePlay && !this.abandonSoundEnabled()) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;

      // Secuencia triste descendente menor (Wah-wah-wah-waaaah / Melancolía)
      const notes = [
        { freq: 392.00, start: 0.0, dur: 0.35, vol: 0.28 },  // G4
        { freq: 369.99, start: 0.35, dur: 0.35, vol: 0.28 }, // F#4
        { freq: 349.23, start: 0.70, dur: 0.40, vol: 0.30 }, // F4
        { freq: 311.13, start: 1.10, dur: 1.50, vol: 0.38, slideTo: 185.00 } // Eb4 -> Gb3 (deslizamiento triste prolongado)
      ];

      notes.forEach((n) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        // Onda triangular con filtro para textura melancólica sombría
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.start);

        if (n.slideTo) {
          osc.frequency.exponentialRampToValueAtTime(n.slideTo, now + n.start + n.dur);
        }

        // Envolvente de volumen
        gain.gain.setValueAtTime(0.001, now + n.start);
        gain.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now + n.start);
        if (n.slideTo) {
          filter.frequency.linearRampToValueAtTime(320, now + n.start + n.dur);
        }

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur);
      });

      // Sub-bajo de energía decayendo (Gota de desánimo)
      const subOsc = audioCtx.createOscillator();
      const subGain = audioCtx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now + 1.1);
      subOsc.frequency.exponentialRampToValueAtTime(42, now + 2.5);
      subGain.gain.setValueAtTime(0.001, now + 1.1);
      subGain.gain.linearRampToValueAtTime(0.35, now + 1.2);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

      subOsc.connect(subGain);
      subGain.connect(audioCtx.destination);
      subOsc.start(now + 1.1);
      subOsc.stop(now + 2.6);

    } catch (e) {
      console.warn('Error al reproducir sonido de abandono:', e);
    }
  }

  // Campana / Alerta sonora de fin de sesión configurable
  playAlarmTone() {
    if (!this.soundEnabled()) return;

    const soundId = this.endSessionSound();
    const sound = this.endSessionSoundsList.find(s => s.id === soundId) || this.endSessionSoundsList[0];
    if (sound && sound.file) {
      try {
        const audio = new Audio('assets/sounds/' + sound.file);
        audio.volume = 0.85;
        audio.play().catch(err => console.warn('Alarm audio file play error, fallback to synth:', err));
        return;
      } catch (e) {}
    }

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const type = this.soundType();

      if (type === 'zen') {
        // Cuenco tibetano armónico / campana serena resonante
        [528, 660, 792].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (i * 0.08));
          gain.gain.setValueAtTime(0.18 / (i + 1), audioCtx.currentTime + (i * 0.08));
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.4);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + (i * 0.08));
          osc.stop(audioCtx.currentTime + 2.4);
        });
      } else if (type === 'chime') {
        // Acorde alegre de campanadas (Do Mayor / Mi / Sol / Do agudo)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, index) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (index * 0.12));
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime + (index * 0.12));
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (index * 0.12) + 1.4);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + (index * 0.12));
          osc.stop(audioCtx.currentTime + (index * 0.12) + 1.4);
        });
      } else {
        // Fanfarria digital gamer victoriosa
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, index) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (index * 0.1));
          gain.gain.setValueAtTime(0.09, audioCtx.currentTime + (index * 0.1));
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (index * 0.1) + 0.5);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + (index * 0.1));
          osc.stop(audioCtx.currentTime + (index * 0.1) + 0.5);
        });
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
    this.changeTheme(theme);
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

  showToast(msg: string, type: 'info' | 'warning' | 'success' | 'danger' = 'info') {
    this.partnerNotificationMessage.set(msg);
    this.partnerNotificationType.set(type);
    this.showPartnerNotification.set(true);
    
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      if (this.partnerNotificationMessage() === msg) {
        this.showPartnerNotification.set(false);
      }
    }, 5500);
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
