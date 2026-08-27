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

  villainCards = computed(() => {
    const activeType = this.bossService.activeBoss().type;
    return [
      {
        id: 'siren',
        name: 'La Sirena de las Distracciones',
        subtitle: 'Distracciones Digitales',
        hp: 9000,
        avatar: '/assets/images/avatars/boss_sirena_beautiful.jpg',
        icon: 'fa-fish',
        color: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.12)',
        description: 'Este ser se alimenta de notificaciones de redes sociales, feeds infinitos y videos cortos. Su canto te atrae para convencerte de que "solo serán 5 minutos".',
        weakness: 'Filtro de Ruido Total (Modo no molestar y bloqueo de apps para ensordecer su canto).',
        active: activeType === 'siren',
        locked: activeType !== 'siren'
      },
      {
        id: 'cyberpunk',
        name: 'El Kraken del Caos',
        subtitle: 'Sobrecarga Cognitiva',
        hp: 10000,
        avatar: '/assets/images/avatars/boss_kraken.jpg',
        icon: 'fa-skull',
        color: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.12)',
        description: 'Emerge cuando tu lista de pendientes es masiva y desordenada. Te abruma con tantas tareas a la vez que terminas paralizado sin hacer ninguna.',
        weakness: 'Enfoque de Cabeza Única (Método Sapo): Prioriza una sola tarea crítica hoy y descarta temporalmente el resto.',
        active: activeType === 'cyberpunk',
        locked: activeType !== 'cyberpunk'
      },
      {
        id: 'zen',
        name: 'El Basilisco de la Parálisis',
        subtitle: 'Miedo al Fracaso',
        hp: 8000,
        avatar: '/assets/images/avatars/boss_basilisco.jpg',
        icon: 'fa-dragon',
        color: '#10b981',
        glow: 'rgba(16, 185, 129, 0.12)',
        description: 'Su mirada petrifica a los guerreros cuando se enfrentan a un proyecto importante. El miedo a no hacerlo perfecto te hace posponer el inicio indefinidamente.',
        weakness: 'Dividir para Vencer (Escribe un primer paso ridículamente pequeño de 5 minutos para romper la parálisis inicial).',
        active: activeType === 'zen',
        locked: activeType !== 'zen'
      },
      {
        id: 'samurai',
        name: 'La Hidra de las Tareas Infinitas',
        subtitle: 'Microprocrastinación',
        hp: 12000,
        avatar: '/assets/images/avatars/boss_hidra.jpg',
        icon: 'fa-dungeon',
        color: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.12)',
        description: 'Por cada tarea que completas, surgen dos nuevas de bajo valor. Te mantiene ocupado con cosas irrelevantes para alejarte de las misiones importantes.',
        weakness: 'Filtro Pareto 80/20: Corta las cabezas de raíz enfocándote solo en el 20% de tareas que producen el 80% de tus resultados.',
        active: activeType === 'samurai',
        locked: activeType !== 'samurai'
      },
      {
        id: 'aurora',
        name: 'La Quimera de la Multitarea',
        subtitle: 'Falso Rendimiento',
        hp: 15000,
        avatar: '/assets/images/avatars/boss_quimera.jpg',
        icon: 'fa-shield-halved',
        color: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.12)',
        description: 'Te convence de que eres capaz de escribir un reporte, responder mensajes y escuchar un podcast al mismo tiempo. Reduce tu capacidad de retención y duplica el tiempo de desarrollo.',
        weakness: 'Bloqueo Temporal Unidireccional: Cierra todas las pestañas de navegador innecesarias y concéntrate en una sola ventana activa.',
        active: activeType === 'aurora',
        locked: activeType !== 'aurora'
      },
      {
        id: 'werewolf',
        name: 'El Hombre Lobo de la Madrugada',
        subtitle: 'Procrastinación Nocturna',
        hp: 16000,
        avatar: '/assets/images/avatars/boss_lobo.jpg',
        icon: 'fa-moon',
        color: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.12)',
        description: 'Emerge al anochecer, convenciéndote de que eres "más productivo de noche" para que aplaces tus misiones hasta tarde, arruinando tu ciclo de sueño y tu energía.',
        weakness: 'Ritual de Cierre de Jornada: Apaga pantallas 1 hora antes de dormir y programa tu inicio de descanso a una hora fija.',
        active: activeType === 'werewolf',
        locked: activeType !== 'werewolf'
      },
      {
        id: 'vampire',
        name: 'El Vampiro del Insomnio',
        subtitle: 'Doomscrolling y Pantallas',
        hp: 18000,
        avatar: '/assets/images/avatars/boss_vampiro.jpg',
        icon: 'fa-face-rolling-eyes',
        color: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.12)',
        description: 'Se alimenta de tu energía vital absorbiendo tu tiempo de sueño con el scrolling infinito en la cama. Te mantiene hipnotizado por la luz azul mientras drena tu fuerza física.',
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
