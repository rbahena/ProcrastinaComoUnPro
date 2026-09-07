import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { Navbar } from '../../components/navbar/navbar';

export interface Attempt {
  status: 'completed' | 'abandoned' | 'interrupted';
  time: string;
}

export interface CalendarDay {
  dayNumber: number | null;
  pomodoros: number;
  isToday: boolean;
  isFuture: boolean;
  level: number;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css'
})
export class Estadisticas implements OnInit {
  membership = inject(MembershipService);

  // Intentos del día actual
  dailyAttempts = signal<Attempt[]>([]);

  // Datos históricos de la semana (Lunes a Sábado)
  weeklyHistorical = signal<number[]>([4, 5, 6, 3, 7, 2]);

  // Datos históricos para el año
  annualHistorical = signal<number[]>([85, 92, 110, 95, 104, 118, 125, 98, 0, 0, 0, 0]);

  // Estado del modal de compartir en LinkedIn
  showShareModal = signal(false);

  sidebarCollapsed = this.membership.sidebarCollapsed;
  userName = this.membership.userName;

  ngOnInit() {
    this.loadDailyAttempts();
  }

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  loadDailyAttempts() {
    const saved = localStorage.getItem('daily-attempts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.dailyAttempts.set(parsed);
          return;
        }
      } catch (e) {
        console.error('Error parsing daily attempts', e);
      }
    }

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

  // --- CÁLCULOS DEL DÍA (HOY) ---
  todayCompletedCount = computed(() => {
    return this.dailyAttempts().filter(a => a.status === 'completed').length;
  });

  todayFocusMinutes = computed(() => {
    return this.todayCompletedCount() * 25;
  });

  todayFocusHoursFormatted = computed(() => {
    const mins = this.todayFocusMinutes();
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  });

  // --- CÁLCULOS SEMANALES ---
  weeklyLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  weeklyData = computed(() => {
    const currentWeek = [...this.weeklyHistorical()];
    currentWeek.push(this.todayCompletedCount());
    return currentWeek;
  });

  weeklyTotal = computed(() => {
    return this.weeklyData().reduce((a, b) => a + b, 0);
  });

  weeklyAvg = computed(() => {
    return (this.weeklyTotal() / 7).toFixed(1);
  });

  weeklyMax = computed(() => {
    return Math.max(...this.weeklyData(), 1);
  });

  // --- RACHA ---
  get longestStreak(): number {
    return Math.max(14, this.membership.streak());
  }

  // --- CÁLCULOS ANUALES Y TOTALES ---
  annualTotal = computed(() => {
    const sum = this.annualHistorical().reduce((a, b) => a + b, 0);
    return sum + this.todayCompletedCount();
  });

  totalFocusHours = computed(() => {
    return (this.annualTotal() * 25 / 60).toFixed(0);
  });

  // --- CALENDARIO DEL MES ACTUAL ---
  calendarWeekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  currentMonthName = computed(() => {
    const now = new Date();
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });

  calendarDays = computed<CalendarDay[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayDate = now.getDate();

    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0 es Domingo
    const offsetCount = (dayOfWeek + 6) % 7; // Ajuste a Lunes

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: CalendarDay[] = [];

    // Offset celdas vacías
    for (let i = 0; i < offsetCount; i++) {
      days.push({ dayNumber: null, pomodoros: 0, isToday: false, isFuture: false, level: 0 });
    }

    const sampleData: { [key: number]: number } = {
      1: 4, 2: 2, 3: 5, 4: 6, 5: 4, 6: 5, 7: 6, 8: 3, 9: 2, 10: 7
    };

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === todayDate;
      const isFuture = d > todayDate;

      let poms = 0;
      if (isToday) {
        poms = this.todayCompletedCount();
      } else if (!isFuture) {
        poms = sampleData[d] !== undefined ? sampleData[d] : ((d * 2 + 1) % 6);
      }

      let level = 0;
      if (poms >= 5) level = 3;
      else if (poms >= 3) level = 2;
      else if (poms >= 1) level = 1;

      days.push({
        dayNumber: d,
        pomodoros: poms,
        isToday,
        isFuture,
        level
      });
    }

    return days;
  });

  monthTotalPomodoros = computed(() => {
    return this.calendarDays().reduce((acc, day) => acc + (day.dayNumber ? day.pomodoros : 0), 0);
  });

  // --- CÁLCULOS ANUALES ---
  annualLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  currentMonthIndex = computed(() => new Date().getMonth());

  annualData = computed(() => {
    const list = [...this.annualHistorical()];
    const currentMonth = this.currentMonthIndex();
    list[currentMonth] = 98 + this.todayCompletedCount();
    return list;
  });

  annualMax = computed(() => {
    return Math.max(...this.annualData(), 1);
  });

  // --- COMPARTIR EN LINKEDIN ---
  openShareModal() {
    this.showShareModal.set(true);
  }

  closeShareModal() {
    this.showShareModal.set(false);
  }

  shareOnLinkedIn() {
    const text = encodeURIComponent(
      `🎯 ¡He completado ${this.annualTotal()} sesiones de enfoque (${this.totalFocusHours()} horas) en COFU y mantengo una racha de ${this.longestStreak} días! 🔥🧠\n\n` +
      `Supera la procrastinación en: https://cofu.app`
    );
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
    this.showShareModal.set(false);
  }
}

