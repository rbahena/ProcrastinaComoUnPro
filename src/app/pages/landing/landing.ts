import { Component, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalService } from '../../services/legal.service';

interface ExcuseDetail {
  title: string;
  emoji: string;
  desc: string;
  tag: string;
  btnText: string;
  link: string;
}

interface ChallengeDay {
  num: string;
  label: string;
  title: string;
  desc: string;
  metric1: string;
  metric2: string;
  link: string;
  btnText: string;
}

import { TranslatePipe, TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements OnInit, OnDestroy {
  constructor(public legalService: LegalService, public translation: TranslationService) {}
  private timerId?: any;

  langMenuOpen = signal<boolean>(false);
  mobileNavOpen = signal<boolean>(false);

  toggleLangMenu(event: Event) {
    event.stopPropagation();
    this.closeMobileNav();
    this.langMenuOpen.update(open => !open);
  }

  closeLangMenu() {
    this.langMenuOpen.set(false);
  }

  toggleMobileNav(event: Event) {
    event.stopPropagation();
    this.closeLangMenu();
    const next = !this.mobileNavOpen();
    this.mobileNavOpen.set(next);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('mobile-menu-open', next);
    }
  }

  closeMobileNav() {
    this.mobileNavOpen.set(false);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('mobile-menu-open');
    }
  }

  selectLanguage(lang: 'es' | 'en', closeMobile = false) {
    this.translation.setLanguage(lang, true);
    this.closeLangMenu();
    if (closeMobile) {
      this.closeMobileNav();
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeLangMenu();
    this.closeMobileNav();
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.closeLangMenu();
    this.closeMobileNav();
  }

  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined' && window.innerWidth > 768 && this.mobileNavOpen()) {
      this.closeMobileNav();
    }
  }

  private getExcusesMap(lang: string): Record<string, ExcuseDetail> {
    const isEs = lang === 'es';
    return {
      perfect: {
        title: isEs ? 'Parálisis por Perfeccionismo (Miedo al fallo)' : 'Perfectionism Paralysis (Fear of Failure)',
        emoji: 'fa-solid fa-face-grimace',
        desc: isEs 
          ? 'Tu cerebro evita arrancar porque anticipa la presión de un resultado impecable. Como explica el investigador Dr. Timothy Pychyl, la procrastinación es un mecanismo inconsciente de evitación emocional para proteger tu autoestima. Táctica: Aplica el "Principio de la Tarea Borrador". Escribe o diseña algo deliberadamente mediocre durante 10 minutos. Al eliminar la barra de calidad inicial, rompes la resistencia.'
          : 'Your brain avoids starting because it anticipates the pressure of an outcome needing to be perfect. As researcher Dr. Timothy Pychyl explains, procrastination is an emotional coping mechanism to protect self-esteem. Tactic: Apply the "Draft Task Principle". Deliberately draft something mediocre for 10 minutes to eliminate initial friction.',
        tag: isEs ? 'Tesis: Dr. Timothy Pychyl' : 'Thesis: Dr. Timothy Pychyl',
        btnText: isEs ? 'Iniciar Sesión Corta (15 min)' : 'Start Short Session (15 min)',
        link: '/focus',
      },
      bored: {
        title: isEs ? 'Apatía Cognitiva (Tarea tediosa o monótona)' : 'Cognitive Apathy (Tedious or Monotonous Task)',
        emoji: 'fa-solid fa-face-tired',
        desc: isEs
          ? 'Cuando una tarea carece de recompensa inmediata, sufres un déficit temporal de dopamina. Táctica: Aplica la "Regla de los 2 Minutos" de James Clear (Autor de Hábitos Atómicos) acoplada a un estímulo sensorial. Camufla el tedio aislando tu espectro auditivo con frecuencias continuas (como Ruido Café o Lluvia Sintetizada) e inicia con un paso sumamente diminuto para generar inercia.'
          : 'When a task lacks immediate reward, your brain undergoes a dopamine deficit. Tactic: Apply James Clear\'s "2-Minute Rule" coupled with sensory stimulation. Mask distractions with continuous frequencies (brown noise or rain) and take a microscopic first step to build momentum.',
        tag: isEs ? 'Tesis: James Clear' : 'Thesis: James Clear',
        btnText: isEs ? 'Iniciar Pomodoro + Audio' : 'Start Pomodoro + Audio',
        link: '/focus',
      },
      time: {
        title: isEs ? 'Sesgo del Presente (Optimismo temporal engañoso)' : 'Present Bias (Deceptive Time Optimism)',
        emoji: 'fa-solid fa-hourglass-half',
        desc: isEs
          ? 'Tu cerebro valora el descanso actual infinitamente más que la entrega futura. Cree falsamente que "mañana tendrás más energía". Táctica: Rompe la Ley de Parkinson. Traduce tus plazos límite a días y horas reales. Haz visible la contabilidad de tu tiempo real para desactivar el optimismo y forzar a la corteza prefrontal a actuar hoy.'
          : 'Your brain values immediate comfort over future deadlines, falsely assuming tomorrow will bring more willpower. Tactic: Break Parkinson\'s Law. Convert deadlines into hours and make time accounting visible to prompt action today.',
        tag: isEs ? 'Tesis: Ley de Parkinson' : 'Thesis: Parkinson\'s Law',
        btnText: isEs ? 'Ver Mis Plazos Reales' : 'View Real Deadlines',
        link: '/analytics',
      },
      distract: {
        title: isEs ? 'Impulso Dopaminérgico (Distracciones por hábito)' : 'Dopaminergic Impulse (Habitual Distraction)',
        emoji: 'fa-solid fa-mobile-screen-button',
        desc: isEs
          ? 'Abrir pestañas de ocio es una respuesta neuromuscular automática grabada en tus ganglios basales. Táctica: Aplica la "Regla de los 5 Segundos" de Mel Robbins. Cuenta en voz alta 3, 2, 1, activa el escudo de bloqueo de sitios de la aplicación para añadir fricción física al impulso automático y muévete físicamente a la tarea de inmediato.'
          : 'Opening leisure tabs is an automatic neuromuscular habit loop. Tactic: Apply Mel Robbins\' "5-Second Rule". Count down 3, 2, 1, activate website blocker shield, and physically move toward your task immediately.',
        tag: isEs ? 'Tesis: Mel Robbins' : 'Thesis: Mel Robbins',
        btnText: isEs ? 'Activar Escudo de Sitios' : 'Activate Site Shield',
        link: '/blocker',
      },
    };
  }

  challengeDays: ChallengeDay[] = [
    {
      num: '01',
      label: 'Voluntad',
      title: 'Día 1: Despertar de la Voluntad (El Primer Paso)',
      desc: 'Inicia el entrenamiento superando la barrera inicial de la inercia. Tu meta hoy es completar una sesión de enfoque de 15 minutos en tu tarea principal (tu sapo). Sin interrupciones, sin abrir otras pestañas.',
      metric1: '15 Minutos de Foco',
      metric2: 'Ritual 3-2-1 Activo',
      link: '/focus',
      btnText: 'Iniciar Día 1'
    },
    {
      num: '02',
      label: 'Fricción',
      title: 'Día 2: Escudo de Fricción (Cero Salidas Fáciles)',
      desc: 'Aísla tu entorno de los impulsos automáticos de distracción. Tu meta hoy es añadir tus 3 mayores distractores digitales cotidianos al bloqueador de la app y completar 25 minutos de enfoque con el escudo activo.',
      metric1: '25 Minutos de Foco',
      metric2: '3 Sitios Bloqueados',
      link: '/blocker',
      btnText: 'Activar Escudo'
    },
    {
      num: '03',
      label: 'Aislamiento',
      title: 'Día 3: Enmascaramiento Auditivo (Enfoque Sensorial)',
      desc: 'Protege tu corteza sensorial de estímulos externos aleatorios. Tu meta hoy es trabajar en una tarea monótona durante 25 minutos escuchando nuestro enmascarador acústico en tiempo real (lluvia o ruido café).',
      metric1: '25 Minutos de Foco',
      metric2: 'Audio-Frecuencia Activa',
      link: '/focus',
      btnText: 'Iniciar Día 3'
    },
    {
      num: '04',
      label: 'Plazos',
      title: 'Día 4: Urgencia Concreta (Contabilidad Temporal)',
      desc: 'Desactiva el sesgo del presente visualizando de forma cruda tu tiempo disponible. Tu meta hoy es configurar tus 3 plazos reales más importantes en el panel de cuentas regresivas y reflexionar sobre tus días restantes.',
      metric1: '3 Plazos Listos',
      metric2: 'Urgencia Concreta',
      link: '/analytics',
      btnText: 'Configurar Plazos'
    },
    {
      num: '05',
      label: 'Sapo',
      title: 'Día 5: Mitigar Peso Cognitivo (Comerte el Sapo)',
      desc: 'No pospongas el coste de fricción emocional. Tu meta hoy es agendar tu tarea más pesada y ejecutarla a primera hora de tu jornada usando el temporizador Pomodoro. Libera tu mente por el resto del día.',
      metric1: '1 Tarea "Sapo" Lista',
      metric2: 'Mañana Productiva',
      link: '/home',
      btnText: 'Agendar Tarea Sapo'
    },
    {
      num: '06',
      label: 'Ritual',
      title: 'Día 6: Rutina Neuromotora (Ritual de 3 Segundos)',
      desc: 'Fuerza a tu mente a pasar de la idea a la acción motora. Tu meta hoy es completar 2 sesiones de enfoque Pomodoro consecutivas, iniciando cada bloque aplicando estrictamente la rutina 3-2-1 del ritual de activación.',
      metric1: '50 Minutos de Foco',
      metric2: '2 Rituales Exitosos',
      link: '/focus',
      btnText: 'Iniciar Día 6'
    },
    {
      num: '07',
      label: 'Maestría',
      title: 'Día 7: Maestría del Guerrero (Disciplina Legendaria)',
      desc: 'Consolida tu control mental y demuestra tu inmunidad a la procrastinación. Tu meta final es completar un set de Pomodoro completo (4 sesiones de enfoque consecutivas) sin una sola pausa fallida ni distracción.',
      metric1: '100 Minutos de Foco',
      metric2: '1 Set de Maestría',
      link: '/focus',
      btnText: 'Reclamar Maestría'
    }
  ];

  selectedExcuseKey = signal<string | null>('perfect');
  selectedChallengeDayIndex = signal<number>(0);

  focusedNowCount = signal<number>(Math.floor(Math.random() * 80) + 110); // 110 to 189 (less than 200)
  sessionsCount = signal<number>(Math.floor(Math.random() * 30) + 60);   // 60 to 89 (less than 100)
  goalsCount = signal<number>(Math.floor(Math.random() * 150) + 320);    // 320 to 469 (less than 500)

  ngOnInit() {
    this.timerId = setInterval(() => {
      this.simulateFluctuations();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    if (typeof document !== 'undefined') {
      document.body.classList.remove('mobile-menu-open');
    }
  }

  simulateFluctuations() {
    // 1. Focused now: fluctuates (-3 to +3), capped at 199, min 100
    const currentFocused = this.focusedNowCount();
    const diffFocused = Math.floor(Math.random() * 7) - 3;
    let nextFocused = currentFocused + diffFocused;
    if (nextFocused >= 200) nextFocused = 199;
    if (nextFocused < 100) nextFocused = 100;
    this.focusedNowCount.set(nextFocused);

    // 2. Sessions: increments (+0 or +1), capped at 99
    const currentSessions = this.sessionsCount();
    const diffSessions = Math.random() > 0.45 ? 1 : 0;
    let nextSessions = currentSessions + diffSessions;
    if (nextSessions >= 100) nextSessions = 99;
    this.sessionsCount.set(nextSessions);

    // 3. Goals: increments (+0 or +1), capped at 499
    const currentGoals = this.goalsCount();
    const diffGoals = Math.random() > 0.5 ? 1 : 0;
    let nextGoals = currentGoals + diffGoals;
    if (nextGoals >= 500) nextGoals = 499;
    this.goalsCount.set(nextGoals);
  }

  selectedExcuse = computed(() => {
    const key = this.selectedExcuseKey();
    if (!key) return null;
    const excuses = this.getExcusesMap(this.translation.currentLang());
    return excuses[key] || null;
  });

  selectedChallengeDay = computed(() => {
    return this.challengeDays[this.selectedChallengeDayIndex()];
  });

  selectExcuse(key: string) {
    this.selectedExcuseKey.set(key);
    setTimeout(() => {
      const box = document.getElementById('resultBox');
      if (box) {
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  }

  selectChallengeDay(index: number) {
    this.selectedChallengeDayIndex.set(index);
  }

  getChallengeProgressPercent(): number {
    return Math.round((this.selectedChallengeDayIndex() + 1) / 7 * 100);
  }

  scrollToWidget(event: Event) {
    event.preventDefault();
    const element = document.getElementById('desafio');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
