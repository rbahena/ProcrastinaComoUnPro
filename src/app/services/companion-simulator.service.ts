import { Injectable, signal } from '@angular/core';

export interface SimulatedCompanion {
  id: string;
  name: string;
  avatar: string;
  color: string;
  profession: string;
  country: string;
  country_code: string;
  is_premium: boolean;
  wins: number;
  gold_medals?: number;
  silver_medals?: number;
  bronze_medals?: number;
  status: 'focused' | 'break' | 'idle';
  timeLeft: number;
  totalDuration: number;
  currentMission: string;
  missionsPool: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CompanionSimulatorService {
  private companions = signal<SimulatedCompanion[]>([
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'vramos',
      avatar: 'conejo',
      color: '#ec4899',
      profession: 'Estudiante de Medicina & Salud',
      country: 'México',
      country_code: 'MX',
      is_premium: true,
      wins: 3,
      gold_medals: 2,
      silver_medals: 1,
      bronze_medals: 0,
      status: 'focused',
      timeLeft: 1260, // 21 min
      totalDuration: 1500,
      currentMission: 'Repasando farmacología y fichas clínicas',
      missionsPool: [
        'Repasando farmacología y fichas clínicas',
        'Estudiando anatomía y sistema cardiovascular',
        'Leyendo caso clínico para pase de guardia',
        'Preparando resumen para examen de microbiología'
      ]
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Mateo',
      avatar: 'perro',
      color: '#3b82f6',
      profession: 'Ingeniería de Software & Arquitectura',
      country: 'Colombia',
      country_code: 'CO',
      is_premium: true,
      wins: 2,
      gold_medals: 1,
      silver_medals: 1,
      bronze_medals: 0,
      status: 'focused',
      timeLeft: 840, // 14 min
      totalDuration: 1500,
      currentMission: 'Refactorizando servicios y modelos de datos',
      missionsPool: [
        'Refactorizando servicios y modelos de datos',
        'Optimizando consultas en base de datos',
        'Escribiendo pruebas unitarias y de integración',
        'Revisando arquitectura y pull requests'
      ]
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      name: 'Silva',
      avatar: 'gato',
      color: '#10b981',
      profession: 'Investigador & Tesista de Posgrado',
      country: 'Brasil',
      country_code: 'BR',
      is_premium: true,
      wins: 2,
      gold_medals: 0,
      silver_medals: 0,
      bronze_medals: 2,
      status: 'break',
      timeLeft: 190, // ~3 min de pausa
      totalDuration: 300,
      currentMission: '☕ Pausa para café y estiramiento',
      missionsPool: [
        'Redactando marco teórico y revisión de literatura',
        'Analizando datos estadísticos del experimento',
        'Escribiendo artículo para revista indexada',
        'Preparando presentación para defensa de tesis'
      ]
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      name: 'Ethan_M',
      avatar: 'loro',
      color: '#8b5cf6',
      profession: 'Emprendimiento & Estrategia Digital',
      country: 'USA',
      country_code: 'US',
      is_premium: true,
      wins: 1,
      gold_medals: 0,
      silver_medals: 1,
      bronze_medals: 0,
      status: 'focused',
      timeLeft: 420, // 7 min
      totalDuration: 1500,
      currentMission: 'Redactando propuesta y pitch comercial',
      missionsPool: [
        'Redactando propuesta y pitch comercial',
        'Analizando métricas de campaña y conversión',
        'Diseñando embudo de ventas y contenidos',
        'Planificando reunión estratégica con clientes'
      ]
    },
    {
      id: 'a0000000-0000-0000-0000-000000000005',
      name: 'Sofi_N',
      avatar: 'hamster',
      color: '#f59e0b',
      profession: 'Derecho & Oposiciones',
      country: 'España',
      country_code: 'ES',
      is_premium: true,
      wins: 1,
      gold_medals: 0,
      silver_medals: 0,
      bronze_medals: 1,
      status: 'focused',
      timeLeft: 1440, // 24 min
      totalDuration: 1500,
      currentMission: 'Memorizando temas de derecho constitucional',
      missionsPool: [
        'Memorizando temas de derecho constitucional',
        'Analizando jurisprudencia y caso procesal',
        'Simulando examen oral de leyes y estatutos',
        'Estructurando esquema de derecho administrativo'
      ]
    },
    {
      id: 'a0000000-0000-0000-0000-000000000006',
      name: 'Gabo',
      avatar: 'raton',
      color: '#06b6d4',
      profession: 'Finanzas Corporativas & Contabilidad',
      country: 'Brasil',
      country_code: 'BR',
      is_premium: true,
      wins: 0,
      gold_medals: 0,
      silver_medals: 0,
      bronze_medals: 0,
      status: 'idle',
      timeLeft: 0,
      totalDuration: 1500,
      currentMission: 'En el campamento',
      missionsPool: [
        'Consolidando balances y flujo de caja',
        'Modelando proyecciones financieras y presupuesto',
        'Auditando reportes de costos y facturación',
        'Preparando informe de rentabilidad mensual'
      ]
    },
    {
      id: 'a0000000-0000-0000-0000-000000000007',
      name: 'm.herrera',
      avatar: 'tortuga',
      color: '#14b8a6',
      profession: 'Docencia, Idiomas & Traducción',
      country: 'México',
      country_code: 'MX',
      is_premium: true,
      wins: 0,
      gold_medals: 0,
      silver_medals: 0,
      bronze_medals: 0,
      status: 'idle',
      timeLeft: 0,
      totalDuration: 1500,
      currentMission: 'En el campamento',
      missionsPool: [
        'Planificando lecciones y material didáctico',
        'Práctica intensiva de idiomas y gramática',
        'Calificando ensayos y proyectos de alumnos',
        'Redactando guía de técnicas de estudio'
      ]
    }
  ]);

