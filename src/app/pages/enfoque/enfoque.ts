import { Component, signal, computed, effect, OnInit, OnDestroy, WritableSignal, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { SupabaseService, FocusSessionData, IdeaPriority } from '../../services/supabase.service';
import { NotificationService } from '../../services/notification.service';
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
  isNewArrival?: boolean;
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
  | 'space_deep_void'
  | 'space_silent_nebula'
  | 'space_milky_zenith'
  | 'lofi_space_cosmos' 
  | 'lofi_space_nebula' 
  | 'lofi_space_moon' 
  | 'lofi_titanic_ocean' 
  | 'lofi_lighthouse_ocean'
  | 'color_midnight_navy'
  | 'color_espresso_charcoal'
  | 'color_forest_matcha'
  | 'color_executive_burgundy';

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
  | 'airplane'
  | 'lantern';

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
    '[class.timer-airplane-mode]': 'timerStyle() === "airplane"',
    '[class.timer-orbital-mode]': 'isOrbitalTimer()',
    '[class.timer-lantern-mode]': 'timerStyle() === "lantern"'
  }
})
export class Enfoque implements OnInit, OnDestroy {
  public supabaseService = inject(SupabaseService);
  public membership = inject(MembershipService);
  public bossService = inject(ComunidadBossService);
  public notificationService = inject(NotificationService);
  private router = inject(Router);
  currentSessionNonceId: string | null = null;
  isSettlingSession = signal<boolean>(false);

  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  sidebarCollapsed!: any;
  Math = Math;

  constructor() {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;

    // Reloj digital por defecto siempre si el usuario no tiene una preferencia previa guardada
    const savedTimer = this.membership.getFocusSetting('focus-timer-style', 'digital') as FocusTimerStyle;
    if (!savedTimer) {
      this.timerStyle.set('digital');
      this.membership.setFocusSetting('focus-timer-style', 'digital');
    } else {
      this.timerStyle.set(savedTimer);
    }

    // Garantizar que todo usuario tenga un fondo válido (por defecto "theme_autumn" si no hay ninguno)
    const savedBg = this.membership.getFocusSetting('focus-active-bg', 'theme_autumn') as FocusBackgroundType;
    if (!savedBg || !this.backgroundOptions.includes(savedBg)) {
      this.activeBackground.set('theme_autumn');
      this.membership.setFocusSetting('focus-active-bg', 'theme_autumn');
    } else {
      this.activeBackground.set(savedBg);
    }

    // Sincronización reactiva de pomodoro y descanso con las preferencias del usuario
    effect(() => {
      const prefs = this.membership.focusPreferences();
      if (!prefs) return;
      const dur = parseInt(this.membership.getFocusSetting('focus-duration', '25'), 10) || 25;
      const brk = parseInt(this.membership.getFocusSetting('break-duration', '5'), 10) || 5;
      const lBrk = parseInt(this.membership.getFocusSetting('long-break-duration', '15'), 10) || 15;
      const lInt = parseInt(this.membership.getFocusSetting('long-break-interval', '4'), 10) || 4;

      this.focusDuration.set(dur);
      this.breakDuration.set(brk);
      this.longBreakDuration.set(lBrk);
      this.longBreakInterval.set(lInt);

      // Si estamos en modo preparación (setup) y no hay sesión activa corriendo en storage, actualizar el reloj
      if (this.arenaState() === 'setup') {
        const hasRunningTarget = typeof window !== 'undefined' && !!localStorage.getItem('focus-session-target-end');
        if (!hasRunningTarget) {
          if (!this.isBreak()) {
            this.totalSessionTime.set(dur * 60);
            this.timeLeft.set(dur * 60);
          } else {
            const isLong = this.completedPomodoros() > 0 && (this.completedPomodoros() % lInt === 0);
            const breakMins = isLong ? lBrk : brk;
            this.totalSessionTime.set(breakMins * 60);
            this.timeLeft.set(breakMins * 60);
          }
        }
      }
    });
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
    this.membership.getFocusSetting('focus-bg-sound', 'off')
  );

  // Sonido de fondo para el Descanso
  breakBackgroundSound = signal<string>(
    this.membership.getFocusSetting('focus-break-bg-sound', 'off')
  );

  backgroundVolume = signal<number>(
    parseFloat(this.membership.getFocusSetting('focus-bg-volume', '1.0'))
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
    this.membership.getFocusSetting('focus-end-sound', 'off')
  );

  // Alerta de Fin de Descanso
  breakSoundEnabled = signal<boolean>(
    this.membership.getFocusSetting('focus-break-sound-enabled', 'false') === 'true'
  );
  breakEndSound = signal<string>(
    this.membership.getFocusSetting('focus-break-sound', 'off')
  );

