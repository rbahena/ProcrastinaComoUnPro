import { Component, signal, computed, inject, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-bestiario',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './bestiario.html',
  styleUrl: './bestiario.css'
})
export class Bestiario {
  membership = inject(MembershipService);
  bossService = inject(ComunidadBossService);

  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  sidebarCollapsed!: any;


  // Indice activo de la tarjeta en el slider 3D
  activeCardIndex = signal(0);
  sirenRevealed = signal<boolean>(false);
  showGuide = signal(false);

  toggleGuide() {
    this.showGuide.update(v => !v);
  }

  villainCards = computed(() => {
    const activeType = this.bossService.activeBoss().type;
    return [
      {
        id: 'siren',
        name: 'La Sirena de las Distracciones',
        subtitle: 'Distracciones Digitales',
        element: 'Agua',
        hp: 9000,
        avatar: '/assets/images/avatars/boss_sirena_beautiful.jpg',
        icon: 'fa-fish',
        color: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.12)',
        description: 'Su canto melódico atrae a los navegantes hacia los arrecifes del olvido. En la vida real, se manifiesta como el impulso de revisar notificaciones o videos cortos con la falsa promesa de "solo serán 5 minutos", atrapándote en un consumo infinito de dopamina barata.',
        weakness: 'Filtro de Ruido Total (Modo no molestar y bloqueo de apps para ensordecer su canto).',
        active: activeType === 'siren',
        locked: activeType !== 'siren'
      },
      {
        id: 'cyberpunk',
        name: 'El Kraken del Caos',
        subtitle: 'Sobrecarga Cognitiva',
        element: 'Caos',
        hp: 10000,
        avatar: '/assets/images/avatars/boss_kraken.jpg',
        icon: 'fa-skull',
        color: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.12)',
        description: 'Esta bestia abisal envuelve el timón con sus tentáculos gigantes, paralizando tu rumbo por pánico. En la vida real, representa la sobrecarga cognitiva: cuando acumulas tantos pendientes desordenados que tu mente se abruma y decides aplazar todo en lugar de actuar.',
        weakness: 'Enfoque de Cabeza Única (Método Sapo): Prioriza una sola tarea crítica hoy y descarta temporalmente el resto.',
        active: activeType === 'cyberpunk',
        locked: activeType !== 'cyberpunk'
      },
      {
        id: 'zen',
        name: 'El Basilisco de la Parálisis',
        subtitle: 'Miedo al Fracaso',
        element: 'Tierra',
        hp: 8000,
        avatar: '/assets/images/avatars/boss_basilisco.jpg',
        icon: 'fa-dragon',
        color: '#10b981',
        glow: 'rgba(16, 185, 129, 0.12)',
        description: 'Su mirada letal petrifica instantáneamente la voluntad de los guerreros, congelando sus movimientos. En la vida real, encarna el miedo al fracaso y al perfeccionismo extremo: pospones iniciar un proyecto importante por el temor inconsciente a no hacerlo de forma impecable.',
        weakness: 'Dividir para Vencer (Escribe un primer paso ridículamente pequeño de 5 minutos para romper la parálisis inicial).',
        active: activeType === 'zen',
        locked: activeType !== 'zen'
      },
      {
        id: 'samurai',
        name: 'La Hidra de las Tareas Infinitas',
        subtitle: 'Microprocrastinación',
        element: 'Fuego',
        hp: 12000,
        avatar: '/assets/images/avatars/boss_hidra.jpg',
        icon: 'fa-dungeon',
        color: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.12)',
        description: 'Por cada cabeza que el guerrero corta, brotan dos nuevas que agotan su resistencia en combates estériles. En la vida real, es la microprocrastinación: mantenerte ocupado con microtareas irrelevantes (limpiar el escritorio, ordenar carpetas) para evadir la tarea principal.',
        weakness: 'Filtro Pareto 80/20: Corta las cabezas de raíz enfocándote solo en el 20% de tareas que producen el 80% de tus resultados.',
        active: activeType === 'samurai',
        locked: activeType !== 'samurai'
      },
      {
        id: 'aurora',
        name: 'La Quimera de la Multitarea',
        subtitle: 'Falso Rendimiento',
        element: 'Viento',
        hp: 15000,
        avatar: '/assets/images/avatars/boss_quimera.jpg',
        icon: 'fa-shield-halved',
        color: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.12)',
        description: 'Criatura híbrida de tres cabezas que ataca en múltiples direcciones a la vez, dividiendo tu atención. En la vida real, es la ilusión del rendimiento multitarea: creer que puedes escribir un reporte, chatear y oír música a la vez, duplicando el tiempo de desarrollo.',
        weakness: 'Bloqueo Temporal Unidireccional: Cierra todas las pestañas de navegador innecesarias y concéntrate en una sola ventana activa.',
        active: activeType === 'aurora',
        locked: activeType !== 'aurora'
      },
      {
        id: 'werewolf',
        name: 'El Hombre Lobo de la Madrugada',
        subtitle: 'Procrastinación Nocturna',
        element: 'Luna',
        hp: 16000,
        avatar: '/assets/images/avatars/boss_lobo.jpg',
        icon: 'fa-moon',
        color: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.12)',
        description: 'Acecha en las sombras de la noche, cobrando fuerza a medida que la luna asciende. Representa la procrastinación de la hora de dormir (Venganza Nocturna): aplazar el descanso viendo pantallas para recuperar el tiempo libre que sentiste perder durante el día.',
        weakness: 'Ritual de Cierre de Jornada: Apaga pantallas 1 hora antes de dormir y programa tu inicio de descanso a una hora fija.',
        active: activeType === 'werewolf',
        locked: activeType !== 'werewolf'
      },
      {
        id: 'vampire',
        name: 'El Vampiro del Insomnio',
        subtitle: 'Doomscrolling y Pantallas',
        element: 'Sombra',
        hp: 18000,
        avatar: '/assets/images/avatars/boss_vampiro.jpg',
        icon: 'fa-face-rolling-eyes',
        color: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.12)',
        description: 'Drea sigilosamente la vitalidad del guerrero dormido, dejándolo exhausto para el combate. En la vida real, es el doomscrolling en la cama: la luz azul del teléfono engaña a tu cerebro para bloquear la melatonina, induciendo insomnio y robando tus fuerzas al amanecer.',
        weakness: 'Desconexión Analógica: Carga tu teléfono fuera del alcance de tu cama y sustituye la pantalla nocturna por un libro físico.',
        active: activeType === 'vampire',
        locked: activeType !== 'vampire'
      }
    ];
  });

  prevCard() {
    this.activeCardIndex.update(i => i > 0 ? i - 1 : 6);
  }

  nextCard() {
    this.activeCardIndex.update(i => i < 6 ? i + 1 : 0);
  }

  setCard(idx: number) {
    this.activeCardIndex.set(idx);
  }

  toggleSirenReveal() {
    this.sirenRevealed.update(v => !v);
  }

  constructor() {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;

    // Auto-seleccionar la tarjeta del jefe activo actual
    const activeType = this.bossService.activeBoss().type;
    const cards = ['siren', 'cyberpunk', 'zen', 'samurai', 'aurora', 'werewolf', 'vampire'];
    const idx = cards.indexOf(activeType);
    if (idx !== -1) {
      this.activeCardIndex.set(idx);
    }
  }

  // Helper for avatar icons
  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }


  // Dynamic labels helper
  labels = computed(() => {
    const t = this.currentTheme();
    if (t === 'cyberpunk') {
      return {
        logoText: 'COFU PRO',
        navTasks: 'Terminal',
        navZen: 'Zona de Enfoque',
        navTimer: 'Métricas de Red',
        navShield: 'Cortafuegos'
      };
    } else if (t === 'zen') {
      return {
        logoText: 'COFU ZEN',
        navTasks: 'Bonsái',
        navZen: 'Zona de Enfoque',
        navTimer: 'Jardín Temporal',
        navShield: 'Silencio'
      };
    } else if (t === 'aurora') {
      return {
        logoText: 'COFU AURORA',
        navTasks: 'Objetivos',
        navZen: 'Zona de Enfoque',
        navTimer: 'Cronograma',
        navShield: 'Protección'
      };
    } else {
      return {
        logoText: 'COFU SAMURÁI',
        navTasks: 'Misiones',
        navZen: 'Zona de Enfoque',
        navTimer: 'Estadísticas',
        navShield: 'Ideas fugaces'
      };
    }
  });

  getFormattedToday(): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const d = new Date();
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}