  private tickerInterval: any = null;

  constructor() {
    this.startTicker();
  }

  /**
   * Ciclo de vida interno: decrementa temporizadores y alterna orgánicamente entre enfoque y descansos
   */
  private startTicker() {
    if (this.tickerInterval) return;
    this.tickerInterval = setInterval(() => {
      this.companions.update(list => {
        return list.map(companion => {
          if (companion.status === 'focused') {
            const nextTime = companion.timeLeft - 1;
            if (nextTime <= 0) {
              // Completó pomodoro: pasa a descanso de 5 min (300 seg)
              return {
                ...companion,
                status: 'break',
                timeLeft: 300,
                totalDuration: 300,
                currentMission: '☕ Pausa para café y estiramiento'
              };
            }
            return { ...companion, timeLeft: nextTime };
          } else if (companion.status === 'break') {
            const nextTime = companion.timeLeft - 1;
            if (nextTime <= 0) {
              // Concluyó descanso: pasa a nuevo bloque de 25 min (1500 seg)
              const randomMission = companion.missionsPool[
                Math.floor(Math.random() * companion.missionsPool.length)
              ];
              return {
                ...companion,
                status: 'focused',
                timeLeft: 1500,
                totalDuration: 1500,
                currentMission: randomMission
              };
            }
            return { ...companion, timeLeft: nextTime };
          } else {
            // Idle en campamento: ocasionalmente (1 de cada 450 ticks) decide entrar a enfoque
            if (Math.random() < 0.002) {
              const randomMission = companion.missionsPool[
                Math.floor(Math.random() * companion.missionsPool.length)
              ];
              return {
                ...companion,
                status: 'focused',
                timeLeft: 1500,
                totalDuration: 1500,
                currentMission: randomMission
              };
            }
            return companion;
          }
        });
      });
    }, 1000);
  }

