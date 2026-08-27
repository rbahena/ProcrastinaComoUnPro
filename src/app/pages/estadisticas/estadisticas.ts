import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { IdentitySettings } from '../../components/identity-settings';
import { Navbar } from '../../components/navbar/navbar';

interface Attempt {
  status: 'completed' | 'abandoned' | 'interrupted';
  time: string;
}

interface CalendarDay {
  dayNumber: number | null;
  pomodoros: number;
  isToday: boolean;
  isFuture: boolean;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, IdentitySettings, Navbar],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css'
})
export class Estadisticas implements OnInit {
  // Intentos del día actual cargados de localStorage
  dailyAttempts = signal<Attempt[]>([]);

  // Datos históricos para la semana (Lunes a Domingo)
  weeklyHistorical = signal<number[]>([4, 5, 6, 3, 7, 2]); // Lun - Sab

  // Datos históricos para el año (Ene - Dic)
  annualHistorical = signal<number[]>([85, 92, 110, 95, 104, 118, 125, 98, 0, 0, 0, 0]);

  // Estado del modal de compartir en LinkedIn
  showShareModal = signal(false);
  userName!: any;
  sidebarCollapsed!: any;
  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  // Objetivos completados simulados
  completedObjectivesTotal = 18;

  constructor(public membership: MembershipService) {
    this.userName = this.membership.userName;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;
  }

  ngOnInit() {
    this.loadDailyAttempts();
  }

  loadDailyAttempts() {
    const saved = localStorage.getItem('daily-attempts');
    if (saved) {
      try {
        this.dailyAttempts.set(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing daily attempts', e);
      }
    } else {
      this.dailyAttempts.set([
        { status: 'completed', time: '09:00' },
        { status: 'completed', time: '10:30' },
        { status: 'completed', time: '12:00' },
        { status: 'abandoned', time: '13:15' },
        { status: 'completed', time: '14:30' },
        { status: 'interrupted', time: '15:45' },
        { status: 'completed', time: '17:00' },
        { status: 'completed', time: '18:30' }
      ]);
    }
  }


  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  labels = computed(() => {
    return {
      logoText: 'COFU',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Inicio',
      navZen: 'Zona de concentración',
      navTimer: 'Estadísticas',
      navShield: 'Baúl de ideas',
      title: 'Estadísticas de Productividad 📊',
      desc: 'Métricas de tu camino de concentración y control sobre la procrastinación'
    };
  });

  // --- MÉTODOS PARA COMPARTIR EN LINKEDIN ---
  openShareModal() {
    this.showShareModal.set(true);
  }

  closeShareModal() {
    this.showShareModal.set(false);
  }

  shareOnLinkedIn() {
    const text = encodeURIComponent(
      `🎯 ¡He alcanzado el rango de Guerrero de Enfoque en COFU! 🧠🔥\n\n` +
      `He completado con éxito ${this.annualTotal()} pomodoros de concentración y mantengo una racha activa de ${this.longestStreak} días venciendo la procrastinación.\n\n` +
      `Compite conmigo en el comunidad de concentración y lleva tu enfoque al siguiente nivel: https://cofu.app`
    );
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
    this.showShareModal.set(false);
  }

  // --- CÁLCULOS DIARIOS (HOY) ---
  todayCompletedCount = computed(() => {
    return this.dailyAttempts().filter(a => a.status === 'completed').length;
  });

  todayTotalAttempts = computed(() => {
    return this.dailyAttempts().length;
  });

  // --- ESTRUCTURA DEL CALENDARIO MENSUAL (Agosto 2026) ---
  calendarDays = computed<CalendarDay[]>(() => {
    const days: CalendarDay[] = [];
    const offsetCount = 5;
    
    for (let i = 0; i < offsetCount; i++) {
      days.push({ dayNumber: null, pomodoros: 0, isToday: false, isFuture: false });
    }

    const monthlyPomodorosData: { [key: number]: number } = {
      1: 4, 2: 2, 3: 5, 4: 6, 5: 4, 6: 5, 7: 6, 8: 3, 9: 2, 10: 7,
      11: this.todayCompletedCount()
    };

    const totalDaysInMonth = 31;
    const todayDayNumber = 11;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const poms = monthlyPomodorosData[d] || 0;
      days.push({
        dayNumber: d,
        pomodoros: poms,
        isToday: d === todayDayNumber,
        isFuture: d > todayDayNumber
      });
    }

    return days;
  });

  calendarWeekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // --- CÁLCULOS SEMANALES ---
  weeklyData = computed(() => {
    const currentWeek = [...this.weeklyHistorical()];
    currentWeek.push(this.todayCompletedCount());
    return currentWeek;
  });

  weeklyLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  weeklyTotal = computed(() => {
    return this.weeklyData().reduce((a, b) => a + b, 0);
  });

  weeklyMax = computed(() => {
    return Math.max(...this.weeklyData(), 1);
  });

  // --- CÁLCULOS ANUALES ---
  annualData = computed(() => {
    const currentYear = [...this.annualHistorical()];
    currentYear[7] = 98 + this.todayCompletedCount();
    return currentYear;
  });

  annualLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  annualTotal = computed(() => {
    return this.annualData().reduce((a, b) => a + b, 0);
  });

  annualMax = computed(() => {
    return Math.max(...this.annualData(), 1);
  });

  longestStreak = 14;
}
