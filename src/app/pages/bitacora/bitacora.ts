import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { Navbar } from '../../components/navbar/navbar';

export interface BitacoraSession {
  date: string;
  type: string;
  duration: number;
  objective: string;
  avatar: string;
  methodology: string;
  points: number;
  coins: number;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  total: number;
  isUnlocked: boolean;
}

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar],
  templateUrl: './bitacora.html',
  styleUrl: './bitacora.css'
})
export class Bitacora {
  membership = inject(MembershipService);
  bossService = inject(ComunidadBossService);

  sidebarCollapsed = this.membership.sidebarCollapsed;
  userName = this.membership.userName;

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  // Historial de Sesiones
  sessionHistory = computed<BitacoraSession[]>(() => {
    const totalPomodoros = this.membership.focusTomatoes();
    
    // Lista base de sesiones pasadas para simulación
    const mockSessions: BitacoraSession[] = [
      {
        date: 'Ayer',
        type: 'Enfoque',
        duration: 25,
        objective: 'Resolver duplicidad de podios en home',
        avatar: 'lobo',
        methodology: 'Pareto (80/20)',
        points: this.membership.isPremium() ? 10 : 0,
        coins: 5
      },
      {
        date: 'Hace 2 días',
        type: 'Enfoque',
        duration: 25,
        objective: 'Reemplazar término dojo por comunidad',
        avatar: 'dragon',
        methodology: 'Sapo/Rana (Lo más difícil primero)',
        points: this.membership.isPremium() ? 10 : 0,
        coins: 5
      },
      {
        date: 'Hace 3 días',
        type: 'Enfoque',
        duration: 25,
        objective: 'Mejorar estilo de card del podio',
        avatar: 'buho',
        methodology: 'Normal',
        points: this.membership.isPremium() ? 10 : 0,
        coins: 5
      },
      {
        date: 'Hace 5 días',
        type: 'Enfoque',
        duration: 25,
        objective: 'Diseñar layouts del dashboard',
        avatar: 'zorro',
        methodology: 'Normal',
        points: this.membership.isPremium() ? 10 : 0,
        coins: 5
      }
    ];

    // Si el usuario tiene pomodoros en su contador, agregamos una sesión activa más reciente como la última realizada hoy
    if (totalPomodoros > 0) {
      const todaySession: BitacoraSession = {
        date: 'Hoy',
        type: 'Enfoque',
        duration: 25,
        objective: 'Sesión activa de trabajo diario',
        avatar: this.membership.selectedAvatar(),
        methodology: 'Normal',
        points: this.membership.isPremium() ? 10 : 0,
        coins: 5
      };
      return [todaySession, ...mockSessions];
    }

    return mockSessions;
  });

  // Logros y Medallas del Diario
  achievements = computed<AchievementItem[]>(() => {
    const totalPomodoros = this.membership.focusTomatoes();
    const proCoins = this.membership.proCoins();
    const focusPoints = this.membership.focusPoints();
    const ideasCount = this.membership.capturedIdeas().length;
    const damage = this.bossService.userDamageDealt();

    return [
      {
        id: 'first_step',
        title: 'Primer Paso del Guerrero',
        description: 'Completa tu primera sesión pomodoro de enfoque.',
        icon: '🥇',
        progress: totalPomodoros >= 1 ? 1 : 0,
        total: 1,
        isUnlocked: totalPomodoros >= 1
      },
      {
        id: 'focus_master',
        title: 'Maestro de la Concentración',
        description: 'Completar 10 bloques pomodoros en total.',
        icon: '🍅',
        progress: Math.min(10, totalPomodoros),
        total: 10,
        isUnlocked: totalPomodoros >= 10
      },
      {
        id: 'coin_collector',
        title: 'Coleccionista de Pro Coins',
        description: 'Acumula 50 Pro Coins en tu billetera.',
        icon: '🪙',
        progress: Math.min(50, proCoins),
        total: 50,
        isUnlocked: proCoins >= 50
      },
      {
        id: 'boss_slayer',
        title: 'Defensor de la Comunidad',
        description: 'Realiza al menos 100 de daño al Jefe de la Comunidad.',
        icon: '🛡️',
        progress: Math.min(100, damage),
        total: 100,
        isUnlocked: damage >= 100
      },
      {
        id: 'ideas_creator',
        title: 'Buscador de la Verdad',
        description: 'Guarda 3 ideas creativas en tu baúl personal.',
        icon: '💡',
        progress: Math.min(3, ideasCount),
        total: 3,
        isUnlocked: ideasCount >= 3
      },
      {
        id: 'legendary_focus',
        title: 'Guerrero Consagrado',
        description: 'Llega a 150 Puntos de Enfoque acumulados.',
        icon: '⭐',
        progress: Math.min(150, focusPoints),
        total: 150,
        isUnlocked: focusPoints >= 150
      }
    ];
  });

  // Estadísticas del diario
  totalFocusTime = computed(() => {
    return this.membership.focusTomatoes() * 25; // 25 min por pomodoro
  });

  getEmoji(avatar: string): string {
    const emojis: Record<string, string> = {
      gato: '🐱',
      perro: '🐶',
      conejo: '🐰',
      loro: '🦜',
      hamster: '🐹',
      raton: '🐭',
      tortuga: '🐢',
      hormiga: '🐜',
      buho: '🦉',
      rana: '🐸',
      aguila: '🦅',
      abeja: '🐝',
      castor: '🦫',
      zorro: '🦊',
      lince: '🐱',
      panda: '🐼',
      oso: '🐻',
      elefante: '🐘',
      leon: '🦁',
      tigre: '🐯',
      lobo: '🐺',
      dragon: '🐉',
      fenix: '🐦'
    };
    return emojis[avatar] || '🐾';
  }
}