  // Sonido de fondo para Descanso Largo
  longBreakBackgroundSound = signal<string>(
    this.membership.getFocusSetting('focus-long-break-bg-sound', 'off')
  );
  longBreakEndSound = signal<string>(
    this.membership.getFocusSetting('focus-long-break-sound', 'off')
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
  showBatteryButtonInArena = signal<boolean>(this.membership.getFocusSetting('show-battery-button-in-arena', 'true') !== 'false');
  bodyDoublingCount = signal<number>(142);
  private bodyDoublingInterval: any = null;

  toggleBatteryButtonInArena() {
    const nextVal = !this.showBatteryButtonInArena();
    this.showBatteryButtonInArena.set(nextVal);
    this.membership.setFocusSetting('show-battery-button-in-arena', String(nextVal));
  }

  distractionInput = signal<string>('');
  distractionsList = signal<{ id: string; text: string; time: string }[]>([]);
  showDistractionFeedback = signal<boolean>(false);

  setEnergyLevel(level: 'low' | 'medium' | 'high') {
    this.energyLevel.set(level);
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
  focusDuration = signal(parseInt(this.membership.getFocusSetting('focus-duration', '25'), 10));
  breakDuration = signal(parseInt(this.membership.getFocusSetting('break-duration', '5'), 10));
  shortBreakDuration = this.breakDuration; // Alias para compatibilidad de plantillas
  longBreakInterval = signal(parseInt(this.membership.getFocusSetting('long-break-interval', '4'), 10));
  longBreakDuration = signal(parseInt(this.membership.getFocusSetting('long-break-duration', '15'), 10));
  dailyAttempts = signal<{ status: 'completed' | 'abandoned' | 'interrupted', time: string, durationSeconds?: number }[]>(
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
    return this.dailyAttempts()
      .filter(a => a.status === 'completed')
      .reduce((acc, a) => {
        const secs = a.durationSeconds !== undefined ? a.durationSeconds : 1500;
        return acc + this.membership.calculateTomatoesForDuration(secs, true);
      }, 0);
  });
  completedPomodorosArray = computed(() => Array(this.completedPomodoros()));

  getTomatoesForDuration(minutes: number): number {
    return this.membership.calculateTomatoesForDuration(minutes, false);
  }
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
  soundEnabled = signal(this.membership.getFocusSetting('sound-enabled', 'false') === 'true');  
  soundType = signal<'zen' | 'digital' | 'chime'>('zen'); 
  coworkingMode = signal<'solo' | 'comunitario'>('comunitario');
  activeBackground = signal<FocusBackgroundType>(
    (() => {
      const saved = this.membership.getFocusSetting('focus-active-bg', 'theme_autumn');
      if (saved === 'lofi_girl_sunset' || saved === 'lofi_boy_study' || saved === 'theme_animation_studio' || saved === 'lofi_study_rain' || saved === 'forest_campfire' || saved === 'color_oled_black') return 'off';
      return (saved as FocusBackgroundType) || 'theme_autumn';
    })()
  );

  activeVideoLayer = signal<'A' | 'B'>('A');
  private isCrossfading = false;
  @ViewChild('bgVideoA') bgVideoARef?: ElementRef<HTMLVideoElement>;
  @ViewChild('bgVideoB') bgVideoBRef?: ElementRef<HTMLVideoElement>;

  backgroundOptions: FocusBackgroundType[] = [
    'off', 'color_midnight_navy', 'color_espresso_charcoal', 'color_forest_matcha', 'color_executive_burgundy', 'lofi_cat_window', 'lofi_cat_rain', 'lofi_cat_sun', 'lofi_car_ride', 'theme_autumn', 'theme_sunset', 'theme_aninditaerina_lofi', 'fairy', 'lofi_study_desktop', 'lofi_moons', 'theme_airplane', 'theme_tunezoro', 'theme_tunezoro2', 'theme_tunezoro_anime', 'space_deep_void', 'space_silent_nebula', 'space_milky_zenith', 'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon', 'lofi_titanic_ocean', 'lofi_lighthouse_ocean'
  ];

  isSolidColorBackground = computed(() => {
    const bg = this.activeBackground();
    return bg === 'color_midnight_navy' || bg === 'color_espresso_charcoal' || bg === 'color_forest_matcha' || bg === 'color_executive_burgundy';
  });

  isSolidColor(bg: string): boolean {
    return bg === 'color_midnight_navy' || bg === 'color_espresso_charcoal' || bg === 'color_forest_matcha' || bg === 'color_executive_burgundy';
  }

  getSolidColorGradient(bg?: string): string {
    const targetBg = bg || this.activeBackground();
    switch (targetBg) {
      case 'color_midnight_navy':
        return 'radial-gradient(circle at 50% 30%, #0f1d38 0%, #050b18 100%)';
      case 'color_espresso_charcoal':
        return 'radial-gradient(circle at 50% 30%, #221a18 0%, #0d0b0a 100%)';
      case 'color_forest_matcha':
        return 'radial-gradient(circle at 50% 30%, #11281e 0%, #06100b 100%)';
      case 'color_executive_burgundy':
        return 'radial-gradient(circle at 50% 30%, #281220 0%, #0e070c 100%)';
      default:
        return 'transparent';
    }
  }

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
    if (bg === 'space_deep_void') return 'assets/themes/space_deep_void.webp';
    if (bg === 'space_silent_nebula') return 'assets/themes/space_silent_nebula.webp';
    if (bg === 'space_milky_zenith') return 'assets/themes/space_milky_zenith.webp';
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
      return ['space_deep_void', 'space_silent_nebula', 'space_milky_zenith', 'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon'] as FocusBackgroundType[];
    }
    if (this.timerStyle() === 'lighthouse') {
      return ['lofi_lighthouse_ocean'] as FocusBackgroundType[];
    }
    if (this.timerStyle() === 'titanic') {
      return ['lofi_titanic_ocean'] as FocusBackgroundType[];
    }
    // Para todos los demás relojes normales, incluir 'off', los colores pro, videos Lofi HD, temas de ilustración y fondos estándar
    return ['off', 'color_midnight_navy', 'color_espresso_charcoal', 'color_forest_matcha', 'color_executive_burgundy', 'lofi_cat_window', 'lofi_cat_rain', 'lofi_cat_sun', 'lofi_car_ride', 'theme_autumn', 'theme_sunset', 'theme_aninditaerina_lofi', 'fairy', 'lofi_study_desktop', 'lofi_moons', 'theme_airplane', 'theme_tunezoro', 'theme_tunezoro2', 'theme_tunezoro_anime', 'space_deep_void', 'space_silent_nebula', 'space_milky_zenith', 'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon'] as FocusBackgroundType[];
  });

  // ==================== CLASIFICACIONES DE FONDOS DE PANTALLA ====================
  activeBackgroundCategory = signal<string>('all');

  backgroundCategories = [
    { id: 'all', label: 'Todos', icon: 'fa-border-all' },
    { id: 'colors', label: 'Colores Pro', icon: 'fa-palette' },
    { id: 'video', label: 'Con Movimiento', icon: 'fa-film' },
    { id: 'inspiration', label: 'Inspiración Lofi', icon: 'fa-wand-magic-sparkles' },
    { id: 'anime', label: 'Anime y Aventura', icon: 'fa-compass' },
    { id: 'cosmos', label: 'Cosmos y Océano', icon: 'fa-moon' }
  ];

  backgroundCategoriesConfig = [
    {
      id: 'colors',
      title: 'Modo Estudio Profesional (Colores y Gradientes)',
      badge: 'Deep Focus Pro',
      badgeColor: '#38bdf8',
      icon: 'fa-palette',
      items: ['off', 'color_midnight_navy', 'color_espresso_charcoal', 'color_forest_matcha', 'color_executive_burgundy'] as FocusBackgroundType[]
    },
    {
      id: 'video',
      title: 'Fondos con Movimiento',
      badge: 'Video HD',
      badgeColor: '#00f2fe',
      icon: 'fa-film',
      items: ['lofi_cat_window', 'lofi_cat_rain', 'lofi_cat_sun', 'lofi_car_ride'] as FocusBackgroundType[]
    },
    {
      id: 'inspiration',
      title: 'Inspiración y Arte Lofi',
      badge: 'Ilustración',
      badgeColor: '#a855f7',
      icon: 'fa-wand-magic-sparkles',
      items: ['theme_autumn', 'theme_sunset', 'theme_aninditaerina_lofi', 'fairy', 'lofi_study_desktop', 'lofi_moons'] as FocusBackgroundType[]
    },
    {
      id: 'anime',
      title: 'Anime y Aventura',
      badge: 'Cinemático',
      badgeColor: '#10b981',
      icon: 'fa-compass',
      items: ['theme_tunezoro', 'theme_tunezoro2', 'theme_tunezoro_anime', 'theme_airplane'] as FocusBackgroundType[]
    },
    {
      id: 'cosmos',
      title: 'Cosmos y Océano Profundo',
      badge: 'Inmersivo',
      badgeColor: '#6366f1',
      icon: 'fa-moon',
      items: ['space_deep_void', 'space_silent_nebula', 'space_milky_zenith', 'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon', 'lofi_titanic_ocean', 'lofi_lighthouse_ocean'] as FocusBackgroundType[]
    }
  ];

  setBackgroundCategory(catId: string) {
    this.activeBackgroundCategory.set(catId);
  }

  filteredBackgroundCategories = computed(() => {
    const selected = this.activeBackgroundCategory();
    const available = this.availableBackgroundOptions();
    
    const categoriesWithItems = this.backgroundCategoriesConfig.map(cat => ({
      ...cat,
      availableItems: cat.items.filter(bg => available.includes(bg))
    })).filter(cat => cat.availableItems.length > 0);

    if (selected === 'all') {
      return categoriesWithItems;
    }
    return categoriesWithItems.filter(cat => cat.id === selected);
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

  private initialMotivations: MotivationItem[] = [];

  motivationsList = signal<MotivationItem[]>(this.loadMotivations());
  private motivationsChannel: any = null;

  // Muestra siempre el Top 10 con más corazones, asegurando que las frases nuevas en tiempo real se muestren inmediatamente
  filteredMotivations = computed(() => {
    const list = this.motivationsList();
    const sorted = [...list].sort((a, b) => (b.likes - a.likes) || ((b.createdAt || 0) - (a.createdAt || 0)));
    const top10 = sorted.slice(0, 10);
    
    // Si hay algún mensaje recién llegado en tiempo real (isNewArrival) fuera del top 10, colocarlo al inicio para visualización instantánea
    const newArrivalsNotInTop = sorted.filter(m => m.isNewArrival && !top10.some(t => t.id === m.id));
    if (newArrivalsNotInTop.length > 0) {
      return [...newArrivalsNotInTop, ...top10].slice(0, 10);
    }
    return top10;
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
      
      const all = userMots.map(m => ({
        ...m,
        likedByMe: savedLikedIds.includes(m.id) || m.likedByMe
      }));

      return all.sort((a, b) => b.likes - a.likes || (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
      return [];
    }
  }

  async loadMotivationsFromSupabase() {
    if (!this.supabaseService.isConfigured()) return;
    try {
      const { motivations, error } = await this.supabaseService.getCommunityMotivations(30);
      if (!error && motivations) {
        const savedLikedIds: string[] = JSON.parse(localStorage.getItem('user-liked-motivations') || '[]');
        const currentUserId = this.supabaseService.currentUser()?.id;
        const currentUserName = this.userName();
        const currentLocalList = this.motivationsList();

        const mapped: MotivationItem[] = motivations.map(m => {
          const isUser = (currentUserId && m.user_id === currentUserId) || (currentUserName && m.user_name === currentUserName);
          const existingLocal = currentLocalList.find(loc => loc.id === m.id);
          const likedByMe = m.liked_by_me !== undefined ? m.liked_by_me : (savedLikedIds.includes(m.id) || !!existingLocal?.likedByMe);
          return {
            id: m.id,
            userName: m.user_name || 'Guerrero',
            avatar: m.avatar || 'gato',
            text: m.text,
            category: m.category || 'metas',
            timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente',
            createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
            likes: m.likes ?? 0,
            isUser: !!isUser,
            likedByMe: !!likedByMe,
            isNewArrival: existingLocal?.isNewArrival
          };
        });

        // Conservar elementos locales optimistas pendientes
        const pendingLocals = currentLocalList.filter(loc => loc.id.startsWith('user-mot-') && !mapped.some(m => m.text === loc.text));

        this.motivationsList.set([...pendingLocals, ...mapped].sort((a, b) => b.likes - a.likes || (b.createdAt || 0) - (a.createdAt || 0)));
        this.saveLikedMotivations();
      }
    } catch (e) {
      console.warn('[Supabase Motivations Load Error]', e);
    }
  }

  setupMotivationsRealtime() {
    if (!this.supabaseService.isConfigured()) return;

    if (this.motivationsChannel) {
      try {
        this.supabaseService.client.removeChannel(this.motivationsChannel);
      } catch (e) {}
    }

    this.motivationsChannel = this.supabaseService.client
      .channel('public:community_motivations_feed')
      // 1. Inserción en tiempo real vía Postgres Changes
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_motivations' }, (payload: any) => {
        const newRow = payload?.new;
        if (newRow && newRow['id']) {
          this.handleIncomingMotivation(newRow);
        }
      })
      // 2. Actualización de likes vía Postgres Changes
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_motivations' }, (payload: any) => {
        const newRow = payload?.new;
        if (newRow && newRow['id']) {
          this.handleUpdatedMotivation(newRow);
        }
      })
      // 3. Eliminación vía Postgres Changes
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_motivations' }, (payload: any) => {
        const oldRow = payload?.old;
        if (oldRow && oldRow['id']) {
          this.handleDeletedMotivation(oldRow['id']);
        }
      })
      // 4. Difusión Directa Instantánea (Broadcast WebSocket < 50ms)
      .on('broadcast', { event: 'new_motivation' }, ({ payload }: any) => {
        if (payload && payload.id) {
          this.handleIncomingMotivation(payload);
        }
      })
      .on('broadcast', { event: 'like_motivation' }, ({ payload }: any) => {
        if (payload && payload.id) {
          this.handleUpdatedMotivation(payload);
        }
      })
      .on('broadcast', { event: 'delete_motivation' }, ({ payload }: any) => {
        if (payload && payload.id) {
          this.handleDeletedMotivation(payload.id);
        }
      })
      .subscribe();
  }

  handleIncomingMotivation(row: any) {
    const currentUserId = this.supabaseService.currentUser()?.id;
    const currentUserName = this.userName();
    const isUser = Boolean((currentUserId && row.user_id === currentUserId) || (currentUserName && row.user_name === currentUserName));
    
    const savedLikedIds: string[] = JSON.parse(localStorage.getItem('user-liked-motivations') || '[]');
    const likedByMe: boolean = Boolean(savedLikedIds.includes(row.id));

    const newArrival: MotivationItem = {
      id: row.id,
      userName: row.user_name || 'Guerrero',
      avatar: row.avatar || 'gato',
      text: row.text,
      category: row.category || 'metas',
      timestamp: row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Justo ahora',
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      likes: row.likes ?? 0,
      isUser: isUser,
      likedByMe: likedByMe,
      isNewArrival: true
    };

    this.motivationsList.update(list => {
      const existingIdx = list.findIndex(m => m.id === row.id || (m.isUser && isUser && m.text === row.text && Math.abs((m.createdAt || 0) - (newArrival.createdAt || 0)) < 25000));
      if (existingIdx !== -1) {
        const copy = [...list];
        copy[existingIdx] = { 
          ...copy[existingIdx], 
          id: row.id, 
          likes: row.likes !== undefined ? row.likes : copy[existingIdx].likes,
          isNewArrival: true
        };
        return copy;
      }
      return [newArrival, ...list];
    });

    // Notificación emergente si es de otro guerrero conectado
    if (!isUser) {
      const author = row.user_name || 'Un Guerrero';
      const shortText = row.text.length > 35 ? row.text.substring(0, 35) + '...' : row.text;
      this.showToastFeedback(`💬 ${author}: "${shortText}"`, 'info');
      this.addComunidadEvent(`💬 ${author} compartió una frase en el muro`, 'reaction');
    }

    // Retirar estado de nuevo tras 4.5 segundos
    setTimeout(() => {
      this.motivationsList.update(list => list.map(m => (m.id === row.id || m.text === row.text) ? { ...m, isNewArrival: false } : m));
    }, 4500);
  }

  handleUpdatedMotivation(row: any) {
    let targetMot: MotivationItem | undefined;
    let oldLikes = 0;

    this.motivationsList.update(list => {
      return list.map(m => {
        if (m.id === row.id) {
          targetMot = m;
          oldLikes = m.likes;
          return {
            ...m,
            likes: row.likes !== undefined ? row.likes : m.likes,
            text: row.text || m.text,
            category: row.category || m.category
          };
        }
        return m;
      });
    });

    // Si la motivación es del usuario y recibió un corazón, notificar
    if (targetMot && targetMot.isUser && row.likes !== undefined && row.likes > oldLikes) {
      this.notificationService.notifyMotivationHeart(targetMot.text, undefined, row.likes);
    }
  }

  handleDeletedMotivation(id: string) {
    this.motivationsList.update(list => list.filter(m => m.id !== id));
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

  async addMotivation() {
    const text = this.newMotivationText().trim();
    if (!text) return;

    const user = this.userName() || 'Tú';
    const avatar = this.selectedAvatar() || 'gato';
    const category = this.newMotivationCategory();
    const tempId = 'user-mot-' + Date.now();

    const newMot: MotivationItem = {
      id: tempId,
      userName: user,
      avatar: avatar,
      text: text,
      category: category,
      timestamp: 'Justo ahora',
      createdAt: Date.now(),
      likes: 0,
      isUser: true,
      likedByMe: false,
      isNewArrival: true
    };

    // 1. Inserción optimista en el cliente actual
    this.motivationsList.update(list => [newMot, ...list]);
    this.newMotivationText.set('');
    this.saveCustomMotivations();

    this.showToastFeedback('✨ ¡Tu motivación ha sido publicada en el muro!', 'success');

    // 2. Difusión Broadcast instantánea a todos los clientes conectados (< 50ms)
    if (this.motivationsChannel) {
      try {
        this.motivationsChannel.send({
          type: 'broadcast',
          event: 'new_motivation',
          payload: {
            id: tempId,
            user_name: user,
            avatar: avatar,
            text: text,
            category: category,
            likes: 0,
            created_at: new Date().toISOString()
          }
        });
      } catch (e) {}
    }

    // 3. Persistir en Supabase
    if (this.supabaseService.isConfigured()) {
      try {
        const res = await this.supabaseService.createCommunityMotivation({
          id: tempId,
          text,
          user_name: user,
          avatar,
          category,
          likes: 0
        });
        if (res.data && res.data.id) {
          const finalId = res.data.id;
          this.motivationsList.update(list => list.map(m => m.id === tempId ? { ...m, id: finalId } : m));
          this.saveCustomMotivations();

          if (this.motivationsChannel && finalId !== tempId) {
            try {
              this.motivationsChannel.send({
                type: 'broadcast',
                event: 'like_motivation',
                payload: { id: finalId, likes: 0 }
              });
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('[Supabase Create Motivation Error]', err);
      }
    }

    setTimeout(() => {
      this.motivationsList.update(list => list.map(m => (m.id === tempId || m.text === text) ? { ...m, isNewArrival: false } : m));
    }, 4500);
  }

  async deleteMotivation(id: string) {
    this.motivationsList.update(list => list.filter(m => m.id !== id));
    this.saveCustomMotivations();
    this.showToastFeedback('🗑️ Motivación eliminada', 'info');

    if (this.motivationsChannel) {
      try {
        this.motivationsChannel.send({
          type: 'broadcast',
          event: 'delete_motivation',
          payload: { id }
        });
      } catch (e) {}
    }

    if (this.supabaseService.isConfigured() && !id.startsWith('init-')) {
      this.supabaseService.deleteCommunityMotivation(id).catch(err => {
        console.warn('[Supabase Delete Motivation Error]', err);
      });
    }
  }

  async toggleLikeMotivation(item: MotivationItem) {
    const wasLiked = !!item.likedByMe;
    const optimisticLiked = !wasLiked;
    const optimisticLikes = optimisticLiked ? item.likes + 1 : Math.max(0, item.likes - 1);

    // Actualización reactiva optimista instantánea
    this.motivationsList.update(list => {
      return list.map(m => {
        if (m.id === item.id) {
          return {
            ...m,
            likedByMe: optimisticLiked,
            likes: optimisticLikes
          };
        }
        return m;
      });
    });
    this.saveLikedMotivations();

    if (optimisticLiked) {
      this.showToastFeedback('❤️ ¡Te inspira esta motivación!', 'like');
      if (item.isUser) {
        this.notificationService.notifyMotivationHeart(item.text, 'Un compañero', optimisticLikes);
      }
    }

    if (this.motivationsChannel) {
      try {
        this.motivationsChannel.send({
          type: 'broadcast',
          event: 'like_motivation',
          payload: { id: item.id, likes: optimisticLikes }
        });
      } catch (e) {}
    }

    if (this.supabaseService.isConfigured() && !item.id.startsWith('init-')) {
      try {
        const res = await this.supabaseService.toggleCommunityMotivationLike(item.id);
        if (res.success) {
          if (res.likes_count !== undefined || res.liked !== undefined) {
            this.motivationsList.update(list => {
              return list.map(m => {
                if (m.id === item.id) {
                  return {
                    ...m,
                    likes: res.likes_count ?? m.likes,
                    likedByMe: res.liked ?? m.likedByMe
                  };
                }
                return m;
              });
            });
            this.saveLikedMotivations();
          }
        }
      } catch (err) {
        console.warn('[Supabase Like Motivation Error]', err);
      }
    }
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

  // Estilo del Temporizador (Clásico Digital por defecto vs Fuego Premium vs Órbita Solar vs Titanic vs El Faro vs Avión en Pista vs Farol Encantado)
  timerStyle = signal<FocusTimerStyle>(
    (this.membership.getFocusSetting('focus-timer-style', 'digital') as FocusTimerStyle) || 'digital'
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

  // Escala del fuego basada en el tiempo restante (de 1.20 a 0.10)
  fireScale = computed(() => {
    if (this.isBreak()) {
      return 0; // En descanso la flama está apagada
    }
    const pct = this.timePercentage();
    if (pct <= 0) return 0;
    // Escala continua y suave hasta 0.10 antes de extinguirse
    if (pct < 0.15) {
      return 0.10 + (pct / 0.15) * 0.28; // de 0.10 a 0.38
    }
    return 0.38 + ((pct - 0.15) / 0.85) * 0.82; // de 0.38 a 1.20
  });

  // Desplazamiento dinámico en Y para que la flama permanezca pegada a los troncos al achicarse
  fireTranslateY = computed(() => {
    if (this.arenaState() === 'setup') return 0;
    const scale = this.fireScale();
    if (scale >= 1.20) return 0;
    if (scale <= 0) return 19;
    // A medida que la escala baja de 1.20 a 0, la llama desciende hasta +19px para sentarse en los leños
    const factor = Math.max(0, Math.min(1, (1.20 - scale) / 1.10));
    return Math.round(factor * 19);
  });

  // Opacidad y parpadeo final del fuego
  fireOpacity = computed(() => {
    if (this.isBreak()) return 0; // En descanso la flama está apagada
    const pct = this.timePercentage();
    if (pct <= 0) return 0;
    if (pct < 0.04) {
      return (pct / 0.04);
    }
    return 1.0;
  });

  // Opacidades individuales para las capas de la llama y chispas
  sparksOpacity = computed(() => {
    if (this.isBreak()) return 0.60;
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.3) return 1.0;
    if (pct <= 0) return 0.55; // Mantiene el humo y chispas vivas desde los leños incandescentes
    return 0.55 + (pct / 0.3) * 0.45;
  });

  innerFlameOpacity = computed(() => {
    if (this.isBreak()) return 0.0;
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.06) return 1.0;
    if (pct <= 0) return 0.0;
    return pct / 0.06;
  });

  middleFlameOpacity = computed(() => {
    if (this.isBreak()) return 0.0;
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.04) return 1.0;
    if (pct <= 0) return 0.0;
    return pct / 0.04;
  });

  outerFlameOpacity = computed(() => {
    if (this.isBreak()) return 0.0;
    if (this.arenaState() === 'setup') return 1.0;
    const pct = this.timePercentage();
    if (pct > 0.02) return 1.0;
    if (pct <= 0) return 0;
    return pct / 0.02;
  });


  // Objetivo Activo (La batalla de hoy) e Integración Metodológica
  activeObjective = signal('');
  objectiveInput = signal('');
  associatedIdeaId = signal<string | null>(null);
  activeMethodology = signal<'sapo' | 'pareto' | 'normal'>('normal');
  isObjectiveAssociated = computed(() => {
    return !!this.associatedIdeaId() && !!this.activeObjective()?.trim();
  });
  hasCustomObjective = computed(() => {
    const obj = this.activeObjective()?.trim();
    return !!obj && obj !== 'Sesión de Enfoque';
  });

  selectMethodology(method: 'sapo' | 'pareto' | 'normal') {
    this.activeMethodology.set(method);
  }

  onObjectiveInputChange(val: string) {
    this.objectiveInput.set(val);
  }

  disassociateObjective() {
    this.activeObjective.set('');
    this.objectiveInput.set('');
    this.associatedIdeaId.set(null);
    this.objectiveConfirmed.set(false);
    localStorage.removeItem('activeObjectiveDraft');
    localStorage.removeItem('activeObjectiveIdeaId');
    localStorage.removeItem('focus-session-objective');
    localStorage.removeItem('focus-session-idea-id');
    this.broadcastPresence();
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

  // Lógica del Temporizador
  timeLeft = signal((parseInt(this.membership.getFocusSetting('focus-duration', '25'), 10) || 25) * 60);
  totalSessionTime = signal((parseInt(this.membership.getFocusSetting('focus-duration', '25'), 10) || 25) * 60);
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
  // Templo de Enfoque Comunitario Real (Supabase Realtime Presence)
  comunidadUsers = signal<any[]>([]);
  comunidadViewStyle = signal<'cards' | 'desks' | 'floating'>('cards');
  comunidadViewOptions: ('cards' | 'desks' | 'floating')[] = ['cards', 'desks', 'floating'];
  comunidadEvents = signal<any[]>([]);
  userActiveReaction = signal<string>('');
  globalFocusedCount = signal<number>(1);
  communityInterval: any = null;
  comunidadPanelExpanded = signal<boolean>(false);
  hideMyObjectiveInCommunity = signal<boolean>(
    this.membership.getFocusSetting('hide-objective-in-community', 'false') === 'true'
  );
  showConsoleOnboardingHint = signal<boolean>(true);
  consoleHintTimeout: any = null;
  comunidadSearchQuery = signal<string>('');
  comunidadFilter = signal<'all' | 'focused' | 'break'>('all');
  maxVisibleCommunityUsers = signal<number>(10);

  totalCommunityUsersCount = computed(() => {
    return (this.coworkingMode() === 'solo' ? 0 : this.comunidadUsers().length) + 1;
  });

  totalLiveWarriorsCount = computed(() => {
    const liveOthers = this.comunidadUsers().filter(u => u.is_live && u.status !== 'idle').length;
    const isMeLive = (this.arenaState() === 'active' || this.arenaState() === 'countdown') && !this.isBreak();
    return liveOthers + (isMeLive ? 1 : 0);
  });

  visibleComunidadUsers = computed(() => {
    let list = this.comunidadUsers();
    const query = this.comunidadSearchQuery().toLowerCase().trim();
    const filter = this.comunidadFilter();

    if (query) {
      list = list.filter(u => 
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.mission && u.mission.toLowerCase().includes(query))
      );
    }

    if (filter === 'focused') {
      list = list.filter(u => u.status === 'focused');
    } else if (filter === 'break') {
      list = list.filter(u => u.status === 'break' || u.status === 'paused');
    }

    // Ordenar con prioridad inteligente: Focused (4) -> Break (3) -> Paused (2) -> Idle (1)
    const sorted = [...list].sort((a, b) => {
      const score = (u: any) => {
        if (u.status === 'focused') return 4;
        if (u.status === 'break') return 3;
        if (u.status === 'paused') return 2;
        return 1;
      };
      const scoreDiff = score(b) - score(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.timeLeft || 0) - (a.timeLeft || 0);
    });

    return sorted.slice(0, this.maxVisibleCommunityUsers());
  });

  hiddenComunidadUsersCount = computed(() => {
    const total = this.comunidadUsers().length;
    const visible = this.visibleComunidadUsers().length;
    return Math.max(0, total - visible);
  });

  presenceClientId: string = 'client-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  private communityPresenceChannel: any = null;
  private dbRegisteredProfiles: any[] = [];

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
  currentAvatarPausePenalty = computed(() => {
    const avatarId = this.membership.selectedAvatar() || 'gato';
    return this.membership.getAvatarPausePenalty(avatarId);
  });
  bossHealAmount = computed(() => {
    const avatarId = this.membership.selectedAvatar() || 'gato';
    return this.membership.getAvatarHealPoints(avatarId);
  });
  currentAvatarCoins = computed(() => {
    const avatarId = this.membership.selectedAvatar() || 'gato';
    return this.membership.getAvatarCoinsPerPomodoro(avatarId);
  });
  currentAvatarDamage = computed(() => {
    const avatarId = this.membership.selectedAvatar() || 'gato';
    return this.membership.getAvatarDamagePoints(avatarId);
  });
  objectiveConfirmed = signal(false);

  async confirmObjective() {
    const text = (this.objectiveInput()?.trim() || this.activeObjective()?.trim());
    if (!text) return;

    let currentId = this.associatedIdeaId();
    if (!currentId) {
      // Verificar si ya existe una nota con el mismo contenido en el baúl de ideas
      const existing = this.membership.capturedIdeas().find(
        i => i.content.trim().toLowerCase() === text.toLowerCase()
      );
      if (existing && existing.id) {
        currentId = existing.id;
        this.associatedIdeaId.set(currentId);
        await this.membership.convertIdeaToObjective(currentId);
      } else {
        // Crear la nueva idea en la tabla de ideas y guardarla en Supabase/local
        const priority: IdeaPriority = this.activeMethodology() === 'sapo' 
          ? 'alta' 
          : (this.activeMethodology() === 'pareto' ? 'alta' : 'media');
        
        await this.membership.addIdea(text, priority);
        // Buscar la idea recién creada en la lista
        const newlyCreated = this.membership.capturedIdeas().find(i => i.content === text) || this.membership.capturedIdeas()[0];
        if (newlyCreated && newlyCreated.id) {
          currentId = newlyCreated.id;
          this.associatedIdeaId.set(currentId);
          await this.membership.convertIdeaToObjective(currentId);
        }
      }
    } else {
      await this.membership.convertIdeaToObjective(currentId);
    }

    this.activeObjective.set(text);
    this.objectiveInput.set('');

    localStorage.setItem('activeObjectiveDraft', text);
    if (currentId) {
      localStorage.setItem('activeObjectiveIdeaId', currentId);
      localStorage.setItem('focus-session-idea-id', currentId);
    }
    localStorage.setItem('focus-session-objective', text);

    this.objectiveConfirmed.set(true);
    this.broadcastPresence();
    this.showToastFeedback('🎯 Objetivo asociado a tu sesión y guardado en Mis Ideas.', 'success');
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
  // NOTIFICACIONES DE ESCRITORIO & ALERTAS DE PESTAÑA (B & C)
  // ==========================================
  private titleFlashingInterval: any = null;
  private originalDocumentTitle = 'COFU - Procrastina Como un Pro';
  notificationPermission = signal<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  notificationsEnabled = signal<boolean>(
    this.membership.getFocusSetting('desktop-notifications-enabled', 'true') !== 'false'
  );
  tabNotificationsEnabled = signal<boolean>(
    this.membership.getFocusSetting('tab-notifications-enabled', 'true') !== 'false'
  );
  focusNotificationEnabled = signal<boolean>(
    this.membership.getFocusSetting('focus-notification-enabled', 'true') !== 'false'
  );
  breakNotificationEnabled = signal<boolean>(
    this.membership.getFocusSetting('break-notification-enabled', 'true') !== 'false'
  );
  longBreakNotificationEnabled = signal<boolean>(
    this.membership.getFocusSetting('long-break-notification-enabled', 'true') !== 'false'
  );
  motivationNotificationEnabled = signal<boolean>(
    this.membership.getFocusSetting('motivation-notification-enabled', 'true') !== 'false'
  );
  abandonSoundEnabled = signal<boolean>(
    this.membership.getFocusSetting('abandon-sound-enabled', 'false') === 'true'
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
    this.membership.setFocusSetting('abandon-sound-enabled', String(newVal));
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
    this.membership.setFocusSetting('desktop-notifications-enabled', String(enabled));
    if (enabled) {
      if (this.notificationPermission() !== 'granted') {
        this.requestNotificationPermission(true);
      } else {
        this.showToastFeedback('🔔 Notificaciones de escritorio activadas.', 'success');
      }
    } else {
      this.showToastFeedback('🔕 Notificaciones de escritorio desactivadas.', 'info');
    }
  }

  toggleTabNotifications(enabled: boolean) {
    this.tabNotificationsEnabled.set(enabled);
    this.membership.setFocusSetting('tab-notifications-enabled', String(enabled));
  }

  toggleFocusNotification(enabled: boolean) {
    this.focusNotificationEnabled.set(enabled);
    this.membership.setFocusSetting('focus-notification-enabled', String(enabled));
  }

  toggleBreakNotification(enabled: boolean) {
    this.breakNotificationEnabled.set(enabled);
    this.membership.setFocusSetting('break-notification-enabled', String(enabled));
  }

  toggleLongBreakNotification(enabled: boolean) {
    this.longBreakNotificationEnabled.set(enabled);
    this.membership.setFocusSetting('long-break-notification-enabled', String(enabled));
  }

  toggleMotivationNotification(enabled: boolean) {
    this.motivationNotificationEnabled.set(enabled);
    this.membership.setFocusSetting('motivation-notification-enabled', String(enabled));
  }

  async testFocusNotification() {
    if (this.notificationPermission() !== 'granted') {
      const perm = await this.requestNotificationPermission(false);
      if (perm !== 'granted') {
        if (perm === 'denied') {
          this.showToastFeedback('⚠️ Notificaciones bloqueadas en el navegador. Haz clic en 🔒 en la URL para permitirlas.', 'info');
        } else {
          this.showToastFeedback('⚠️ Debes permitir las notificaciones en tu navegador.', 'info');
        }
        return;
      }
    }
    const sent = await this.dispatchNotification(
      '🍅 ¡Pomodoro Completado! (Prueba)',
      '¡Excelente trabajo! Has completado tu bloque de concentración.'
    );
    if (sent) {
      this.showToastFeedback('🔔 Notificación de prueba enviada al escritorio.', 'success');
    } else {
      this.showToastFeedback('⚠️ No se pudo mostrar la notificación. Revisa la configuración de Windows/Navegador.', 'info');
    }
  }

  async testBreakNotification() {
    if (this.notificationPermission() !== 'granted') {
      const perm = await this.requestNotificationPermission(false);
      if (perm !== 'granted') {
        if (perm === 'denied') {
          this.showToastFeedback('⚠️ Notificaciones bloqueadas en el navegador. Haz clic en 🔒 en la URL para permitirlas.', 'info');
        } else {
          this.showToastFeedback('⚠️ Debes permitir las notificaciones en tu navegador.', 'info');
        }
        return;
      }
    }
    const sent = await this.dispatchNotification(
      '☕ ¡Descanso Breve Finalizado! (Prueba)',
      'Tu energía está recargada. Es hora de volver al bloque de concentración.'
    );
    if (sent) {
      this.showToastFeedback('🔔 Notificación de prueba de descanso breve enviada.', 'success');
    } else {
      this.showToastFeedback('⚠️ No se pudo mostrar la notificación. Revisa la configuración de Windows/Navegador.', 'info');
    }
  }

  async testLongBreakNotification() {
    if (this.notificationPermission() !== 'granted') {
      const perm = await this.requestNotificationPermission(false);
      if (perm !== 'granted') {
        if (perm === 'denied') {
          this.showToastFeedback('⚠️ Notificaciones bloqueadas en el navegador. Haz clic en 🔒 en la URL para permitirlas.', 'info');
        } else {
          this.showToastFeedback('⚠️ Debes permitir las notificaciones en tu navegador.', 'info');
        }
        return;
      }
    }
    const sent = await this.dispatchNotification(
      '🌴 ¡Descanso Largo Finalizado! (Prueba)',
      'Tu pausa extendida ha concluido. ¡Energía al 100% para continuar!'
    );
    if (sent) {
      this.showToastFeedback('🔔 Notificación de prueba de descanso largo enviada.', 'success');
    } else {
      this.showToastFeedback('⚠️ No se pudo mostrar la notificación. Revisa la configuración de Windows/Navegador.', 'info');
    }
  }

  async testMotivationNotification() {
    if (this.notificationPermission() !== 'granted') {
      const perm = await this.requestNotificationPermission(false);
      if (perm !== 'granted') {
        if (perm === 'denied') {
          this.showToastFeedback('⚠️ Notificaciones bloqueadas en el navegador. Haz clic en 🔒 en la URL para permitirlas.', 'info');
        } else {
          this.showToastFeedback('⚠️ Debes permitir las notificaciones en tu navegador.', 'info');
        }
        return;
      }
    }
    const list = this.motivationsList();
    const mot = list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
    const text = mot ? `"${mot.text}" — ${mot.userName || 'Comunidad'}` : '¡Tu disciplina de hoy es tu éxito de mañana!';
    const sent = await this.dispatchNotification(
      '🔋 Batería de Motivación (Prueba)',
      text
    );
    if (sent) {
      this.showToastFeedback('⚡ Notificación de prueba de motivación enviada.', 'success');
    } else {
      this.showToastFeedback('⚠️ No se pudo mostrar la notificación. Revisa la configuración de Windows/Navegador.', 'info');
    }
  }

  async requestNotificationPermission(showFeedback: boolean = false): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.notificationPermission.set('unsupported');
      if (showFeedback) {
        this.showToastFeedback('⚠️ Este navegador no soporta notificaciones de escritorio.', 'info');
      }
      return 'unsupported';
    }

    try {
      let perm: NotificationPermission = Notification.permission;
      if (perm === 'default') {
        try {
          perm = await Notification.requestPermission();
        } catch {
          perm = await new Promise<NotificationPermission>((resolve) => {
            Notification.requestPermission((p) => resolve(p));
          });
        }
      }
      this.notificationPermission.set(perm);

      if (perm === 'granted') {
        if (showFeedback) {
          this.showToastFeedback('🔔 ¡Notificaciones de escritorio activadas!', 'success');
          await this.dispatchNotification(
            '🔔 Notificaciones Activadas - COFU',
            '¡Excelente! Recibirás avisos en tu pantalla cuando termine cada Pomodoro y descanso.'
          );
        }
      } else if (perm === 'denied') {
        if (showFeedback) {
          this.showToastFeedback(
            '⚠️ Notificaciones bloqueadas. Haz clic en el icono 🔒 en la barra de direcciones para permitirlas.',
            'info'
          );
        }
      }
      return perm;
    } catch (e) {
      console.warn('Error en requestNotificationPermission:', e);
      const current = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
      this.notificationPermission.set(current);
      return current;
    }
  }

  async dispatchNotification(title: string, body: string, icon?: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    const iconUrl = icon || (window.location.origin ? `${window.location.origin}/cofu_logo.jpg` : 'cofu_logo.jpg');

    // Método 1: Constructor estándar Notification
    try {
      const notif = new Notification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        silent: false
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch (e) {}
        notif.close();
      };
      return true;
    } catch (e1) {
      console.warn('Fallo creación Notification estándar:', e1);
    }

    // Método 2: Constructor simple de Notification
    try {
      const simpleNotif = new Notification(title, { body });
      simpleNotif.onclick = () => {
        try { window.focus(); } catch (err) {}
        simpleNotif.close();
      };
      return true;
    } catch (e2) {
      console.warn('Fallo creación Notification simple:', e2);
    }

    // Método 3: Fallback Service Worker Registration (si está disponible)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: iconUrl,
            badge: iconUrl
          });
          return true;
        }
      } catch (e3) {
        console.warn('Fallo ServiceWorker showNotification:', e3);
      }
    }

    return false;
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
      this.notificationPermission.set(Notification.permission);
      return;
    }

    this.dispatchNotification(title, body, icon);
  }

  handleTimerCompleted() {
    this.clearPersistedSession();
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.membership.isFocusActive.set(false);

    if (!this.isBreak()) {
      // 🍅 Fin del Pomodoro (Sesión de concentración completada)
      this.sessionEndingStatus.set('completed');
      if (this.hasCustomObjective()) {
        this.objectiveCompleted.set('yes');
      } else {
        this.objectiveCompleted.set(null);
      }
      this.arenaState.set('summary');
      this.broadcastPresence();
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
      this.broadcastPresence();

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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission.set(Notification.permission);
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChangeAlert() {
    if (typeof document !== 'undefined' && !document.hidden) {
      if (this.titleFlashingInterval) {
        this.stopTitleFlashing();
      }
      if ('Notification' in window) {
        this.notificationPermission.set(Notification.permission);
      }
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
    this.initializeRealComunidadUsers();
    this.setupPresenceChannel();
    this.loadMotivationsFromSupabase();
    this.setupMotivationsRealtime();
    this.communityInterval = setInterval(() => {
      this.tickCommunity();
    }, 1000);

    // Parpadeo de bienvenida y etiqueta temporal de la consola durante los primeros 6 segundos
    this.consoleHintTimeout = setTimeout(() => {
      this.showConsoleOnboardingHint.set(false);
    }, 6000);

    // Fluctación orgánica de Body Doubling en silencio
    this.bodyDoublingInterval = setInterval(() => {
      const delta = (Math.floor(Math.random() * 5) - 2); // -2 a +2
      this.bodyDoublingCount.update(c => Math.max(95, Math.min(180, c + delta)));
    }, 12000);

    const draft = localStorage.getItem('activeObjectiveDraft');
    const draftIdeaId = localStorage.getItem('activeObjectiveIdeaId');
    if (draft && draftIdeaId) {
      this.activeObjective.set(draft);
      this.associatedIdeaId.set(draftIdeaId);
      this.objectiveConfirmed.set(true);
      localStorage.setItem('focus-session-objective', draft);
      localStorage.setItem('focus-session-idea-id', draftIdeaId);
    } else if (draft) {
      this.activeObjective.set(draft);
      this.associatedIdeaId.set(null);
      this.objectiveConfirmed.set(false);
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
    this.broadcastPresence();

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
      this.addComunidadEvent(`⚡ ¡${this.userName() || 'Guerrero'} reanudó su sesión de enfoque!`, 'join');
      this.startTimerLoop();
    } else {
      // Activar interrupción
      this.emergencyPauseActive.set(true);
      this.stopEmergencyTimer();
      this.stopTimerLoop();
      
      const limitSeconds = 120; // 2 minutos para todos
      this.emergencyTimeLeft.set(limitSeconds);
      this.updateLiveTabTitle();
      this.addComunidadEvent(`⏸️ ${this.userName() || 'Guerrero'} pausó su sesión (2 min máx).`, 'break');
      this.broadcastPresence();

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

          // Registrar intento diario
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const newAttempt = { status: 'interrupted' as const, time: timeStr };
          const updatedAttempts = [...this.dailyAttempts(), newAttempt];
          this.dailyAttempts.set(updatedAttempts);
          localStorage.setItem('daily-attempts', JSON.stringify(updatedAttempts));

          const penaltyCoinsInterrupted = this.currentAvatarPausePenalty();
          const healHpInterrupted = this.bossHealAmount();
          const currentBossName = this.bossService.activeBoss().name || 'El Jefe';
          this.membership.proCoins.update(coins => Math.max(0, coins - penaltyCoinsInterrupted));

          if (this.membership.isPremium()) {
            this.membership.addFocusPoints(-50);
            // Cura al jefe por agotarse la interrupción en comunidad (solo cuentas Premium afectan al jefe)
            if (this.coworkingMode() === 'comunitario') {
              this.bossService.healBoss(this.userName() || 'Guerrero Anónimo', healHpInterrupted);
              this.addComunidadEvent(`💔 ${this.userName() || 'Un Guerrero'} excedió el tiempo de pausa (-${penaltyCoinsInterrupted} ProCoins). ${currentBossName} recuperó +${healHpInterrupted} HP.`, 'reaction');
            }
          }

          this.membership.saveConsolidatedUserData();

          // Liquidar sesión en Supabase y limpiar persistencia
          this.settleCurrentSession('interrupted', 'no');
          this.clearPersistedSession();

          // Reiniciar pomodoro directamente al estado setup y desvincular
          this.isBreak.set(false);
          this.totalSessionTime.set(this.focusDuration() * 60);
          this.timeLeft.set(this.focusDuration() * 60);
          this.arenaState.set('setup');
          this.emergencyPauseActive.set(false);
          this.objectiveCompleted.set(null);
          this.activeObjective.set('');
          this.objectiveInput.set('');
          this.associatedIdeaId.set(null);
          this.objectiveConfirmed.set(false);
          localStorage.removeItem('activeObjectiveDraft');
          localStorage.removeItem('activeObjectiveIdeaId');
          localStorage.removeItem('focus-session-objective');
          localStorage.removeItem('focus-session-idea-id');
          this.broadcastPresence();

          // Mostrar modal informativo de cancelación
          this.showInterruptedModal.set(true);
          this.playAbandonmentSadSound();

          if (this.membership.isPremium() && this.coworkingMode() === 'comunitario') {
            this.showToast(`⚠️ Sesión cancelada por inactividad (-${penaltyCoinsInterrupted} ProCoins, -50 XP). ${currentBossName} recuperó +${healHpInterrupted} HP.`, 'danger');
          } else if (this.membership.isPremium()) {
            this.showToast(`⚠️ Sesión cancelada por inactividad (-${penaltyCoinsInterrupted} ProCoins, -50 XP).`, 'danger');
          } else {
            this.showToast(`⚠️ Sesión cancelada por inactividad (-${penaltyCoinsInterrupted} ProCoins).`, 'danger');
          }

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
  async confirmAbandon() {
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

    // 1. Detener temporizadores y sonidos de inmediato
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    this.clearPersistedSession();

    // 2. Desvincular objetivo al abandonar
    this.activeObjective.set('');
    this.objectiveInput.set('');
    this.associatedIdeaId.set(null);
    this.objectiveConfirmed.set(false);
    localStorage.removeItem('activeObjectiveDraft');
    localStorage.removeItem('activeObjectiveIdeaId');
    localStorage.removeItem('focus-session-objective');
    localStorage.removeItem('focus-session-idea-id');

    // 3. Obtener penalización y curación según el avatar equipado
    const penaltyCoins = this.currentAvatarPausePenalty();
    const healHp = this.bossHealAmount();

    // 4. Deducir monedas en el cliente de inmediato con piso en 0
    this.membership.proCoins.update(coins => Math.max(0, coins - penaltyCoins));
    this.membership.addAbandonedSession();
    this.membership.addWeeklyHonorPoints(-20);
    this.membership.saveConsolidatedUserData();

    // 5. Resetear completamente la pantalla y el temporizador al estado 'setup'
    this.isBreak.set(false);
    this.totalSessionTime.set(this.focusDuration() * 60);
    this.timeLeft.set(this.focusDuration() * 60);
    this.arenaState.set('setup');
    this.emergencyPauseActive.set(false);
    this.sessionEndingStatus.set('abandoned');
    this.manuallyAbandoned.set(false);
    this.objectiveCompleted.set(null);
    this.broadcastPresence();

    // 6. Registrar intento diario
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newAttempt = { status: 'abandoned' as const, time: timeStr, durationSeconds: actualSeconds };
    const updatedAttempts = [...this.dailyAttempts(), newAttempt];
    this.dailyAttempts.set(updatedAttempts);
    localStorage.setItem('daily-attempts', JSON.stringify(updatedAttempts));

    // 7. Reproducir sonido triste de abandono
    this.playAbandonmentSadSound();

    // 8. Efectos y notificaciones según tipo de cuenta
    const bossName = this.bossService.activeBoss().name || 'El Jefe';
    if (this.membership.isPremium()) {
      // Castigo de -50 XP por abandonar (exclusivo Premium)
      this.membership.addFocusPoints(-50);
      // Cura al jefe por abandono en comunidad (solo usuarios Premium afectan al jefe)
      if (this.coworkingMode() === 'comunitario') {
        this.bossService.healBoss(this.userName() || 'Guerrero Anónimo', healHp);
        this.addComunidadEvent(`💔 ${this.userName() || 'Un Guerrero'} abandonó su sesión (-${penaltyCoins} ProCoins). ${bossName} recuperó +${healHp} HP.`, 'reaction');
        this.showToast(`💔 Has abandonado la sesión (-${penaltyCoins} ProCoins, -50 XP). ${bossName} recuperó +${healHp} HP.`, 'danger');
      } else {
        this.showToast(`💔 Has abandonado la sesión (-${penaltyCoins} ProCoins, -50 XP).`, 'danger');
      }
    } else {
      // Planes básicos pierden monedas pero no afectan al jefe de la comunidad
      this.showToast(`💔 Has abandonado la sesión (-${penaltyCoins} ProCoins).`, 'danger');
    }

    // 9. Liquidar en Supabase en segundo plano
    this.settleCurrentSession('abandoned', 'no', currentObjective, currentIdeaId).catch(err => {
      console.warn('[Supabase Settle Abandon Error]', err);
    });
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
      const plannedSeconds = Math.max(60, this.totalSessionTime() > 0 ? this.totalSessionTime() : this.focusDuration() * 60);
      const actualSeconds = currentStatus === 'completed'
        ? plannedSeconds
        : Math.max(0, plannedSeconds - Math.max(0, this.timeLeft()));
      const dedicatedMins = Math.max(1, Math.round(actualSeconds / 60));

      const newAttempt = { status: currentStatus as 'completed' | 'abandoned' | 'interrupted', time: timeStr, durationSeconds: actualSeconds };
      const updatedAttempts = [...this.dailyAttempts(), newAttempt];
      this.dailyAttempts.set(updatedAttempts);
      localStorage.setItem('daily-attempts', JSON.stringify(updatedAttempts));

      // Asignar puntos y recompensas
      if (currentStatus === 'completed') {
        const isShared = this.coworkingMode() === 'comunitario';
        const sessionId = `session-${Date.now()}`;
        const equippedAvatar = this.membership.selectedAvatar() || 'gato';

        const reward = this.membership.rewardCompletedSession(sessionId, isShared, actualSeconds, equippedAvatar);
        const coinsEarned = reward.coins;
        const tomatoesEarned = reward.tomatoes;
        
        // Daño al Boss por completar el Pomodoro en la Comunidad (únicamente usuarios Premium pueden infligir daño)
        if (isShared) {
          if (this.membership.isPremium()) {
            const damage = this.membership.getAvatarDamagePoints(equippedAvatar);
            this.bossService.dealDamage(damage);
            this.membership.addWeeklyHonorPoints(Math.round(damage / 10));
            
            const eventText = `🗡️ ${this.userName()} completó su Pomodoro (+${coinsEarned} ProCoins) e infligió ${damage} DMG al Boss.`;
            this.addComunidadEvent(eventText, 'complete');
            this.showToastFeedback(`🎉 ¡Pomodoro completado! Ganaste +${coinsEarned} ProCoins (+${tomatoesEarned} 🍅) e infligiste ${damage} DMG al Boss.`, 'success');
          } else {
            const eventText = `🍅 ${this.userName()} completó su sesión de enfoque (+${coinsEarned} ProCoins).`;
            this.addComunidadEvent(eventText, 'complete');
            this.showToastFeedback(`🎉 ¡Sesión completada! Ganaste +${coinsEarned} ProCoins (+${tomatoesEarned} 🍅).`, 'success');
          }
        } else {
          this.showToastFeedback(`🎉 ¡Pomodoro completado! Ganaste +${coinsEarned} ProCoins (+${tomatoesEarned} 🍅).`, 'success');
        }
        
        // Recompensa adicional por objetivo cumplido (Pregunta 2)
        const hasObjective = this.hasCustomObjective();
        const objCompleted = hasObjective ? (this.objectiveCompleted() || 'yes') : 'no';
        if (hasObjective && (objCompleted === 'yes' || objCompleted === 'progress')) {
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

        if (targetIdeaId) {
          // Acumular el tiempo dedicado en la nota/idea
          await this.membership.addDedicatedTimeToIdea(targetIdeaId, dedicatedMins);
        }

        // Liquidar e insertar la sesión inmutable en Supabase ANTES de resetear el estado local
        await this.settleCurrentSession(
          currentStatus as 'completed' | 'abandoned' | 'interrupted',
          objCompleted as any,
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
          this.objectiveInput.set('');
          this.associatedIdeaId.set(null);
          this.objectiveConfirmed.set(false);
          localStorage.removeItem('activeObjectiveDraft');
          localStorage.removeItem('activeObjectiveIdeaId');
          localStorage.removeItem('focus-session-objective');
          localStorage.removeItem('focus-session-idea-id');
          this.showToastFeedback('🎯 ¡Objetivo completado y archivado en tus victorias!', 'success');
        } else {
          // Si el objetivo NO fue completado (no lo logró, avanzado o sin marcar), se desvincula en automático
          this.activeObjective.set('');
          this.objectiveInput.set('');
          this.associatedIdeaId.set(null);
          this.objectiveConfirmed.set(false);
          localStorage.removeItem('activeObjectiveDraft');
          localStorage.removeItem('activeObjectiveIdeaId');
          localStorage.removeItem('focus-session-objective');
          localStorage.removeItem('focus-session-idea-id');

          if (targetIdeaId) {
            this.showToastFeedback(`⏱️ Se registraron +${dedicatedMins}m en tu tarea. Objetivo desvinculado automáticamente.`, 'info');
          } else if (currentObjective && currentObjective !== 'Sesión de Enfoque') {
            this.showToastFeedback('Objetivo desvinculado automáticamente.', 'info');
          }
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
      this.broadcastPresence();
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
    this.broadcastPresence();
  }

  // Verificación si el cronómetro actual tiene habilitada la función de arrastre
  isDraggableTimer = computed(() => {
    return false; // Drag disabled for all objects
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
    this.broadcastPresence();
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

  // Cambiar tema global y persistir en Supabase
  changeTheme(theme: 'samurai' | 'cyberpunk' | 'aurora' | 'zen') {
    this.membership.setTheme(theme);
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
    this.membership.setFocusSetting('focus-bg-sound', sound);
    
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
    this.membership.setFocusSetting('focus-break-bg-sound', sound);
    
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
    this.membership.setFocusSetting('focus-long-break-bg-sound', sound);
    
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

    const vol = (this.backgroundVolume() !== undefined && !isNaN(this.backgroundVolume()) && this.backgroundVolume() > 0) 
      ? this.backgroundVolume() 
      : 0.8;

    try {
      if (soundOption.type === 'file' && soundOption.file) {
        const audio = new Audio('assets/sounds/' + soundOption.file);
        audio.loop = true;
        audio.volume = vol;
        audio.play().catch(e => console.warn('Audio play background error:', e));
        this.currentBackgroundAudio = audio;
      } else if (soundOption.type === 'ticking' && soundOption.files && soundOption.files.length > 0) {
        let tickIdx = 0;
        const playTick = () => {
          const file = soundOption.files![tickIdx % soundOption.files!.length];
          tickIdx++;
          const a = new Audio('assets/sounds/' + file);
          a.volume = vol;
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
        this.backgroundGain.gain.value = vol;

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
    this.membership.setFocusSetting('focus-bg-volume', vol.toString());
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
    const sound = this.backgroundSound();
    if (this.isPlayingPreview() && this.previewingSoundId() === sound) {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewingSoundId.set(null);
      if (this.previewSoundTimeout) {
        clearTimeout(this.previewSoundTimeout);
        this.previewSoundTimeout = null;
      }
      return;
    }

    if (sound === 'off') {
      this.showToast('Selecciona un sonido de fondo para escuchar la prueba', 'info');
      return;
    }

    this.stopBackgroundSound();
    this.isPlayingPreview.set(true);
    this.previewingSoundId.set(sound);
    this.startBackgroundAudio(sound);

    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
    }
    this.previewSoundTimeout = setTimeout(() => {
      if (this.isPlayingPreview() && (!this.timerRunning() || this.arenaState() !== 'active')) {
        this.stopBackgroundSound();
        this.isPlayingPreview.set(false);
        this.previewingSoundId.set(null);
      }
      this.previewSoundTimeout = null;
    }, 8000);
  }

  togglePreviewBreakBackgroundSound() {
    const sound = this.breakBackgroundSound();
    if (this.isPlayingPreview() && this.previewingSoundId() === sound) {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewingSoundId.set(null);
      if (this.previewSoundTimeout) {
        clearTimeout(this.previewSoundTimeout);
        this.previewSoundTimeout = null;
      }
      return;
    }

    if (sound === 'off') {
      this.showToast('Selecciona un sonido de fondo para escuchar la prueba', 'info');
      return;
    }

    this.stopBackgroundSound();
    this.isPlayingPreview.set(true);
    this.previewingSoundId.set(sound);
    this.startBackgroundAudio(sound);

    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
    }
    this.previewSoundTimeout = setTimeout(() => {
      if (this.isPlayingPreview() && (!this.timerRunning() || this.arenaState() !== 'active')) {
        this.stopBackgroundSound();
        this.isPlayingPreview.set(false);
        this.previewingSoundId.set(null);
      }
      this.previewSoundTimeout = null;
    }, 8000);
  }

  togglePreviewLongBreakBackgroundSound() {
    const sound = this.longBreakBackgroundSound();
    if (this.isPlayingPreview() && this.previewingSoundId() === sound) {
      this.stopBackgroundSound();
      this.isPlayingPreview.set(false);
      this.previewingSoundId.set(null);
      if (this.previewSoundTimeout) {
        clearTimeout(this.previewSoundTimeout);
        this.previewSoundTimeout = null;
      }
      return;
    }

    if (sound === 'off') {
      this.showToast('Selecciona un sonido de fondo para escuchar la prueba', 'info');
      return;
    }

    this.stopBackgroundSound();
    this.isPlayingPreview.set(true);
    this.previewingSoundId.set(sound);
    this.startBackgroundAudio(sound);

    if (this.previewSoundTimeout) {
      clearTimeout(this.previewSoundTimeout);
    }
    this.previewSoundTimeout = setTimeout(() => {
      if (this.isPlayingPreview() && (!this.timerRunning() || this.arenaState() !== 'active')) {
        this.stopBackgroundSound();
        this.isPlayingPreview.set(false);
        this.previewingSoundId.set(null);
      }
      this.previewSoundTimeout = null;
    }, 8000);
  }

  toggleFocusSound(enabled: boolean) {
    this.soundEnabled.set(enabled);
    this.membership.setFocusSetting('focus-sound-enabled', String(enabled));
  }

  toggleBreakSound(enabled: boolean) {
    this.breakSoundEnabled.set(enabled);
    this.membership.setFocusSetting('focus-break-sound-enabled', String(enabled));
  }

  setEndSessionSound(soundId: string) {
    this.endSessionSound.set(soundId);
    this.membership.setFocusSetting('focus-end-sound', soundId);
    this.previewAlarmSound(soundId);
  }

  setBreakEndSound(soundId: string) {
    this.breakEndSound.set(soundId);
    this.membership.setFocusSetting('focus-break-sound', soundId);
    this.previewAlarmSound(soundId);
  }

  setLongBreakEndSound(soundId: string) {
    this.longBreakEndSound.set(soundId);
    this.membership.setFocusSetting('focus-long-break-sound', soundId);
    this.previewAlarmSound(soundId);
  }

  previewAlarmSound(soundId: string) {
    if (this.currentEndAudio) {
      this.currentEndAudio.pause();
      this.currentEndAudio = null;
    }
    if (!soundId || soundId === 'off') return;
    const sound = this.endSessionSoundsList.find(s => s.id === soundId);
    if (!sound || !sound.file) return;
    try {
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
    if (this.consoleHintTimeout) clearTimeout(this.consoleHintTimeout);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.communityInterval) clearInterval(this.communityInterval);
    if (this.bodyDoublingInterval) clearInterval(this.bodyDoublingInterval);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.communityPresenceChannel && this.supabaseService.isConfigured()) {
      this.supabaseService.client.removeChannel(this.communityPresenceChannel);
      this.communityPresenceChannel = null;
    }
    if (this.motivationsChannel && this.supabaseService.isConfigured()) {
      try {
        this.supabaseService.client.removeChannel(this.motivationsChannel);
        this.motivationsChannel = null;
      } catch (e) {}
    }

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
    this.membership.setFocusSetting('focus-duration', String(this.focusDuration()));
    this.membership.setFocusSetting('break-duration', String(this.breakDuration()));
    this.membership.setFocusSetting('long-break-interval', String(this.longBreakInterval()));
    this.membership.setFocusSetting('long-break-duration', String(this.longBreakDuration()));

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

  resetDefaultFocusSettings() {
    this.stopTimerLoop();
    this.stopBackgroundSound();

    // 1. Tiempos y Ciclos: 25 min pomodoro, 5 min descanso, 15 min descanso largo, 4 ciclos
    this.focusDuration.set(25);
    this.breakDuration.set(5);
    this.longBreakDuration.set(15);
    this.longBreakInterval.set(4);

    // 2. Sin audio para nada (Silencio)
    this.backgroundSound.set('off');
    this.breakBackgroundSound.set('off');
    this.longBreakBackgroundSound.set('off');
    this.endSessionSound.set('off');
    this.breakEndSound.set('off');
    this.longBreakEndSound.set('off');
    this.soundEnabled.set(false);
    this.breakSoundEnabled.set(false);
    this.abandonSoundEnabled.set(false);

    // 3. Acceso rápido a batería activo
    this.showBatteryButtonInArena.set(true);

    // 4. Guardar configuración persistente
    this.membership.setFocusSetting('focus-duration', '25');
    this.membership.setFocusSetting('break-duration', '5');
    this.membership.setFocusSetting('long-break-duration', '15');
    this.membership.setFocusSetting('long-break-interval', '4');
    this.membership.setFocusSetting('focus-bg-sound', 'off');
    this.membership.setFocusSetting('focus-break-bg-sound', 'off');
    this.membership.setFocusSetting('focus-long-break-bg-sound', 'off');
    this.membership.setFocusSetting('focus-end-sound', 'off');
    this.membership.setFocusSetting('focus-break-sound', 'off');
    this.membership.setFocusSetting('focus-long-break-sound', 'off');
    this.membership.setFocusSetting('sound-enabled', 'false');
    this.membership.setFocusSetting('focus-break-sound-enabled', 'false');
    this.membership.setFocusSetting('abandon-sound-enabled', 'false');
    this.membership.setFocusSetting('show-battery-button-in-arena', 'true');

    // 5. Aplicar al temporizador en vivo
    if (!this.isBreak()) {
      this.totalSessionTime.set(25 * 60);
      this.timeLeft.set(25 * 60);
    } else {
      const isLongBreak = this.completedPomodoros() > 0 && (this.completedPomodoros() % 4 === 0);
      const duration = isLongBreak ? 15 : 5;
      this.totalSessionTime.set(duration * 60);
      this.timeLeft.set(duration * 60);
    }

    this.showToastFeedback('Configuración restablecida: 25 min enfoque, 5 min descanso, 15 min descanso largo, 4 ciclos, sin audio y batería activa.', 'success');
  }

  updateFocusDuration(val: number | string | null) {
    if (val === null || val === undefined || val === '') return;
    const parsed = parseInt(String(val), 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const num = Math.min(180, Math.max(1, parsed));
    this.focusDuration.set(num);
    this.applyTimeSettings();
  }

  onFocusDurationBlur() {
    if (!this.focusDuration() || this.focusDuration() < 1) {
      this.focusDuration.set(25);
      this.applyTimeSettings();
    }
  }

  updateBreakDuration(val: number | string | null) {
    if (val === null || val === undefined || val === '') return;
    const parsed = parseInt(String(val), 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const num = Math.min(60, Math.max(1, parsed));
    this.breakDuration.set(num);
    this.applyTimeSettings();
  }

  onBreakDurationBlur() {
    if (!this.breakDuration() || this.breakDuration() < 1) {
      this.breakDuration.set(5);
      this.applyTimeSettings();
    }
  }

  updateLongBreakDuration(val: number | string | null) {
    if (val === null || val === undefined || val === '') return;
    const parsed = parseInt(String(val), 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const num = Math.min(120, Math.max(1, parsed));
    this.longBreakDuration.set(num);
    this.applyTimeSettings();
  }

  onLongBreakDurationBlur() {
    if (!this.longBreakDuration() || this.longBreakDuration() < 1) {
      this.longBreakDuration.set(15);
      this.applyTimeSettings();
    }
  }

  updateLongBreakInterval(val: number | string | null) {
    if (val === null || val === undefined || val === '') return;
    const parsed = parseInt(String(val), 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const num = Math.min(24, Math.max(1, parsed));
    this.longBreakInterval.set(num);
    this.applyTimeSettings();
  }

  onLongBreakIntervalBlur() {
    if (!this.longBreakInterval() || this.longBreakInterval() < 1) {
      this.longBreakInterval.set(4);
      this.applyTimeSettings();
    }
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
    // Si el cronómetro activo es de órbitas (Sol, Satélite, Luna), solo se permiten fondos espaciales
    const spaceBgs: FocusBackgroundType[] = [
      'space_deep_void', 'space_silent_nebula', 'space_milky_zenith',
      'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon'
    ];
    if (this.isOrbitalTimer() && !spaceBgs.includes(bg)) {
      return;
    }
    this.activeBackground.set(bg);
    this.membership.setFocusSetting('focus-active-bg', bg);
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
    if (bg === 'space_deep_void') return 'assets/themes/space_deep_void_thumb.webp';
    if (bg === 'space_silent_nebula') return 'assets/themes/space_silent_nebula_thumb.webp';
    if (bg === 'space_milky_zenith') return 'assets/themes/space_milky_zenith_thumb.webp';
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
      case 'color_midnight_navy': return 'Azul Medianoche';
      case 'color_espresso_charcoal': return 'Café Espresso';
      case 'color_forest_matcha': return 'Verde Bosque';
      case 'color_executive_burgundy': return 'Borgoña Ejecutivo';
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
      case 'space_deep_void': return 'Vacío Profundo';
      case 'space_silent_nebula': return 'Nebulosa Silente';
      case 'space_milky_zenith': return 'Vía Láctea Cenital';
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
    if (bg === 'off') return 'Fondo por defecto del tema activo (Cero distracciones visuales)';
    switch (bg) {
      case 'color_midnight_navy': return 'Atmósfera profesional Azul Medianoche Ejecutivo para concentración y lucidez';
      case 'color_espresso_charcoal': return 'Atmósfera profesional Café Espresso cálido y sobrio';
      case 'color_forest_matcha': return 'Atmósfera profesional Verde Bosque Zen anti-fatiga visual';
      case 'color_executive_burgundy': return 'Atmósfera profesional Borgoña Ejecutivo de lujo refinado';
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
      case 'space_deep_void': return 'Fondo cósmico minimalista "Vacío Estelar Profundo" con estrellas finas';
      case 'space_silent_nebula': return 'Fondo cósmico sutil "Nebulosa Silente" en tonos azul medianoche y violeta tenue';
      case 'space_milky_zenith': return 'Fondo cósmico panorámico "Vía Láctea Cenital" con horizonte estelar sereno';
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
    this.membership.setFocusSetting('focus-timer-style', style);

    const spaceBgs: FocusBackgroundType[] = [
      'space_deep_void', 'space_silent_nebula', 'space_milky_zenith',
      'lofi_space_cosmos', 'lofi_space_nebula', 'lofi_space_moon'
    ];

    // Auto-asignación y validación de fondos según el cronómetro
    if (style === 'lighthouse') {
      this.activeBackground.set('lofi_lighthouse_ocean');
      this.membership.setFocusSetting('focus-active-bg', 'lofi_lighthouse_ocean');
    } else if (style === 'titanic') {
      this.activeBackground.set('lofi_titanic_ocean');
      this.membership.setFocusSetting('focus-active-bg', 'lofi_titanic_ocean');
    } else {
      // Si se cambia a cualquier otro reloj que no sea marítimo y el fondo actual es marítimo exclusivo, reasignar
      if (this.activeBackground() === 'lofi_titanic_ocean' || this.activeBackground() === 'lofi_lighthouse_ocean') {
        if (style === 'solar') {
          this.activeBackground.set('lofi_space_cosmos');
          this.membership.setFocusSetting('focus-active-bg', 'lofi_space_cosmos');
        } else if (style === 'satellite') {
          this.activeBackground.set('lofi_space_nebula');
          this.membership.setFocusSetting('focus-active-bg', 'lofi_space_nebula');
        } else if (style === 'moon') {
          this.activeBackground.set('lofi_space_moon');
          this.membership.setFocusSetting('focus-active-bg', 'lofi_space_moon');
        } else {
          this.activeBackground.set('theme_autumn');
          this.membership.setFocusSetting('focus-active-bg', 'theme_autumn');
        }
      } else {
        if (style === 'solar' || style === 'satellite' || style === 'moon') {
          const cur = this.activeBackground();
          if (!spaceBgs.includes(cur)) {
            const defaultOrbitalBg = style === 'solar' ? 'lofi_space_cosmos' : (style === 'satellite' ? 'lofi_space_nebula' : 'lofi_space_moon');
            this.setBackground(defaultOrbitalBg);
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
    this.broadcastPresence();

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
      this.membership.equipAvatar(avatar);
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
      if (this.communityActiveTab() === 'boss') {
        this.communityActiveTab.set('strategy');
      }
      this.showToast('👤 Modo Solitario activado (100% privado).', 'info');
      return;
    }

    if (!this.membership.isPremium()) {
      this.showPaywallModal.set(true);
      return;
    }

    this.coworkingMode.set('comunitario');
    this.showToast('👥 Modo Comunidad activado (combate Boss y guerreros en vivo).', 'info');
  }

  async initializeRealComunidadUsers() {
    if (!this.supabaseService.isConfigured()) {
      this.comunidadUsers.set([]);
      return;
    }

    try {
      const currentUserId = this.supabaseService.currentUser()?.id;
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('id, username, selected_avatar, focus_tomatoes, is_premium, last_focus_date')
        .order('last_focus_date', { ascending: false, nullsFirst: false })
        .limit(20);

      if (!error && data) {
        this.dbRegisteredProfiles = data.filter(p => {
          if (currentUserId && p.id === currentUserId) return false;
          return true;
        });
        
        // Lista inicial a partir de los perfiles reales registrados
        const initialList = this.dbRegisteredProfiles.map((prof, idx) => ({
          id: prof.id,
          userId: prof.id,
          name: prof.username || 'Guerrero',
          avatar: prof.selected_avatar || 'gato',
          status: 'idle' as const,
          mission: 'En el campamento',
          timeLeft: 0,
          percentage: 0,
          target_end_time: null,
          total_duration: 1500,
          desk: idx + 1,
          is_live: false,
          reaction: ''
        }));
        this.comunidadUsers.set(initialList);
      }
    } catch (e) {
      console.warn('[Error loading real community profiles]', e);
    }
  }

  private setupPresenceChannel() {
    if (!this.supabaseService.isConfigured()) return;

    this.communityPresenceChannel = this.supabaseService.client.channel('community_focus_room', {
      config: {
        presence: {
          key: this.presenceClientId
        }
      }
    });

    this.communityPresenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = this.communityPresenceChannel.presenceState();
        this.handlePresenceSync(presenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        if (newPresences && newPresences.length > 0) {
          const p = newPresences[0];
          if (p.client_id !== this.presenceClientId && p.name) {
            this.addComunidadEvent(`👥 ${p.name} se unió a la sala.`, 'join');
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        if (leftPresences && leftPresences.length > 0) {
          const p = leftPresences[0];
          if (p.client_id !== this.presenceClientId && p.name) {
            this.addComunidadEvent(`👋 ${p.name} salió de la sala.`, 'break');
          }
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }: any) => {
        if (payload && payload.to === this.userName()) {
          this.userActiveReaction.set(payload.emoji);
          this.addComunidadEvent(`¡${payload.from} te envió energía! ${payload.emoji}`, 'reaction');
          if (this.arenaState() !== 'active') {
            this.showToast(`¡${payload.from} te envió apoyo! ${payload.emoji}`, 'info');
          }
          setTimeout(() => {
            if (this.userActiveReaction() === payload.emoji) {
              this.userActiveReaction.set('');
            }
          }, 3000);
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await this.broadcastPresence();
        }
      });
  }

  private handlePresenceSync(presenceState: any) {
    const liveUsersMap = new Map<string, any>();
    const now = Date.now();

    Object.keys(presenceState).forEach(key => {
      if (key === this.presenceClientId) return;

      const presences = presenceState[key];
      if (Array.isArray(presences) && presences.length > 0) {
        const p = presences[presences.length - 1];
        if (p.client_id === this.presenceClientId) return;

        const uid = p.client_id || p.user_id || key;
        const targetEndTime = Number(p.target_end_time);
        let remaining = 0;
        let pct = 0;

        const total = Number(p.total_duration) || 1500;
        if (targetEndTime && !isNaN(targetEndTime) && p.status === 'focused') {
          const rawRemaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));
          remaining = Math.min(total, rawRemaining);
          pct = Math.min(100, Math.floor(((total - remaining) / total) * 100));
        } else if (p.status === 'focused') {
          remaining = total;
          pct = 0;
        } else if (targetEndTime && !isNaN(targetEndTime) && (p.status === 'break' || p.status === 'paused')) {
          remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));
        }

        liveUsersMap.set(uid, {
          id: uid,
          userId: p.user_id || uid,
          name: p.name || 'Guerrero',
          avatar: p.avatar || 'gato',
          status: p.status || 'idle',
          mission: p.is_private ? (p.status === 'focused' ? 'Enfoque Activo' : (p.status === 'paused' ? '⏸️ En pausa de emergencia' : (p.status === 'break' ? 'Pausa de descanso' : 'En el campamento'))) : (p.mission || (p.status === 'paused' ? '⏸️ En pausa de emergencia' : (p.status === 'break' ? 'Pausa de descanso' : (p.status === 'focused' ? 'Enfoque Activo' : 'En el campamento')))),
          is_private: !!p.is_private,
          timeLeft: remaining,
          percentage: pct,
          target_end_time: targetEndTime || null,
          total_duration: total,
          is_live: p.status !== 'idle',
          reaction: ''
        });
      }
    });

    const liveUsersList = Array.from(liveUsersMap.values());
    const currentUserId = this.supabaseService.currentUser()?.id;

    // Obtener lista de IDs y nombres de usuarios actualmente en vivo para no duplicarlos
    const liveUserIds = new Set(liveUsersList.map(u => u.userId));
    const liveNames = new Set(liveUsersList.map(u => u.name.toLowerCase()));

    const dbUsersList: any[] = [];
    this.dbRegisteredProfiles.forEach((prof, idx) => {
      // Omitir mi propio perfil en la lista de otros guerreros
      if (currentUserId && prof.id === currentUserId) return;
      // Si el usuario ya está conectado en vivo, no mostrarlo duplicado como inactivo
      if (liveUserIds.has(prof.id)) return;
      if (prof.username && liveNames.has(prof.username.toLowerCase())) return;

      dbUsersList.push({
        id: prof.id,
        userId: prof.id,
        name: prof.username || 'Guerrero',
        avatar: prof.selected_avatar || 'gato',
        status: 'idle' as const,
        mission: 'En el campamento',
        timeLeft: 0,
        percentage: 0,
        target_end_time: null,
        total_duration: 1500,
        desk: idx + 1,
        is_live: false,
        reaction: ''
      });
    });

    const combined = [...liveUsersList, ...dbUsersList];
    this.comunidadUsers.set(combined);
    this.globalFocusedCount.set(Math.max(1, liveUsersList.filter(u => u.status === 'focused').length + ((this.arenaState() === 'active' || this.arenaState() === 'countdown') && !this.isBreak() && !this.emergencyPauseActive() ? 1 : 0)));
  }

  async broadcastPresence() {
    if (!this.communityPresenceChannel || !this.supabaseService.isConfigured()) return;
    const user = this.supabaseService.currentUser();
    const isPaused = this.emergencyPauseActive();
    const isFocusing = !isPaused && !this.isBreak() && (this.arenaState() === 'active' || this.arenaState() === 'countdown' || this.timerRunning());
    const isBreaking = !isPaused && this.isBreak() && (this.arenaState() === 'active' || this.arenaState() === 'countdown' || this.timerRunning());
    
    let status: 'focused' | 'break' | 'paused' | 'idle' = 'idle';
    let targetEnd: number | null = null;
    let mission = 'En el campamento';

    if (isPaused) {
      status = 'paused';
      targetEnd = Date.now() + (this.emergencyTimeLeft() * 1000);
      mission = '⏸️ En pausa de emergencia';
    } else if (isFocusing) {
      status = 'focused';
      const countdownExtra = this.arenaState() === 'countdown' ? Math.max(0, this.countdownValue()) : 0;
      targetEnd = Date.now() + ((countdownExtra + this.timeLeft()) * 1000);
      mission = this.hideMyObjectiveInCommunity()
        ? 'Enfoque Activo'
        : (this.activeObjective()?.trim() || 'Enfoque Activo');
    } else if (isBreaking) {
      status = 'break';
      const countdownExtra = this.arenaState() === 'countdown' ? Math.max(0, this.countdownValue()) : 0;
      targetEnd = Date.now() + ((countdownExtra + this.timeLeft()) * 1000);
      mission = 'Pausa de descanso';
    } else {
      status = 'idle';
      targetEnd = null;
      mission = (this.activeObjective()?.trim() && !this.hideMyObjectiveInCommunity())
        ? this.activeObjective().trim()
        : 'En el campamento';
    }

    try {
      await this.communityPresenceChannel.track({
        client_id: this.presenceClientId,
        user_id: user?.id || this.presenceClientId,
        name: this.userName() || 'Guerrero',
        avatar: this.membership.selectedAvatar() || 'gato',
        status,
        target_end_time: targetEnd,
        total_duration: isPaused ? 120 : (this.totalSessionTime() || (this.focusDuration() * 60) || 1500),
        mission,
        is_private: this.hideMyObjectiveInCommunity(),
        updated_at: Date.now()
      });
    } catch (e) {
      console.warn('[Presence Track Error]', e);
    }
  }

  toggleHideMyObjective(val: boolean) {
    this.hideMyObjectiveInCommunity.set(val);
    this.membership.setFocusSetting('hide-objective-in-community', String(val));
    this.broadcastPresence();
  }

  sendSupportToUser(userName: string, emoji: string) {
    this.addComunidadEvent(`Le enviaste ${emoji} a ${userName}`, 'reaction');
    
    if (this.communityPresenceChannel && this.supabaseService.isConfigured()) {
      this.communityPresenceChannel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
          from: this.userName(),
          to: userName,
          emoji
        }
      });
    }

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

  tickCommunity() {
    const now = Date.now();
    const updatedUsers = this.comunidadUsers().map(u => {
      const targetEnd = Number(u.target_end_time);
      const total = Number(u.total_duration) || 1500;
      if (targetEnd && !isNaN(targetEnd) && u.status === 'focused') {
        const rawRemaining = Math.max(0, Math.floor((targetEnd - now) / 1000));
        const newTime = Math.min(total, rawRemaining);
        const pct = Math.min(100, Math.floor(((total - newTime) / total) * 100));
        return {
          ...u,
          timeLeft: newTime,
          percentage: pct
        };
      } else if (u.status === 'focused' && (!targetEnd || isNaN(targetEnd))) {
        return {
          ...u,
          timeLeft: total,
          percentage: 0
        };
      } else if (targetEnd && !isNaN(targetEnd) && (u.status === 'break' || u.status === 'paused')) {
        const newTime = Math.max(0, Math.floor((targetEnd - now) / 1000));
        return {
          ...u,
          timeLeft: newTime,
          percentage: 0
        };
      }
      return u;
    });

    this.comunidadUsers.set(updatedUsers);

    // Daño continuo del resto de usuarios en el Comunidad al Boss (Solo usuarios en vivo y enfocados)
    if (this.coworkingMode() === 'comunitario' && this.arenaState() === 'active' && !this.isBreak() && !this.emergencyPauseActive()) {
      const activePartners = this.comunidadUsers().filter(u => u.status === 'focused' && u.is_live);
      const activePartnersCount = activePartners.length;
      if (activePartnersCount > 0) {
        this.bossService.tickContinuousDamage(activePartnersCount * 4);
      }
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