  /**
   * Obtiene la lista de compañeros simulados para la pantalla Home (Campamento y Pomodoro)
   */
  getHomeSimulatedCompanions(excludeUserName: string = ''): {
    pomodoroUsers: {
      id: string;
      name: string;
      avatar: string;
      color: string;
      wins: number;
      gold_medals?: number;
      silver_medals?: number;
      bronze_medals?: number;
      status: 'focused';
      mission: string;
      is_premium: boolean;
    }[];
    campUsers: {
      id: string;
      name: string;
      avatar: string;
      color: string;
      wins: number;
      gold_medals?: number;
      silver_medals?: number;
      bronze_medals?: number;
      status: 'idle' | 'break';
      mission: string;
      is_premium: boolean;
    }[];
  } {
    const list = this.companions();
    const cleanExclude = (excludeUserName || '').toLowerCase().trim();

    const pomodoroUsers = list
      .filter(c => c.status === 'focused' && c.name.toLowerCase() !== cleanExclude)
      .map(c => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        color: c.color,
        wins: c.wins,
        gold_medals: c.gold_medals || 0,
        silver_medals: c.silver_medals || 0,
        bronze_medals: c.bronze_medals || 0,
        status: 'focused' as const,
        mission: c.currentMission,
        is_premium: c.is_premium
      }));

    const campUsers = list
      .filter(c => (c.status === 'break' || c.status === 'idle') && c.name.toLowerCase() !== cleanExclude)
      .map(c => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        color: c.color,
        wins: c.wins,
        gold_medals: c.gold_medals || 0,
        silver_medals: c.silver_medals || 0,
        bronze_medals: c.bronze_medals || 0,
        status: c.status as 'break' | 'idle',
        mission: c.currentMission,
        is_premium: c.is_premium
      }));

    return { pomodoroUsers, campUsers };
  }

  /**
   * Obtiene compañeros simulados formateados para la Arena / Coworking de Enfoque
   */
  getEnfoqueSimulatedUsers(excludeUserName: string = '', startDeskIndex: number = 1): any[] {
    const list = this.companions();
    const cleanExclude = (excludeUserName || '').toLowerCase().trim();

    return list
      .filter(c => c.name.toLowerCase() !== cleanExclude)
      .map((c, idx) => {
        const pct = c.totalDuration > 0
          ? Math.min(100, Math.floor(((c.totalDuration - c.timeLeft) / c.totalDuration) * 100))
          : 0;

        return {
          id: c.id,
          userId: c.id,
          name: c.name,
          avatar: c.avatar,
          is_premium: c.is_premium,
          status: c.status,
          mission: c.currentMission,
          timeLeft: c.timeLeft,
          percentage: pct,
          target_end_time: c.status !== 'idle' ? Date.now() + c.timeLeft * 1000 : null,
          total_duration: c.totalDuration,
          desk: startDeskIndex + idx,
          is_live: c.status !== 'idle',
          reaction: ''
        };
      });
  }

  /**
   * Genera un evento ocasional y motivacional de apoyo de un compañero virtual
   */
  getRandomSupportCheer(currentUserName: string): {
    from: string;
    avatar: string;
    emoji: string;
    message: string;
  } | null {
    const active = this.companions().filter(
      c => c.status === 'focused' && c.name.toLowerCase() !== (currentUserName || '').toLowerCase()
    );
    if (active.length === 0) return null;

    const sender = active[Math.floor(Math.random() * active.length)];
    const cheers = [
      { emoji: '⚡', message: `¡Fuerza en este bloque, ${currentUserName || 'Guerrero'}!` },
      { emoji: '🔥', message: '¡Gran ritmo de concentración! Sigamos imparables.' },
      { emoji: '👏', message: '¡Excelente disciplina! Cada minuto invertido cuenta.' },
      { emoji: '🎯', message: '¡Foco total! El esfuerzo de hoy vence a la procrastinación.' },
      { emoji: '📚', message: '¡Paso a paso construyendo grandes metas!' },
      { emoji: '💪', message: '¡Excelente ritmo! Estamos todos avanzando juntos.' }
    ];
    const cheer = cheers[Math.floor(Math.random() * cheers.length)];

    return {
      from: sender.name,
      avatar: sender.avatar,
      emoji: cheer.emoji,
      message: cheer.message
    };
  }
}
