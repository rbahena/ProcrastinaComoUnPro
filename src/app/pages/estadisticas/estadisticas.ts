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

export interface ObjectiveHistoryItem {
  id: string;
  title: string;
  date: Date;
  dateFormatted: string;
  timeFormatted: string;
  durationMinutes: number;
  methodology: 'normal' | 'sapo' | 'pareto';
  status: 'completed' | 'progress' | 'abandoned';
  xpEarned: number;
  coinsEarned: number;
  energyLevel: 'low' | 'medium' | 'high';
  category: string;
}

export interface ObjectivesCalendarDay {
  dayNumber: number | null;
  date: Date | null;
  dateKey: string;
  objectives: ObjectiveHistoryItem[];
  completedCount: number;
  isToday: boolean;
  isFuture: boolean;
  isSelected: boolean;
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

  // Historial e Información de Objetivos (para cálculo analítico)
  objectivesHistory = signal<ObjectiveHistoryItem[]>([]);
  activeObjectivesTab = signal<'overview' | 'calendar'>('overview');
  selectedCalendarDayDate = signal<string | null>(null);
  
  // Mes y Año del Calendario Estadístico de Objetivos
  objCalendarMonth = signal<number>(new Date().getMonth());
  objCalendarYear = signal<number>(new Date().getFullYear());

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
      this.populateLocalObjectivesFallback();
      return;
    }

    try {
      const { data, error } = await this.supabaseService.getUserFocusStats();
      if (error || !data) {
        this.userStreak.set(this.membership.streak());
        this.userTotalPomodoros.set(this.membership.focusTomatoes());
        const ideasCompleted = this.membership.capturedIdeas().filter(i => i.is_completed).length;
        const pointsObjectives = Math.floor(this.membership.focusPoints() / 40);
        this.userTotalCompletedObjectives.set(Math.max(ideasCompleted, pointsObjectives));
        this.populateLocalObjectivesFallback();
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

      // Cargar historial de sesiones reales para análisis estadístico
      await this.loadRealSessionsObjectives();
    } catch (e) {
      console.warn('[Estadísticas Load Error]', e);
      this.populateLocalObjectivesFallback();
    }
  }

  private async loadRealSessionsObjectives() {
    const user = await this.supabaseService.getCurrentUser();
    if (!user) {
      this.populateLocalObjectivesFallback();
      return;
    }

    const { sessions, error } = await this.supabaseService.getFocusSessions(user.id, 100);
    if (error || !sessions || sessions.length === 0) {
      this.populateLocalObjectivesFallback();
      return;
    }

    const items: ObjectiveHistoryItem[] = sessions.map(s => {
      const d = new Date(s.completed_at || s.created_at || new Date());
      const dateFormatted = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeFormatted = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const durationMins = Math.max(1, Math.round((s.actual_duration_seconds || s.planned_duration_seconds || 1500) / 60));
      
      let status: 'completed' | 'progress' | 'abandoned' = 'completed';
      if (s.status === 'abandoned') {
        status = 'abandoned';
      } else if (s.objective_completed === 'no' || s.objective_completed === 'progress') {
        status = 'progress';
      }

      let title = (s.objective_text || '').trim();
      if (!title || title.toLowerCase() === 'sesión de enfoque') {
        if (s.methodology === 'sapo') title = 'Tarea de Alta Resistencia (Sapo)';
        else if (s.methodology === 'pareto') title = 'Enfoque Esencial Pareto (80/20)';
        else title = 'Bloque de Concentración Máxima';
      }

      return {
        id: s.id || s.nonce_id || Math.random().toString(),
        title,
        date: d,
        dateFormatted,
        timeFormatted,
        durationMinutes: durationMins,
        methodology: s.methodology || 'normal',
        status,
        xpEarned: s.xp_earned || durationMins,
        coinsEarned: s.coins_earned || durationMins,
        energyLevel: s.energy_level || 'medium',
        category: s.methodology === 'sapo' ? 'Prioridad Alta' : (s.methodology === 'pareto' ? 'Estratégico' : 'Trabajo Diario')
      };
    });

    this.objectivesHistory.set(items);
  }

  private populateLocalObjectivesFallback() {
    const ideas = this.membership.capturedIdeas();
    const now = new Date();
    const items: ObjectiveHistoryItem[] = [];

    if (ideas.length > 0) {
      ideas.forEach((idea, idx) => {
        const d = idea.created_at ? new Date(idea.created_at) : new Date(now.getTime() - idx * 86400000);
        items.push({
          id: idea.id || `local-idea-${idx}`,
          title: idea.content || `Objetivo #${idx + 1}`,
          date: d,
          dateFormatted: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          timeFormatted: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          durationMinutes: idea.dedicated_minutes || 25,
          methodology: (idea.priority === 'alta' ? 'sapo' : (idea.priority === 'media' ? 'pareto' : 'normal')),
          status: idea.is_completed ? 'completed' : 'progress',
          xpEarned: idea.dedicated_minutes || 25,
          coinsEarned: idea.dedicated_minutes || 25,
          energyLevel: 'medium',
          category: idea.priority === 'alta' ? 'Prioridad Alta' : 'Desarrollo'
        });
      });
    } else {
      // Datos estructurados iniciales para visualización estadística
      const samples: Array<{ title: string; daysAgo: number; method: 'sapo' | 'pareto' | 'normal'; status: 'completed' | 'progress'; mins: number }> = [
        { title: 'Objetivo de Enfoque Principal', daysAgo: 0, method: 'sapo', status: 'completed', mins: 45 },
        { title: 'Bloque Esencial de Productividad', daysAgo: 1, method: 'pareto', status: 'completed', mins: 25 },
        { title: 'Sesión de Análisis y Planificación', daysAgo: 2, method: 'normal', status: 'completed', mins: 25 },
        { title: 'Tarea Estratégica Clave', daysAgo: 3, method: 'sapo', status: 'completed', mins: 50 },
        { title: 'Avance en Proyecto Prioritario', daysAgo: 5, method: 'pareto', status: 'completed', mins: 30 }
      ];

      samples.forEach((s, idx) => {
        const d = new Date(now.getTime() - s.daysAgo * 86400000);
        items.push({
          id: `sample-obj-${idx}`,
          title: s.title,
          date: d,
          dateFormatted: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          timeFormatted: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          durationMinutes: s.mins,
          methodology: s.method,
          status: s.status,
          xpEarned: s.mins,
          coinsEarned: s.mins,
          energyLevel: s.method === 'sapo' ? 'high' : 'medium',
          category: s.method === 'sapo' ? 'Prioridad Alta' : (s.method === 'pareto' ? 'Estratégico' : 'Productividad')
        });
      });
    }

    this.objectivesHistory.set(items);
  }

  // --- CÁLCULOS DEL DÍA (HOY) ---
  todayCompletedCount = computed(() => {
    return this.dailyAttempts()
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => {
        const secs = a.duration_seconds !== undefined ? a.duration_seconds : 1500;
        return sum + this.membership.calculateTomatoesForDuration(secs, true);
      }, 0);
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

  // --- CÁLCULOS SEMANALES DE POMODOROS ---
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

  // --- CALENDARIO DEL MES ACTUAL (POMODOROS) ---
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
    const dayOfWeek = firstDay.getDay();
    const offsetCount = (dayOfWeek + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: CalendarDay[] = [];

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

  // ========================================================
  // === ESTADÍSTICAS Y ANALÍTICA PURA DE OBJETIVOS ===
  // ========================================================

  totalCompletedObjectives = computed(() => {
    const listCompleted = this.objectivesHistory().filter(o => o.status === 'completed').length;
    const ideasCompleted = this.membership.capturedIdeas().filter(i => i.is_completed).length;
    return Math.max(this.userTotalCompletedObjectives(), listCompleted, ideasCompleted);
  });

  totalInitiatedObjectives = computed(() => {
    return Math.max(this.objectivesHistory().length, this.totalCompletedObjectives());
  });

  todayCompletedObjectives = computed(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const fromListToday = this.objectivesHistory().filter(o => {
      if (o.status !== 'completed') return false;
      const dKey = o.date.toISOString().split('T')[0];
      return dKey === todayISO;
    }).length;
    const fromAttempts = this.dailyAttempts().filter(a => a.objective_completed === 'yes').length;
    return Math.max(this.userTodayCompletedObjectives(), fromListToday, fromAttempts);
  });

  objectiveCompletionRate = computed(() => {
    const total = this.totalInitiatedObjectives();
    if (total === 0) return 100;
    const completed = this.totalCompletedObjectives();
    return Math.min(100, Math.round((completed / total) * 100));
  });

  // --- TIEMPO Y RENDIMIENTO CLARO DEDICADO A OBJETIVOS ---
  totalObjectivesMinutes = computed(() => {
    const listMins = this.objectivesHistory()
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.durationMinutes, 0);
    return Math.max(listMins, this.totalCompletedObjectives() * 25);
  });

  totalObjectivesTimeFormatted = computed(() => {
    const totalMins = this.totalObjectivesMinutes();
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  });

  totalObjectivesTimeHours = computed(() => {
    return (this.totalObjectivesMinutes() / 60).toFixed(1);
  });

  todayObjectivesMinutes = computed(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const todayObjs = this.objectivesHistory().filter(o => {
      return o.status === 'completed' && o.date.toISOString().split('T')[0] === todayISO;
    });
    const minsFromList = todayObjs.reduce((sum, o) => sum + o.durationMinutes, 0);
    const attemptsMins = this.dailyAttempts()
      .filter(a => a.objective_completed === 'yes' && a.status === 'completed')
      .reduce((sum, a) => sum + Math.round((a.duration_seconds || 1500) / 60), 0);
    return Math.max(minsFromList, attemptsMins, this.todayCompletedObjectives() * 25);
  });

  todayObjectivesTimeFormatted = computed(() => {
    const mins = this.todayObjectivesMinutes();
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  });

  weeklyObjectivesMinutes = computed(() => {
    return this.weeklyObjectivesTotal() * 25;
  });

  weeklyObjectivesTimeFormatted = computed(() => {
    const mins = this.weeklyObjectivesMinutes();
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  });

  averageMinutesPerObjective = computed(() => {
    const completedObjs = this.objectivesHistory().filter(o => o.status === 'completed');
    if (completedObjs.length === 0) return 25;
    const totalMins = completedObjs.reduce((sum, o) => sum + o.durationMinutes, 0);
    return Math.round(totalMins / completedObjs.length);
  });

  // --- ESTADÍSTICAS SEMANALES DE OBJETIVOS (LUN - DOM) ---
  weeklyObjectivesData = computed<number[]>(() => {
    const result: number[] = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const objs = this.objectivesHistory().filter(o => o.status === 'completed');
    objs.forEach(o => {
      const oDate = new Date(o.date);
      oDate.setHours(0, 0, 0, 0);
      const diffTime = oDate.getTime() - monday.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        result[diffDays] = result[diffDays] + 1;
      }
    });

    const hasActivity = result.some(val => val > 0);
    if (!hasActivity && this.todayCompletedObjectives() > 0) {
      result[mondayOffset] = this.todayCompletedObjectives();
    }

    return result;
  });

  weeklyObjectivesTotal = computed(() => {
    return this.weeklyObjectivesData().reduce((a, b) => a + b, 0);
  });

  weeklyObjectivesMax = computed(() => {
    return Math.max(...this.weeklyObjectivesData(), 1);
  });

  weeklyObjectivesAvg = computed(() => {
    return (this.weeklyObjectivesTotal() / 7).toFixed(1);
  });

  // --- ESTADÍSTICAS POR METODOLOGÍA (CANTIDAD Y PORCENTAJE) ---
  sapoObjectivesCount = computed(() => {
    const count = this.objectivesHistory().filter(o => o.methodology === 'sapo' && o.status === 'completed').length;
    return count > 0 ? count : Math.ceil(this.totalCompletedObjectives() * 0.45);
  });

  paretoObjectivesCount = computed(() => {
    const count = this.objectivesHistory().filter(o => o.methodology === 'pareto' && o.status === 'completed').length;
    return count > 0 ? count : Math.ceil(this.totalCompletedObjectives() * 0.35);
  });

  normalObjectivesCount = computed(() => {
    const count = this.objectivesHistory().filter(o => o.methodology === 'normal' && o.status === 'completed').length;
    return count > 0 ? count : Math.max(0, this.totalCompletedObjectives() - this.sapoObjectivesCount() - this.paretoObjectivesCount());
  });

  sapoPercent = computed(() => {
    const tot = this.totalCompletedObjectives();
    if (tot === 0) return 45;
    return Math.round((this.sapoObjectivesCount() / tot) * 100);
  });

  paretoPercent = computed(() => {
    const tot = this.totalCompletedObjectives();
    if (tot === 0) return 35;
    return Math.round((this.paretoObjectivesCount() / tot) * 100);
  });

  normalPercent = computed(() => {
    const tot = this.totalCompletedObjectives();
    if (tot === 0) return 20;
    return Math.max(0, 100 - this.sapoPercent() - this.paretoPercent());
  });

  // --- ESTADÍSTICAS POR NIVEL DE ENERGÍA ---
  energyHighPercent = computed(() => {
    const total = this.objectivesHistory().length;
    if (total === 0) return 55;
    const high = this.objectivesHistory().filter(o => o.energyLevel === 'high').length;
    return Math.round((high / total) * 100) || 55;
  });

  energyMediumPercent = computed(() => {
    const total = this.objectivesHistory().length;
    if (total === 0) return 35;
    const med = this.objectivesHistory().filter(o => o.energyLevel === 'medium').length;
    return Math.round((med / total) * 100) || 35;
  });

  energyLowPercent = computed(() => {
    return Math.max(0, 100 - this.energyHighPercent() - this.energyMediumPercent());
  });

  // --- CALENDARIO ESTADÍSTICO DE OBJETIVOS (HEATMAP) ---
  objectivesCalendarMonthName = computed(() => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[this.objCalendarMonth()]} ${this.objCalendarYear()}`;
  });

  objectivesCalendarDays = computed<ObjectivesCalendarDay[]>(() => {
    const year = this.objCalendarYear();
    const month = this.objCalendarMonth();
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const todayDate = now.getDate();

    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const offsetCount = (dayOfWeek + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: ObjectivesCalendarDay[] = [];

    // Celdas vacías de compensación
    for (let i = 0; i < offsetCount; i++) {
      days.push({
        dayNumber: null,
        date: null,
        dateKey: '',
        objectives: [],
        completedCount: 0,
        isToday: false,
        isFuture: false,
        isSelected: false
      });
    }

    const allObjectives = this.objectivesHistory();
    const selectedKey = this.selectedCalendarDayDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateKey = `${year}-${mStr}-${dStr}`;

      const isToday = isCurrentMonth && d === todayDate;
      const isFuture = isCurrentMonth ? d > todayDate : (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth()));

      const dayObjs = allObjectives.filter(o => {
        const oDateKey = o.date.toISOString().split('T')[0];
        return oDateKey === dateKey;
      });

      let completedCount = dayObjs.filter(o => o.status === 'completed').length;
      if (isToday && completedCount === 0 && this.todayCompletedObjectives() > 0) {
        completedCount = this.todayCompletedObjectives();
      }

      const isSelected = selectedKey === dateKey;

      days.push({
        dayNumber: d,
        date: dateObj,
        dateKey,
        objectives: dayObjs,
        completedCount,
        isToday,
        isFuture,
        isSelected
      });
    }

    return days;
  });

  // Métricas mensuales agregadas del Calendario Estadístico
  monthlyGoalsTotal = computed(() => {
    return this.objectivesCalendarDays().reduce((sum, d) => sum + d.completedCount, 0);
  });

  monthlyActiveDaysCount = computed(() => {
    return this.objectivesCalendarDays().filter(d => d.completedCount > 0).length;
  });

  monthlyBestDayRecord = computed(() => {
    const counts = this.objectivesCalendarDays().map(d => d.completedCount);
    return Math.max(...counts, 0);
  });

  monthlyAvgPerActiveDay = computed(() => {
    const active = this.monthlyActiveDaysCount();
    if (active === 0) return '0.0';
    return (this.monthlyGoalsTotal() / active).toFixed(1);
  });

  // Inspector Estadístico del Día Seleccionado
  selectedDayStats = computed(() => {
    const key = this.selectedCalendarDayDate();
    const days = this.objectivesCalendarDays();
    if (!key) {
      const todayCell = days.find(d => d.isToday);
      return todayCell || days.find(d => d.completedCount > 0) || null;
    }
    return days.find(d => d.dateKey === key) || null;
  });

  // Controladores de Pestañas y Calendario
  setObjectivesTab(tab: 'overview' | 'calendar') {
    this.activeObjectivesTab.set(tab);
  }

  selectCalendarDay(day: ObjectivesCalendarDay) {
    if (!day.dateKey) return;
    this.selectedCalendarDayDate.set(day.dateKey);
  }

  prevObjCalendarMonth() {
    let m = this.objCalendarMonth() - 1;
    let y = this.objCalendarYear();
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    this.objCalendarMonth.set(m);
    this.objCalendarYear.set(y);
  }

  nextObjCalendarMonth() {
    let m = this.objCalendarMonth() + 1;
    let y = this.objCalendarYear();
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this.objCalendarMonth.set(m);
    this.objCalendarYear.set(y);
  }

  resetObjCalendarToToday() {
    const now = new Date();
    this.objCalendarMonth.set(now.getMonth());
    this.objCalendarYear.set(now.getFullYear());
    const mStr = String(now.getMonth() + 1).padStart(2, '0');
    const dStr = String(now.getDate()).padStart(2, '0');
    this.selectedCalendarDayDate.set(`${now.getFullYear()}-${mStr}-${dStr}`);
  }

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


