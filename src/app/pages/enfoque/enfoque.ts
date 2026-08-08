import { Component, signal, computed, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-enfoque',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './enfoque.html',
  styleUrl: './enfoque.css',
})
export class Enfoque implements OnDestroy {
  currentTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>(
    (localStorage.getItem('procrastina-theme') as any) || 'samurai'
  );
  userName = signal('Ramiro');

  // Escudo acústico / Ruido de fondo en vivo
  backgroundSound = signal<'off' | 'cafe' | 'lluvia'>('off');
  backgroundVolume = signal(0.4);

  // Web Audio Context refs
  private backgroundAudioCtx: AudioContext | null = null;
  private backgroundSource: AudioBufferSourceNode | null = null;
  private backgroundGain: GainNode | null = null;

  // Mi Avatar / Guardián activo (Consistencia con Dojo)
  selectedAvatar = signal<'lobo' | 'leon' | 'buho' | 'zorro' | 'dragon'>('zorro');

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
  completedPomodoros = signal(parseInt(localStorage.getItem('completed-pomodoros') || '0', 10));

  soundEnabled = signal(true);  
  soundType = signal<'zen' | 'digital' | 'chime'>('zen'); 
  coworkingMode = signal<'solo' | 'partner'>('partner');

  // Opciones de sonido para evitar errores de tipado estricto en plantillas Angular
  soundOptions: ('zen' | 'digital' | 'chime')[] = ['zen', 'chime', 'digital'];
  themeOptions: ('samurai' | 'cyberpunk' | 'aurora' | 'zen')[] = ['samurai', 'cyberpunk', 'aurora', 'zen'];

  // Control para mostrar ajustes secundarios de audio
  showSettingsPanel = signal(false);
  showSetupSettings = signal(false);

  // Notas rápidas / Ideas fugaces
  currentDraftIdea = signal('');
  capturedIdeas = signal<string[]>(JSON.parse(localStorage.getItem('captured-ideas') || '[]'));
  isNoteFlying = signal(false);
  showIdeasModal = signal(false);

  openIdeasModal() {
    this.showIdeasModal.set(true);
  }

  closeIdeasModal() {
    this.showIdeasModal.set(false);
  }

  clearAllIdeas() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el baúl de ideas?')) {
      this.capturedIdeas.set([]);
      localStorage.setItem('captured-ideas', '[]');
    }
  }

  sendDraftIdea() {
    const idea = this.currentDraftIdea().trim();
    if (!idea) return;

    this.isNoteFlying.set(true);

    const updatedList = [...this.capturedIdeas(), idea];
    this.capturedIdeas.set(updatedList);
    localStorage.setItem('captured-ideas', JSON.stringify(updatedList));

    this.currentDraftIdea.set('');

    setTimeout(() => {
      this.isNoteFlying.set(false);
    }, 1200);
  }

  removeIdea(index: number) {
    const updatedList = this.capturedIdeas().filter((_, i) => i !== index);
    this.capturedIdeas.set(updatedList);
    localStorage.setItem('captured-ideas', JSON.stringify(updatedList));
  }

  // Objetivo Activo (La batalla de hoy) e Integración Metodológica
  activeObjective = signal('');
  activeMethodology = signal<'sapo' | 'pareto'>('sapo');

  selectMethodology(method: 'sapo' | 'pareto') {
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
  partnerName = signal('Sofía');
  partnerAvatar = signal('lobo'); // Lobo Samurai
  partnerStatus = signal<'focused' | 'left'>('focused');

  // Resultados del Cuestionario Post-Sesión
  sessionEndingStatus = signal<'completed' | 'interrupted' | 'abandoned'>('completed');
  objectiveCompleted = signal<boolean | null>(null);

  labels = computed(() => {
    return {
      logoText: 'Kaizen Focus',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Dojo',
      navZen: 'Arena',
      navTimer: 'Espejo',
      navShield: 'Resultados',
      navIdeas: 'Baúl de Ideas',
      title: 'La Arena',
      desc: 'Tu templo de concentración absoluta.'
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

  constructor(private router: Router) {}

  // Iniciar Flujo: Lanza el Ritual 3-2-1
  startFocusFlow() {
    if (!this.activeObjective().trim()) {
      this.activeObjective.set(
        this.activeMethodology() === 'sapo'
          ? 'Comer mi Sapo del día 🐸'
          : 'Resolver mi 20% de alto impacto 🎯'
      );
    }
    
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.emergencyPauseActive.set(false);
    
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
      this.emergencyTimeLeft.set(120); // Reset a 2 min

      this.emergencyTimer = setInterval(() => {
        if (this.emergencyTimeLeft() > 0) {
          this.emergencyTimeLeft.update(t => t - 1);
          
          // Simular que a la mitad del tiempo de pausa Sofía "abandona" para motivarte
          if (this.emergencyTimeLeft() === 60 && this.coworkingMode() === 'partner') {
            this.partnerStatus.set('left');
          }
        } else {
          // Se acabó el tiempo de pausa -> Sesión Interrumpida automáticamente
          this.stopEmergencyTimer();
          this.sessionEndingStatus.set('interrupted');
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
    this.sessionEndingStatus.set('abandoned');
    this.arenaState.set('summary');
  }

  // Finalizar Cuestionario y Volver al Dojo
  finishSession() {
    this.stopBackgroundSound();
    this.backgroundSound.set('off');

    if (this.sessionEndingStatus() === 'completed') {
      const nextCount = this.completedPomodoros() + 1;
      this.completedPomodoros.set(nextCount);
      localStorage.setItem('completed-pomodoros', nextCount.toString());
    }

    this.arenaState.set('setup');
    this.router.navigate(['/home']);
  }

  // Reiniciar desde Setup
  cancelAndExit() {
    this.stopTimerLoop();
    this.stopEmergencyTimer();
    this.stopBackgroundSound();
    this.backgroundSound.set('off');
    this.arenaState.set('setup');
  }

  // Auxiliares de navegación sidebar
  getAvatarIcon() {
    switch (this.selectedAvatar()) {
      case 'lobo': return 'fa-shield-halved';
      case 'leon': return 'fa-crown';
      case 'buho': return 'fa-glasses';
      case 'dragon': return 'fa-dragon';
      default: return 'fa-mask';
    }
  }

  getAvatarName() {
    switch (this.selectedAvatar()) {
      case 'lobo': return 'Lobo Samurai';
      case 'leon': return 'León Shogun';
      case 'buho': return 'Búho Estratega';
      case 'dragon': return 'Dragón Guardián';
      default: return 'Zorro Ninja';
    }
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

  updateBackgroundSound(sound: 'off' | 'cafe' | 'lluvia') {
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

      const buffer = sound === 'cafe'
        ? this.createBrownNoiseBuffer(this.backgroundAudioCtx)
        : this.createRainNoiseBuffer(this.backgroundAudioCtx);

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
    this.pomodoroTimer = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(t => t - 1);
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
}
