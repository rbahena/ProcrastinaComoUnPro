import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { ComunidadBossService } from '../../services/comunidad-boss.service';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-medallero',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './medallero.html',
  styleUrl: './medallero.css'
})
export class Medallero {
  membership = inject(MembershipService);
  bossService = inject(ComunidadBossService);

  activeTab = signal<'objectives' | 'pomodoros' | 'streaks' | 'boss'>('objectives');
  sidebarCollapsed = this.membership.sidebarCollapsed;
  userName = this.membership.userName;

  // Indice activo de la tarjeta en el slider full-screen
  activeCardIndex = signal(0);

  brokenRecords = computed(() => {
    const ramStreak = this.membership.streak();
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();
    
    // Si la racha de Ramiro supera la de Carlos (15), él ostenta el récord de mejor racha!
    const bestStreak = Math.max(15, ramStreak);
    const streakHolderName = ramStreak >= 15 ? ramName : 'Carlos "Mente Zen"';
    const streakHolderAvatar = ramStreak >= 15 ? ramAvatar : 'panda';
    const streakHolderFlag = ramStreak >= 15 ? 'mx' : 'mx';

    return [
      {
        title: 'Mejor Racha',
        description: 'Racha consecutiva de días de enfoque completados en la plataforma al día de hoy.',
        motivation: '¡Has demostrado ser una persona sumamente constante y disciplinada en tu camino al éxito! Mantén encendida la llama del enfoque.',
        value: `${bestStreak} días`,
        holder: streakHolderName,
        avatar: streakHolderAvatar,
        flag: streakHolderFlag,
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-x-twitter', platform: 'Twitter', link: 'https://x.com' }
        ],
        date: ramStreak >= 15 ? 'Hoy' : '25 Ago 2026',
        icon: 'fa-fire',
        color: '#ff6b00',
        bgGlow: 'rgba(255, 107, 0, 0.12)'
      },
      {
        title: 'Sesiones de Concentración',
        description: 'Total acumulado de sesiones de enfoque (pomodoros) finalizadas desde el registro en la plataforma.',
        motivation: '¡Paso a paso se llega a la cima! Cada bloque es un ladrillo en el monumento a tu productividad. Sigue construyendo tu legado.',
        value: '2,450 sesiones',
        holder: 'Diego "Paso Firme"',
        avatar: 'tortuga',
        flag: 'pe',
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' }
        ],
        date: 'Histórico',
        icon: 'fa-apple-whole',
        color: '#14b8a6',
        bgGlow: 'rgba(20, 184, 166, 0.12)'
      },
      {
        title: 'El Magnate de Focus',
        description: 'Total acumulado de Pro Coins obtenidas enfocándose en la Comunidad desde el origen.',
        motivation: '¡Tu esfuerzo se traduce en verdadera riqueza mental y digital! Invierte siempre tu tiempo en ti mismo.',
        value: '75,000 Coins',
        holder: 'Elena "Rana Veloz"',
        avatar: 'rana',
        flag: 'es',
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-twitch', platform: 'Twitch', link: 'https://twitch.tv' }
        ],
        date: 'Histórico',
        icon: 'fa-coins',
        color: '#fbbf24',
        bgGlow: 'rgba(251, 191, 36, 0.12)'
      },
      {
        title: 'Podios Conquistados',
        description: 'Total acumulado de primeros lugares obtenidos en los podios semanales de la Comunidad.',
        motivation: '¡La gloria pertenece a quienes perseveran! Has conquistado la cima y demostrado estar a la altura de los grandes.',
        value: '12 podios',
        holder: 'Sofía "Hacker"',
        avatar: 'zorro',
        flag: 'cl',
        socials: [
          { icon: 'fa-github', platform: 'GitHub', link: 'https://github.com' },
          { icon: 'fa-linkedin', platform: 'LinkedIn', link: 'https://linkedin.com' },
          { icon: 'fa-x-twitter', platform: 'Twitter', link: 'https://x.com' }
        ],
        date: 'Histórico',
        icon: 'fa-trophy',
        color: '#f59e0b',
        bgGlow: 'rgba(245, 158, 11, 0.12)'
      }
    ];
  });

  prevCard() {
    this.activeCardIndex.update(i => i > 0 ? i - 1 : 3);
  }

  nextCard() {
    this.activeCardIndex.update(i => i < 3 ? i + 1 : 0);
  }

  setCard(idx: number) {
    this.activeCardIndex.set(idx);
  }

  getFormattedToday(): string {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const d = new Date();
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  // 1. Más objetivos alcanzados
  rankingObjectives = computed(() => {
    const ramObjCount = Math.floor(this.membership.focusPoints() / 40) + 12;
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();
    
    const players = [
      { name: 'Sofía "Hacker"', avatar: 'mapache', objectives: 98, rankName: 'Sapo Legendario', isSelf: false },
      { name: 'Ana "La Sombra"', avatar: 'lobo', objectives: 84, rankName: 'Sapo Maestro', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', objectives: 76, rankName: 'Constructor Experto', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', objectives: 65, rankName: 'Estratega Zen', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', objectives: 55, rankName: 'Fénix Renacido', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', objectives: 48, rankName: 'Constancia Absoluta', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', objectives: 36, rankName: 'Jardinero del Tiempo', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', objectives: 28, rankName: 'Guerrera Iniciada', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', objectives: 22, rankName: 'Aprendiz Veloz', isSelf: false }
    ];
    
    const rPlayer = { name: ramName, avatar: ramAvatar, objectives: ramObjCount, rankName: this.membership.getAvatarTitle(ramAvatar) + ' del Foco', isSelf: true };
    const all = [...players, rPlayer].sort((a, b) => b.objectives - a.objectives);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  // 2. Más pomodoros completados
  rankingPomodoros = computed(() => {
    const ramPomCount = Math.floor(this.membership.focusPoints() / 10) + 15;
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();
    
    const players = [
      { name: 'Sofía "Hacker"', avatar: 'mapache', pomodoros: 195, title: 'Monje de Silencio', isSelf: false },
      { name: 'Ana "La Sombra"', avatar: 'lobo', pomodoros: 180, title: 'Guerrera Reloj', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', pomodoros: 152, title: 'Constructor Foco', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', pomodoros: 140, title: 'Mente Imperturbable', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', pomodoros: 118, title: 'Luz Concentrada', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', pomodoros: 110, title: 'Constancia Pomodoro', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', pomodoros: 92, title: 'Enfoque Bonsái', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', pomodoros: 85, title: 'Fuerza Concentrada', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', pomodoros: 60, title: 'Velocidad Zen', isSelf: false }
    ];
    
    const rPlayer = { name: ramName, avatar: ramAvatar, pomodoros: ramPomCount, title: 'Guerrero del Pomodoro', isSelf: true };
    const all = [...players, rPlayer].sort((a, b) => b.pomodoros - a.pomodoros);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  // 3. Mejor racha
  rankingStreaks = computed(() => {
    const ramStreak = Math.max(14, this.membership.streak()); // De las estadísticas de Ramiro
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();
    
    const players = [
      { name: 'Sofía "Hacker"', avatar: 'mapache', streakCount: 15, tag: 'Racha Imparable', isSelf: false },
      { name: 'Ana "La Sombra"', avatar: 'lobo', streakCount: 12, tag: 'Firmeza Samurai', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', streakCount: 10, tag: 'Renacimiento Continuo', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', streakCount: 9, tag: 'Racha Paciente', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', streakCount: 8, tag: 'Equilibrio Diario', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', streakCount: 7, tag: 'Disciplina Diaria', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', streakCount: 5, tag: 'Trabajo Constante', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', streakCount: 4, tag: 'Calma Diaria', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', streakCount: 3, tag: 'Velocidad Rápida', isSelf: false }
    ];
    
    const rPlayer = { name: ramName, avatar: ramAvatar, streakCount: ramStreak, tag: 'Racha Activa', isSelf: true };
    const all = [...players, rPlayer].sort((a, b) => b.streakCount - a.streakCount);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  // 4. Mejor aporte a villanos
  rankingBoss = computed(() => {
    const ramDamage = this.bossService.userDamageDealt();
    const ramName = this.membership.userName();
    const ramAvatar = this.membership.selectedAvatar();
    
    const players = [
      { name: 'Ana "La Sombra"', avatar: 'lobo', damage: 8500, label: 'Cazadora de Jefes', isSelf: false },
      { name: 'Carlos "Mente Zen"', avatar: 'panda', damage: 6200, label: 'Estratega de la Comunidad', isSelf: false },
      { name: 'Sofía "Hacker"', avatar: 'mapache', damage: 5400, label: 'Destructora de Kraken', isSelf: false },
      { name: 'Laura "Fénix"', avatar: 'fenix', damage: 4800, label: 'Furia Ígnea', isSelf: false },
      { name: 'Mateo "El Castor"', avatar: 'castor', damage: 3900, label: 'Ingeniero de Asedio', isSelf: false },
      { name: 'Diego "Bonsái"', avatar: 'sloth', damage: 2900, label: 'Corte Silencioso', isSelf: false },
      { name: 'Valeria "Constante"', avatar: 'tortuga', damage: 1800, label: 'Martillo Firme', isSelf: false },
      { name: 'Elena "Kiai"', avatar: 'fenix', damage: 1500, label: 'Aura Kiai', isSelf: false },
      { name: 'Lucas "Veloz"', avatar: 'hamster', damage: 1200, label: 'Rayo Veloz', isSelf: false }
    ];
    
    const rPlayer = { name: ramName, avatar: ramAvatar, damage: ramDamage, label: 'Guerrero Activo', isSelf: true };
    const all = [...players, rPlayer].sort((a, b) => b.damage - a.damage);
    
    return all.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));
  });

  getPodiumUser(place: 1 | 2 | 3): { name: string; avatar: string; value: string; isSelf: boolean } {
    const idx = place - 1;
    const tab = this.activeTab();
    if (tab === 'objectives') {
      const p = this.rankingObjectives()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: p.objectives + ' objs', isSelf: p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    } else if (tab === 'pomodoros') {
      const p = this.rankingPomodoros()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: p.pomodoros + ' poms', isSelf: p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    } else if (tab === 'streaks') {
      const p = this.rankingStreaks()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: p.streakCount + ' días', isSelf: p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    } else {
      const p = this.rankingBoss()[idx];
      return p ? { name: p.name, avatar: p.avatar, value: p.damage + ' HP', isSelf: p.isSelf } : { name: '', avatar: '', value: '', isSelf: false };
    }
  }

  labels = computed(() => {
    const t = this.membership.selectedTheme();
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
}
