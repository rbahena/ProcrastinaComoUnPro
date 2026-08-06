import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-enfoque',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './enfoque.html',
  styleUrl: './enfoque.css',
})
export class Enfoque implements OnInit, OnDestroy {
  // Tema Actual
  currentTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>('samurai');
  userName = signal('Guerrero');

  // Rituales (Mel Robbins 3-2-1)
  ritualState = signal<'idle' | 'counting' | 'action'>('idle');
  ritualCount = signal(3);
  private ritualTimer: any = null;

  // Zen Pomodoro
  timeLeft = signal(25 * 60); // 25 min default
  timerRunning = signal(false);
  isBreak = signal(false);
  focusSessionsCompleted = signal(0);
  private pomodoroTimer: any = null;

  // Web Audio API Noise Generator
  private audioCtx: AudioContext | null = null;
  private noiseNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  activeNoiseType = signal<'none' | 'brown' | 'rain'>('none');
  noiseVolume = signal(0.15); // Volumen por defecto

  // Diccionario de textos por tema
  private readonly THEME_LABELS = {
    samurai: {
      logoText: 'Camino del Guerrero',
      logoIcon: 'fa-torii-gate',
      navTasks: 'Bitácora',
      navZen: 'Enfoque Zen',
      navTimer: 'Fechas',
      navShield: 'Bloqueador',
      subtitle: 'El camino de la katana mental',
      title: 'Dojo de Enfoque',
      desc: 'Desenvaina tu concentración. Practica la respiración del guerrero y silencia el ruido del exterior.',
      ritualTitle: 'Ritual Kiai (Mel Robbins 3-2-1)',
      ritualDesc: 'Entrena tu cerebro para pasar a la acción sin titubeos. Al llegar a cero, grita tu kiai interior e inicia de golpe.',
      ritualBtn: 'Iniciar Ritual 3-2-1',
      ritualCounting: '¡Mantén el aliento!',
      ritualActionTitle: '⚔️ ¡ATACA LA TAREA AHORA!',
      ritualActionDesc: 'No pienses. Da el primer paso (abre tu editor, escribe una línea, desenvaina).',
      timerTitle: 'Intervalo de Combate (Pomodoro)',
      timerFocus: 'Sesión de Foco',
      timerBreak: 'Descanso en el Jardín',
      audioTitle: 'Escudos de Sonido Zen',
      audioDesc: 'Audiofrecuencias sintéticas para anular interferencias del entorno.',
      audioBrown: 'Ruido Café (Foco Profundo)',
      audioRain: 'Lluvia Zen (Silencio)',
      sessionsText: 'Batallas ganadas hoy'
    },
    cyberpunk: {
      logoText: 'ProcrastinaComoPro',
      logoIcon: 'fa-terminal',
      navTasks: 'Cola Procesos',
      navZen: 'Sobrecarga CPU',
      navTimer: 'Cronómetro',
      navShield: 'Cortafuegos',
      subtitle: 'Sincronización neuronal v2.6',
      title: 'Sobrecarga de Nivel',
      desc: 'Bypass a tus interruptores biológicos. Concentra los recursos del sistema en un solo subproceso.',
      ritualTitle: 'Protocolo de Activación 3-2-1',
      ritualDesc: 'Ejecuta el gatillo de baja inercia para saltar la resistencia de arranque de tus núcleos sin analizar pérdidas.',
      ritualBtn: 'Ejecutar Protocolo',
      ritualCounting: 'Sincronizando reloj...',
      ritualActionTitle: '⚡ RUNTIME ACTIVADO. ¡ESCRIBE YA!',
      ritualActionDesc: 'Ignora la calidad estética. Genera basura de código durante 30 segundos. ¡Ejecuta!',
      timerTitle: 'Ciclo de Carga (Pomodoro)',
      timerFocus: 'Carga de CPU',
      timerBreak: 'Modo Enfriamiento',
      audioTitle: 'Generadores de Frecuencia',
      audioDesc: 'Inyección de ruido térmico para aislar el procesador orgánico.',
      audioBrown: 'Brown Noise (Aislamiento)',
      audioRain: 'Sintetizador Lluvia (Foco)',
      sessionsText: 'Subprocesos completados'
    },
    aurora: {
      logoText: 'Procrastina Pro',
      logoIcon: 'fa-compass-drafting',
      navTasks: 'Misiones',
      navZen: 'Zona Focus',
      navTimer: 'Fechas',
      navShield: 'Escudos',
      subtitle: 'Productividad de nivel cósmico',
      title: 'Espacio de Concentración',
      desc: 'Alinea tus recursos cognitivos. Entra en el flujo de la aurora y produce sin esfuerzo o distracción.',
      ritualTitle: 'Ritual 3-2-1 de Activación',
      ritualDesc: 'Rompe la procrastinación por inercia física. Al llegar a cero, realiza la primera acción simple e inmediata.',
      ritualBtn: 'Iniciar Cuenta de 3',
      ritualCounting: '¡Respira y cuenta!',
      ritualActionTitle: '🚀 ¡HAZ EL PRIMER MOVIMIENTO!',
      ritualActionDesc: 'La resistencia es mayor antes de empezar. Da un clic, escribe una letra. ¡Hazlo!',
      timerTitle: 'Temporizador Pomodoro',
      timerFocus: 'Tiempo de Foco',
      timerBreak: 'Pausa Mental',
      audioTitle: 'Generador de Ruido Blanco',
      audioDesc: 'Filtros acústicos continuos para bloquear distracciones externas.',
      audioBrown: 'Ruido Café (Concentración)',
      audioRain: 'Sonido de Lluvia (Calma)',
      sessionsText: 'Bloques de enfoque completados'
    },
    zen: {
      logoText: 'Jardín Bonsái',
      logoIcon: 'fa-leaf',
      navTasks: 'Senderos',
      navZen: 'Espacio Silencio',
      navTimer: 'Reloj de Arena',
      navShield: 'Bonsái Escudo',
      subtitle: 'Productividad consciente y serena',
      title: 'Jardín del Silencio',
      desc: 'No busques terminar el árbol completo; poda una sola hoja con suavidad y atención plena.',
      ritualTitle: 'Respiración de Bonsái 3-2-1',
      ritualDesc: 'Para disolver la ansiedad inicial. Inhala profundamente. Al llegar a cero, haz el primer corte suave.',
      ritualBtn: 'Respirar 3-2-1',
      ritualCounting: 'Inhala... Exhala...',
      ritualActionTitle: '🌱 PODA EL PRIMER BROTE',
      ritualActionDesc: 'Toma la herramienta. Limpia un solo renglón o prepara un solo trazo. Despacio.',
      timerTitle: 'Tiempo del Bonsái (Pomodoro)',
      timerFocus: 'Periodo de Poda',
      timerBreak: 'Regar el Jardín',
      audioTitle: 'Audiofrecuencias de la Naturaleza',
      audioDesc: 'Resonancia orgánica simulada para silenciar la corriente del pensamiento.',
      audioBrown: 'Tierra Profunda (Foco)',
      audioRain: 'Gotas de Lluvia (Meditar)',
      sessionsText: 'Semillas sembradas hoy'
    }
  };

