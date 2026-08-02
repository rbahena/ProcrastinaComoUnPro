import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  private readonly EXCUSES: Record<string, ExcuseDetail> = {
    perfect: {
      title: 'Parálisis por Perfeccionismo (Miedo al fallo)',
      emoji: 'fa-solid fa-face-grimace',
      desc: 'Tu cerebro evita arrancar porque anticipa la presión de un resultado impecable. Como explica el investigador Dr. Timothy Pychyl, la procrastinación es un mecanismo inconsciente de evitación emocional para proteger tu autoestima. Táctica: Aplica el "Principio de la Tarea Borrador". Escribe o diseña algo deliberadamente mediocre durante 10 minutos. Al eliminar la barra de calidad inicial, rompes la resistencia.',
      tag: 'Tesis: Dr. Timothy Pychyl',
      btnText: 'Iniciar Sesión Corta (15 min)',
      link: '/enfoque',
    },
    bored: {
      title: 'Apatía Cognitiva (Tarea tediosa o monótona)',
      emoji: 'fa-solid fa-face-tired',
      desc: 'Cuando una tarea carece de recompensa inmediata, sufres un déficit temporal de dopamina. Táctica: Aplica la "Regla de los 2 Minutos" de James Clear (Autor de Hábitos Atómicos) acoplada a un estímulo sensorial. Camufla el tedio aislando tu espectro auditivo con frecuencias continuas (como Ruido Café o Lluvia Sintetizada) e inicia con un paso sumamente diminuto para generar inercia.',
      tag: 'Tesis: James Clear',
      btnText: 'Iniciar Pomodoro + Audio',
      link: '/enfoque',
    },
    time: {
      title: 'Sesgo del Presente (Optimismo temporal engañoso)',
      emoji: 'fa-solid fa-hourglass-half',
      desc: 'Tu cerebro valora el descanso actual infinitamente más que la entrega futura. Cree falsamente que "mañana tendrás más energía". Táctica: Rompe la Ley de Parkinson. Traduce tus plazos límite a días y horas reales. Haz visible la contabilidad de tu tiempo real para desactivar el optimismo y forzar a la corteza prefrontal a actuar hoy.',
      tag: 'Tesis: Ley de Parkinson',
      btnText: 'Ver Mis Plazos Reales',
      link: '/fechas',
    },
    distract: {
      title: 'Impulso Dopaminérgico (Distracciones por hábito)',
      emoji: 'fa-solid fa-mobile-screen-button',
      desc: 'Abrir pestañas de ocio es una respuesta neuromuscular automática grabada en tus ganglios basales. Táctica: Aplica la "Regla de los 5 Segundos" de Mel Robbins. Cuenta en voz alta 3, 2, 1, activa el escudo de bloqueo de sitios de la aplicación para añadir fricción física al impulso automático y muévete físicamente a la tarea de inmediato.',
      tag: 'Tesis: Mel Robbins',
      btnText: 'Activar Escudo de Sitios',
      link: '/bloqueador',
    },
  };

  challengeDays: ChallengeDay[] = [
    {
      num: '01',
      label: 'Voluntad',
      title: 'Día 1: Despertar de la Voluntad (El Primer Paso)',
      desc: 'Inicia el entrenamiento superando la barrera inicial de la inercia. Tu meta hoy es completar una sesión de enfoque de 15 minutos en tu tarea principal (tu sapo). Sin interrupciones, sin abrir otras pestañas.',
      metric1: '15 Minutos de Foco',
      metric2: 'Ritual 3-2-1 Activo',
      link: '/enfoque',
      btnText: 'Iniciar Día 1'
    },
    {
      num: '02',
      label: 'Fricción',
      title: 'Día 2: Escudo de Fricción (Cero Salidas Fáciles)',
      desc: 'Aísla tu entorno de los impulsos automáticos de distracción. Tu meta hoy es añadir tus 3 mayores distractores digitales cotidianos al bloqueador de la app y completar 25 minutos de enfoque con el escudo activo.',
      metric1: '25 Minutos de Foco',
      metric2: '3 Sitios Bloqueados',
      link: '/bloqueador',
      btnText: 'Activar Escudo'
    },
    {
      num: '03',
      label: 'Aislamiento',
      title: 'Día 3: Enmascaramiento Auditivo (Enfoque Sensorial)',
      desc: 'Protege tu corteza sensorial de estímulos externos aleatorios. Tu meta hoy es trabajar en una tarea monótona durante 25 minutos escuchando nuestro enmascarador acústico en tiempo real (lluvia o ruido café).',
      metric1: '25 Minutos de Foco',
      metric2: 'Audio-Frecuencia Activa',
      link: '/enfoque',
      btnText: 'Iniciar Día 3'
    },
    {
      num: '04',
      label: 'Plazos',
      title: 'Día 4: Urgencia Concreta (Contabilidad Temporal)',
      desc: 'Desactiva el sesgo del presente visualizando de forma cruda tu tiempo disponible. Tu meta hoy es configurar tus 3 plazos reales más importantes en el panel de cuentas regresivas y reflexionar sobre tus días restantes.',
      metric1: '3 Plazos Listos',
      metric2: 'Urgencia Concreta',
      link: '/fechas',
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
      link: '/enfoque',
      btnText: 'Iniciar Día 6'
    },
    {
      num: '07',
      label: 'Maestría',
      title: 'Día 7: Maestría del Guerrero (Disciplina Legendaria)',
      desc: 'Consolida tu control mental y demuestra tu inmunidad a la procrastinación. Tu meta final es completar un set de Pomodoro completo (4 sesiones de enfoque consecutivas) sin una sola pausa fallida ni distracción.',
      metric1: '100 Minutos de Foco',
      metric2: '1 Set de Maestría',
      link: '/enfoque',
      btnText: 'Reclamar Maestría'
    }
  ];

  selectedExcuseKey = signal<string | null>(null);
  selectedChallengeDayIndex = signal<number>(0);

  selectedExcuse = computed(() => {
    const key = this.selectedExcuseKey();
    return key ? this.EXCUSES[key] : null;
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

  scrollToWidget(event: Event) {
    event.preventDefault();
    const element = document.getElementById('widget');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
