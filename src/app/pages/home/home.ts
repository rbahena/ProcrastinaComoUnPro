import { Component, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Task {
  id: number;
  text: string;
  priority: 'high' | 'mid' | 'low';
  tag: string;
  done: boolean;
  isFrog: boolean;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  // Tema Actual
  currentTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>('samurai');

  // Plan Premium (Simulación)
  isPremium = signal(false);
  showPremiumModal = signal(false);

  // Configuración / Ajustes
  showSettings = signal(false);
  soundEnabled = signal(true);
  autoblockEnabled = signal(true);

  // Pomodoro
  timeLeft = signal(25 * 60); // 25 min default
  timerRunning = signal(false);
  isBreak = signal(false);
  focusSessionsCompleted = signal(0);
  private pomodoroTimer: any = null;

  // Escudo
  shieldActive = signal(false);

  // Datos del Usuario
  userName = signal('Guerrero');
  streak = signal(0); // Días/Batallas seguidas
  focusMinutes = signal(0); // Minutos hoy
  blockedSitesCount = signal(0); // Escudos activos
  xp = signal(0); // Honor/XP acumulado

  // Lista de Tareas (Limpia por defecto para nuevos usuarios)
  tasks = signal<Task[]>([]);


  // Diccionario de textos por tema
  private readonly THEME_LABELS = {
    samurai: {
      logoText: 'Camino del Guerrero',
      logoIcon: 'fa-torii-gate',
      navTasks: 'Bitácora',
      navZen: 'Zen (Enfoque)',
      navTimer: 'Arena Temporal',
      navShield: 'Armadura',
      title: '¡Tu espada está lista, Guerrero!',
      subtitle: 'Rango: Samurái de la Mente',
      streakLabel: 'Racha de Conquista (Días)',
      focusLabel: 'Entrenamiento Zen Hoy',
      shieldsLabel: 'Armadura Antidistracción',
      sapoActiveLabel: '👹 EL GRAN OPONENTE (Tu Batalla Principal)',
      sapoActiveDesc: 'La batalla principal de tu jornada. Córtala con tu espada primero y liberarás tu mente.',
      sapoBtn: '⚔️ Vencer Oponente',
      sapoCompletedTitle: '⚔️ ¡OPONENTE DERROTADO!',
      sapoCompletedDesc: 'No quedan grandes enemigos pendientes hoy. ¡Tu mente está en calma!',
      sapoCompletedSub: 'Declara un nuevo adversario con el botón "⚔️ Retar" en la lista de abajo.',
      tasksTitle: 'Misiones del Día',
      tasksEmpty: 'Ninguna misión declarada. Prepárate para el combate añadiendo una batalla.',
      addTaskTitle: 'Declarar Nueva Batalla (Misión)',
      addTaskTextPlaceholder: 'Ej. Escribir primer trazo del proyecto...',
      addTaskBtn: '⚔️ Declarar',
      addTaskPriorityLabel: 'Severidad',
      addTaskPriorityHigh: 'Severa (Alta)',
      addTaskPriorityMid: 'Moderada (Media)',
      addTaskPriorityLow: 'Leve (Baja)',
      addTaskTagPlaceholder: 'Clan (Ej. Deber)',
      addTaskFrogLabel: '👹 Sapo',
      ritualTitle: 'Ritual de Enfoque Kiai',
      ritualDesc: 'Para disolver la resistencia mental. Al llegar a cero, grita tu kiai interior, desenvaina y haz el primer movimiento. La duda es la única derrota.',
      ritualBtn: 'Iniciar Ritual 3-2-1',
      ritualCountSub: '¡Mantén el aliento!',
      ritualActionTitle: '⚔️ ¡ATACA AHORA!',
      ritualActionDesc: 'Da el primer golpe (escribe una línea, abre el código). No des un paso atrás.',
      ritualFocusBtn: '⚔️ Entrenar (Foco)',
      philosophyTitle: 'El Código Bushido (Mente Clara)',
      philosophyIcon: 'fa-yin-yang',
      philosophyContent1: 'La procrastinación no es pereza; es el miedo de tu mente ante la batalla emocional. El samurái templa su espíritu para dominar sus temores.',
      philosophyContent2: 'El Corte del Principiante: Forja un borrador tosco e imperfecto durante 10 minutos. Una espada no sale templada en el primer golpe; empieza sin buscar perfección.'
    },
    cyberpunk: {
      logoText: 'Terminal Hack',
      logoIcon: 'fa-terminal',
      navTasks: 'Procesos',
      navZen: 'Sobrecarga (Foco)',
      navTimer: 'Red de Tiempo',
      navShield: 'Firewall',
      title: '¡Acceso concedido, Ciber-Hacker!',
      subtitle: 'Rango: Administrador de Red',
      streakLabel: 'Nodos Conectados (Racha)',
      focusLabel: 'Ciclos de CPU (Foco) Hoy',
      shieldsLabel: 'Puertos Protegidos',
      sapoActiveLabel: '⚡ PROCESO CRÍTICO (Fricción Máxima)',
      sapoActiveDesc: 'Este proceso consume demasiados recursos cognitivos. Ejecútalo de inmediato para liberar memoria RAM.',
      sapoBtn: '⚡ Ejecutar Kill',
      sapoCompletedTitle: '⚡ ¡SISTEMA OPTIMIZADO!',
      sapoCompletedDesc: 'Procesos de alta fricción eliminados de la cola. ¡Estado estable!',
      sapoCompletedSub: 'Registra un nuevo proceso crítico o enfócate en tareas del segundo nivel.',
      tasksTitle: 'Cola de Tareas',
      tasksEmpty: 'Cola de procesos vacía. Carga scripts o comandos abajo.',
      addTaskTitle: 'Inyectar Nuevo Proceso',
      addTaskTextPlaceholder: 'Ej. Inicializar script del backend...',
      addTaskBtn: '⚡ Inyectar',
      addTaskPriorityLabel: 'Prioridad',
      addTaskPriorityHigh: 'Crítica (Alta)',
      addTaskPriorityMid: 'Normal (Media)',
      addTaskPriorityLow: 'Baja (Background)',
      addTaskTagPlaceholder: 'Módulo (Ej. Core)',
      addTaskFrogLabel: '⚡ Crítico',
      ritualTitle: 'Protocolo Sobrecarga 3-2-1',
      ritualDesc: 'Fuerza la activación de tus núcleos de procesamiento. Al llegar a cero, ejecuta la primera línea de código sin evaluar el rendimiento.',
      ritualBtn: 'Iniciar Protocolo',
      ritualCountSub: '¡Sincronizando reloj!',
      ritualActionTitle: '⚡ ¡OVERLOAD ACTIVADO!',
      ritualActionDesc: 'Escribe código basura de inmediato. Bypass a la resistencia cognitiva. ¡Ejecuta!',
      ritualFocusBtn: '⚡ Sobrecargar CPU',
      philosophyTitle: 'Manifiesto Cyberpunk (Bypass)',
      philosophyIcon: 'fa-network-wired',
      philosophyContent1: 'La dilación es ruido en la señal. Si dejas que el búfer de entrada se llene, el sistema sufrirá un desbordamiento de pila. Limpia la caché.',
      philosophyContent2: 'Bypass de Calidad: Inicia con código sucio e imperfecto. Los refactors se aplican en caliente; compilar un archivo vacío es mejor que quedarse offline.'
    },
    aurora: {
      logoText: 'Procrastina Pro',
      logoIcon: 'fa-bolt',
      navTasks: 'Inicio',
      navZen: 'Enfoque',
      navTimer: 'Plazos',
      navShield: 'Bloqueador',
      title: '¡Bienvenido, Profesional!',
      subtitle: 'Rango: Especialista en Foco',
      streakLabel: 'Racha de Días',
      focusLabel: 'Minutos de Enfoque Hoy',
      shieldsLabel: 'Sitios Bloqueados',
      sapoActiveLabel: '🐸 EL SAPO DEL DÍA (Tarea Crítica)',
      sapoActiveDesc: 'Identificada como tu tarea de mayor resistencia cognitiva. Hazla primero y liberarás dopamina.',
      sapoBtn: '🐸 Tragar Sapo',
      sapoCompletedTitle: '🐸 ¡SAPO TRAGADO!',
      sapoCompletedDesc: 'No tienes sapos pendientes para hoy. ¡Tu mente está libre!',
      sapoCompletedSub: 'Usa el botón "🐸 Sapo" en el listado para marcar otra tarea como crítica.',
      tasksTitle: 'Listado de Acciones',
      tasksEmpty: 'No hay tareas creadas para hoy. ¡Empieza añadiendo una abajo!',
      addTaskTitle: 'Añadir Tarea Conductual',
      addTaskTextPlaceholder: 'Ej. Redactar borrador inicial sin juzgar la calidad...',
      addTaskBtn: 'Agregar',
      addTaskPriorityLabel: 'Prioridad',
      addTaskPriorityHigh: 'Alta',
      addTaskPriorityMid: 'Media',
      addTaskPriorityLow: 'Baja',
      addTaskTagPlaceholder: 'Etiqueta (Ej. Trabajo)',
      addTaskFrogLabel: '🐸 Sapo',
      ritualTitle: 'Ritual 3-2-1 de Activación',
      ritualDesc: 'Para romper la inercia motora de la procrastinación. Al llegar a cero, muévete físicamente a la tarea sin darle tiempo a tu cerebro de poner excusas.',
      ritualBtn: 'Iniciar Ritual 3-2-1',
      ritualCountSub: '¡Cuenta en voz alta!',
      ritualActionTitle: '🚀 ¡MUÉVETE YA!',
      ritualActionDesc: 'Abre tu proyecto, escribe una palabra o da clic. Rompe el bloqueo.',
      ritualFocusBtn: 'Iniciar Enfoque',
      philosophyTitle: 'Regulación Emocional',
      philosophyIcon: 'fa-brain',
      philosophyContent1: 'La procrastinación es un mecanismo inconsciente de defensa para evitar emociones negativas (miedo al fracaso, frustración, aburrimiento).',
      philosophyContent2: 'Principio del Borrador Basura: Prométete trabajar en algo mediocre por solo 10 minutos. Eliminar el estándar de calidad destruye la fricción inicial.'
    },
    zen: {
      logoText: 'Jardín Bonsái',
      logoIcon: 'fa-spa',
      navTasks: 'Senderos',
      navZen: 'Meditación',
      navTimer: 'Estaciones',
      navShield: 'Silencio',
      title: 'Cultiva tu atención, Sembrador',
      subtitle: 'Rango: Cuidador de Bonsáis',
      streakLabel: 'Ciclos de Riego (Racha)',
      focusLabel: 'Atención Plena Hoy (Minutos)',
      shieldsLabel: 'Distracciones Podadas',
      sapoActiveLabel: '🌱 EL BROTE MAESTRO (Tu Mayor Cuidado)',
      sapoActiveDesc: 'Esta es la rama que requiere mayor poda y atención hoy. Dedícate a ella con paciencia.',
      sapoBtn: '🌱 Regar y Podar',
      sapoCompletedTitle: '🌱 ¡JARDÍN EN ARMONÍA!',
      sapoCompletedDesc: 'El brote maestro ha sido atendido. La energía fluye libremente.',
      sapoCompletedSub: 'Elige otra rama del bonsái que requiera crecimiento o descansa en silencio.',
      tasksTitle: 'Senderos de Cultivo',
      tasksEmpty: 'No hay semillas plantadas hoy. Añade una para verla crecer.',
      addTaskTitle: 'Plantar Semilla (Tarea)',
      addTaskTextPlaceholder: 'Ej. Preparar tierra para el reporte...',
      addTaskBtn: '🌱 Plantar',
      addTaskPriorityLabel: 'Cuidado',
      addTaskPriorityHigh: 'Urgente (Alto)',
      addTaskPriorityMid: 'Regular (Medio)',
      addTaskPriorityLow: 'Leve (Bajo)',
      addTaskTagPlaceholder: 'Sección (Ej. Raíces)',
      addTaskFrogLabel: '🌱 Brote',
      ritualTitle: 'Respiración 3-2-1 del Bonsái',
      ritualDesc: 'Inhala, exhala. Al llegar a cero, toma la herramienta de poda y haz el primer corte con suavidad y atención plena. No pienses en el árbol completo.',
      ritualBtn: 'Respirar 3-2-1',
      ritualCountSub: 'Inhala profundamente...',
      ritualActionTitle: '🌱 CULTIVA AHORA',
      ritualActionDesc: 'Toma acción suave pero firme. Despeja el primer brote sin prisa pero sin detenerte.',
      ritualFocusBtn: 'Meditar en Silencio',
      philosophyTitle: 'Filosofía del Silencio (Paz)',
      philosophyIcon: 'fa-seedling',
      philosophyContent1: 'La mente no es una máquina de vapor. Procrastinar es el grito de un estanque turbio. Deja reposar el agua para que el lodo caiga y vuelvas a ver el fondo.',
      philosophyContent2: 'El Camino de la Semilla: Un roble no crece en un día, ni necesita brotar perfecto. Permítete hacer un trabajo pequeño e imperfecto; el tiempo y el riego constante harán el resto.'
    }
  };

  // computed signal for vocabulary mapping
  labels = computed(() => {
    return this.THEME_LABELS[this.currentTheme()];
  });

  // Tarea "Sapo" activa (no completada y marcada como sapo)
  activeFrog = computed(() => {
    return this.tasks().find(t => t.isFrog && !t.done) || null;
  });

  // Tareas regulares
  regularTasks = computed(() => {
    return this.tasks().filter(t => !t.isFrog);
  });

  // Progreso de tareas completadas
  completionProgress = computed(() => {
    const all = this.tasks();
    if (all.length === 0) return 0;
    const completed = all.filter(t => t.done).length;
    return Math.round((completed / all.length) * 100);
  });

  completedTasksCount = computed(() => {
    return this.tasks().filter(t => t.done).length;
  });

  totalTasksCount = computed(() => {
    return this.tasks().length;
  });

  // Pomodoro formatted text string
  timeString = computed(() => {
    const min = Math.floor(this.timeLeft() / 60);
    const sec = this.timeLeft() % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  constructor() {
    const savedTheme = localStorage.getItem('procrastina-theme') as any || 'samurai';
    this.currentTheme.set(savedTheme);
    const premiumStatus = localStorage.getItem('procrastina-premium') === 'true';
    this.isPremium.set(premiumStatus);
  }

  // Alternar tema y aplicarlo al body (con bloqueo premium)
  applyTheme(themeName: 'samurai' | 'cyberpunk' | 'aurora' | 'zen') {
    if (themeName !== 'samurai' && !this.isPremium()) {
      this.showPremiumModal.set(true);
      return;
    }
    const body = document.body;
    // Remove existing themes
    body.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        body.classList.remove(className);
      }
    });
    // Add current theme
    body.classList.add(`theme-${themeName}`);
    localStorage.setItem('procrastina-theme', themeName);
    this.currentTheme.set(themeName);
  }

  // Simular la compra de Premium
  buyPremium() {
    this.isPremium.set(true);
    localStorage.setItem('procrastina-premium', 'true');
    this.showPremiumModal.set(false);
    this.xp.update(val => val + 200); // 200 pts honor bonus
  }

  // Cerrar modal
  cancelPremiumModal() {
    this.showPremiumModal.set(false);
  }

  // Volver a cuenta gratuita para demostración
  resetToFree() {
    this.isPremium.set(false);
    localStorage.setItem('procrastina-premium', 'false');
    this.applyTheme('samurai');
  }

  // Toggles de configuración
  toggleSettings() {
    this.showSettings.update(val => !val);
  }

  toggleSound() {
    this.soundEnabled.update(val => !val);
  }

  toggleAutoblock() {
    this.autoblockEnabled.update(val => !val);
  }

  // Alternar estado de una tarea
  toggleTask(taskId: number) {
    this.tasks.update(all =>
      all.map(t => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
    // Ganar XP si se completa
    const task = this.tasks().find(t => t.id === taskId);
    if (task && task.done) {
      this.xp.update(val => val + (task.isFrog ? 100 : 30));
    }
  }

  // Eliminar tarea
  deleteTask(taskId: number, event: Event) {
    event.stopPropagation(); // Evitar alternar el estado
    this.tasks.update(all => all.filter(t => t.id !== taskId));
  }

  // Agregar nueva tarea minimalista (Quick Add)
  quickAddTask(textInput: HTMLInputElement) {
    const text = textInput.value.trim();
    if (!text) return;

    const newId = this.tasks().length > 0 ? Math.max(...this.tasks().map(t => t.id)) + 1 : 1;
    const newTask: Task = {
      id: newId,
      text,
      priority: 'mid',
      tag: 'Misión',
      done: false,
      isFrog: false
    };

    this.tasks.update(all => [...all, newTask]);
    textInput.value = '';
    this.xp.update(val => val + 10); // +10 honor por declarar batalla
  }

  // Cambiar prioridad de una tarea en ciclo: high -> mid -> low -> high
  cyclePriority(taskId: number) {
    this.tasks.update(all =>
      all.map(t => {
        if (t.id === taskId) {
          const nextPriority = t.priority === 'high' ? 'mid' : (t.priority === 'mid' ? 'low' : 'high');
          return { ...t, priority: nextPriority };
        }
        return t;
      })
    );
  }

  // Marcar tarea existente como Sapo
  makeFrog(taskId: number, event: Event) {
    event.stopPropagation();
    this.tasks.update(all =>
      all.map(t => {
        if (t.id === taskId) return { ...t, isFrog: true };
        if (t.isFrog && !t.done) return { ...t, isFrog: false }; // Solo puede haber un sapo activo
        return t;
      })
    );
  }

  // Toggle escudo/bloqueador
  toggleShield() {
    this.shieldActive.update(active => {
      const next = !active;
      if (next) {
        this.blockedSitesCount.update(c => c + 1); // Simular bloqueo incrementado al activar
      }
      return next;
    });
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
      this.focusSessionsCompleted.update(n => n + 1);
      this.focusMinutes.update(m => m + 25); // Sumar minutos reales al foco del día!
      this.xp.update(val => val + 30); // Ganar Honor por completar foco
      this.isBreak.set(true);
      this.timeLeft.set(5 * 60); // 5 min break
      this.playSoftAlert();
    } else {
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
      // Ignorar fallo de autoplay
    }
  }
}