  labels = computed(() => {
    return this.THEME_LABELS[this.currentTheme()];
  });

  // Pomodoro formatted text string
  timeString = computed(() => {
    const min = Math.floor(this.timeLeft() / 60);
    const sec = this.timeLeft() % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  ngOnInit() {
    const savedTheme = localStorage.getItem('procrastina-theme') as any || 'samurai';
    this.currentTheme.set(savedTheme);
    document.body.classList.add(`theme-${savedTheme}`);
  }

  ngOnDestroy() {
    this.resetRitual();
    this.resetTimer();
    this.stopNoise();
  }

  // RITUAL KIAI 3-2-1
  startRitual() {
    if (this.ritualState() !== 'idle') return;
    this.ritualState.set('counting');
    this.ritualCount.set(3);

    this.ritualTimer = setInterval(() => {
      const current = this.ritualCount();
      if (current > 1) {
        this.ritualCount.set(current - 1);
      } else {
        clearInterval(this.ritualTimer);
        this.ritualState.set('action');
      }
    }, 1000);
  }

  resetRitual() {
    if (this.ritualTimer) {
      clearInterval(this.ritualTimer);
    }
    this.ritualState.set('idle');
  }

  // ZEN POMODORO
  toggleTimer() {
    if (this.timerRunning()) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.timerRunning.set(true);
    this.pomodoroTimer = setInterval(() => {
      const current = this.timeLeft();
      if (current > 1) {
        this.timeLeft.set(current - 1);
      } else {
        this.handleTimerComplete();
      }
    }, 1000);
  }

  pauseTimer() {
    this.timerRunning.set(false);
    if (this.pomodoroTimer) {
      clearInterval(this.pomodoroTimer);
    }
  }

  resetTimer() {
    this.pauseTimer();
    this.timeLeft.set(this.isBreak() ? 5 * 60 : 25 * 60);
  }

  handleTimerComplete() {
    this.pauseTimer();
    if (!this.isBreak()) {
      // Completó bloque de foco
      this.focusSessionsCompleted.update(n => n + 1);
      this.isBreak.set(true);
      this.timeLeft.set(5 * 60); // 5 min break
      // Reproducir un pitido suave si es posible
      this.playSoftAlert();
    } else {
      // Completó bloque de descanso
      this.isBreak.set(false);
      this.timeLeft.set(25 * 60); // 25 min focus
      this.playSoftAlert();
    }
    this.startTimer();
  }

  playSoftAlert() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Ignorar fallo en navegadores sin permisos de audio iniciados
    }
  }

  // AUDIO FRECUENCIAS SINTÉTICAS (Web Audio API)
  playNoise(type: 'brown' | 'rain') {
    if (this.activeNoiseType() === type) {
      this.stopNoise();
      return;
    }
    
    this.stopNoise();
    this.activeNoiseType.set(type);

    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = 4096;
      let lastOut = 0.0;

      this.noiseNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
      this.noiseNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'brown') {
            // Brown noise (Filtrado de baja frecuencia profunda)
            output[i] = (lastOut + (0.018 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.8; // Ganancia de compensación
          } else {
            // Lluvia Zen (Filtro simulado crujiente)
            output[i] = (lastOut + (0.15 * white)) / 1.15;
            lastOut = output[i];
            output[i] *= 0.8;
          }
        }
      };

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.noiseVolume();

      this.noiseNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
    } catch (err) {
      console.error('AudioContext no soportado:', err);
      this.activeNoiseType.set('none');
    }
  }

  stopNoise() {
    this.activeNoiseType.set('none');
    try {
      if (this.noiseNode) {
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    } catch (e) {
      // Ignorar errores de cerrado
    }
  }

  onVolumeChange(event: Event) {
    const vol = parseFloat((event.target as HTMLInputElement).value);
    this.noiseVolume.set(vol);
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(vol, this.audioCtx ? this.audioCtx.currentTime : 0);
    }
  }
}
