import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { SupabaseService, UserDailyAttempt } from '../../services/supabase.service';
import { Navbar } from '../../components/navbar/navbar';

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
export class Estadisticas implements OnInit, OnDestroy {
  public membership = inject(MembershipService);
  private supabaseService = inject(SupabaseService);

  // Intentos del día actual (reales)
  dailyAttempts = signal<UserDailyAttempt[]>([]);

  // Datos de la semana en curso (Lunes a Domingo, 7 elementos)
  weeklyHistorical = signal<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Datos del año en curso (Enero a Diciembre, 12 elementos)
  annualHistorical = signal<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  // Mapa de pomodoros del mes actual por día del mes (1..31)
  monthlyDayMap = signal<{ [day: number]: number }>({});

  // Métricas agregadas reales
  userStreak = signal<number>(0);
  userLongestStreak = signal<number>(0);
  userTotalPomodoros = signal<number>(0);
  userTotalFocusSeconds = signal<number>(0);
  userTotalCompletedObjectives = signal<number>(0);
  userTodayCompletedObjectives = signal<number>(0);

  // Estado del modal de compartir en LinkedIn
  showShareModal = signal(false);

  sidebarCollapsed = this.membership.sidebarCollapsed;
  userName = this.membership.userName;

  private realtimeChannel: any = null;

  ngOnInit() {
    this.loadStatsFromSupabase();

    if (this.supabaseService.isConfigured()) {
      this.realtimeChannel = this.supabaseService.client
        .channel('public:user_focus_stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => {
          this.loadStatsFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          this.loadStatsFromSupabase();
        })
        .subscribe();
    }
  }

  ngOnDestroy() {
    if (this.realtimeChannel && this.supabaseService.isConfigured()) {
      this.supabaseService.client.removeChannel(this.realtimeChannel);
    }
  }

  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  async loadStatsFromSupabase() {
    if (!this.supabaseService.isConfigured()) {
      // Fallback local: usar datos de MembershipService si Supabase no está conectado
      this.userStreak.set(this.membership.streak());
      this.userTotalPomodoros.set(this.membership.focusTomatoes());
      const ideasCompleted = this.membership.capturedIdeas().filter(i => i.is_completed).length;
      const pointsObjectives = Math.floor(this.membership.focusPoints() / 40);
      this.userTotalCompletedObjectives.set(Math.max(ideasCompleted, pointsObjectives));
      return;
    }

    try {
      const { data, error } = await this.supabaseService.getUserFocusStats();
      if (error || !data) {
        // En caso de no tener sesiones aún, todo permanece limpiamente en 0
        this.userStreak.set(this.membership.streak());
        this.userTotalPomodoros.set(this.membership.focusTomatoes());
        const ideasCompleted = this.membership.capturedIdeas().filter(i => i.is_completed).length;
        const pointsObjectives = Math.floor(this.membership.focusPoints() / 40);
        this.userTotalCompletedObjectives.set(Math.max(ideasCompleted, pointsObjectives));
        return;
      }

      this.dailyAttempts.set(data.today_attempts || []);
      this.weeklyHistorical.set(data.weekly_by_day || [0, 0, 0, 0, 0, 0, 0]);
      this.annualHistorical.set(data.annual_by_month || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      this.monthlyDayMap.set(data.monthly_by_day || {});
      this.userStreak.set(data.streak_days || 0);
      this.userLongestStreak.set(data.longest_streak || 0);
      this.userTotalPomodoros.set(data.total_pomodoros || 0);
      this.userTotalFocusSeconds.set(data.total_focus_seconds || 0);
      this.userTotalCompletedObjectives.set(data.total_completed_objectives || 0);
      this.userTodayCompletedObjectives.set(data.today_completed_objectives || 0);
    } catch (e) {
      console.warn('[Estadísticas Load Error]', e);
    }
  }

  // --- CÁLCULOS DEL DÍA (HOY) ---
  todayCompletedCount = computed(() => {
    return this.dailyAttempts().filter(a => a.status === 'completed').length;
  });

  todayFocusMinutes = computed(() => {
    const todayAttempts = this.dailyAttempts().filter(a => a.status === 'completed');
    if (todayAttempts.length === 0) return 0;
    const totalSecs = todayAttempts.reduce((sum, a) => sum + (a.duration_seconds || 1500), 0);
    return Math.round(totalSecs / 60);
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
    return this.weeklyHistorical();
  });

  weeklyTotal = computed(() => {
    return this.weeklyData().reduce((a, b) => a + b, 0);
  });

  weeklyAvg = computed(() => {
    const tot = this.weeklyTotal();
    return (tot / 7).toFixed(1);
  });

  weeklyMax = computed(() => {
    return Math.max(...this.weeklyData(), 1);
  });

  // --- RACHA ---
  get longestStreak(): number {
    return Math.max(this.userStreak(), this.userLongestStreak(), this.membership.streak());
  }

  // --- CÁLCULOS ANUALES Y TOTALES ---
  annualTotal = computed(() => {
    const sumAnnual = this.annualHistorical().reduce((a, b) => a + b, 0);
    return Math.max(sumAnnual, this.userTotalPomodoros(), this.membership.focusTomatoes());
  });

  totalFocusHours = computed(() => {
    const secs = this.userTotalFocusSeconds();
    if (secs > 0) {
      return (secs / 3600).toFixed(1);
    }
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

    const monthMap = this.monthlyDayMap();

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === todayDate;
      const isFuture = d > todayDate;

      let poms = 0;
      if (isToday) {
        poms = this.todayCompletedCount();
      } else if (!isFuture) {
        poms = monthMap[d] || 0;
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
    return this.annualHistorical();
  });

  annualMax = computed(() => {
    return Math.max(...this.annualData(), 1);
  });

  // --- CÁLCULOS DE OBJETIVOS Y METAS ---
  totalCompletedObjectives = computed(() => {
    const ideasCompleted = this.membership.capturedIdeas().filter(i => i.is_completed).length;
    const pointsObjectives = Math.floor(this.membership.focusPoints() / 40);
    return Math.max(this.userTotalCompletedObjectives(), ideasCompleted, pointsObjectives);
  });

  todayCompletedObjectives = computed(() => {
    const fromAttempts = this.dailyAttempts().filter(a => a.objective_completed === 'yes').length;
    const todayISO = new Date().toISOString().split('T')[0];
    const fromIdeasToday = this.membership.capturedIdeas().filter(i => {
      if (!i.is_completed || !i.completed_at) return false;
      return i.completed_at.startsWith(todayISO);
    }).length;
    return Math.max(this.userTodayCompletedObjectives(), fromAttempts, fromIdeasToday);
  });

  objectiveCompletionRate = computed(() => {
    const totalPoms = this.annualTotal();
    const totalObjs = this.totalCompletedObjectives();
    if (totalPoms === 0) return totalObjs > 0 ? 100 : 0;
    return Math.min(100, Math.round((totalObjs / totalPoms) * 100));
  });

  completedIdeasCount = computed(() => {
    return this.membership.capturedIdeas().filter(i => i.is_completed).length;
  });

  pendingIdeasCount = computed(() => {
    return this.membership.capturedIdeas().filter(i => !i.is_completed).length;
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
      `🎯 ¡He completado ${this.annualTotal()} sesiones de enfoque (${this.totalFocusHours()} horas) y conquistado ${this.totalCompletedObjectives()} objetivos en COFU manteniendo una racha de ${this.longestStreak} días! 🔥🧠\n\n` +
      `Supera la procrastinación en: https://cofu.app`
    );
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
    this.showShareModal.set(false);
  }
}


