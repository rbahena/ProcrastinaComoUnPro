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
      desc: 'Tu cerebro evita arrancar porque anticipa la presión de un resultado impecable. La amígdala percibe la tarea como una amenaza a tu autoestima. Táctica: Aplica el "Principio de la Tarea Borrador". Comprométete a escribir o diseñar algo deliberadamente mediocre durante solo 10 minutos. Al eliminar la barra de calidad inicial, rompes la resistencia y activas tu estado de flujo.',
      tag: 'Neuro-estrategia: Tarea Borrador',
      btnText: 'Iniciar Sesión Corta (15 min)',
      link: '/enfoque',
    },
    bored: {
      title: 'Apatía Cognitiva (Tarea tediosa o monótona)',
      emoji: 'fa-solid fa-face-tired',
      desc: 'Cuando una tarea carece de novedad o recompensa inmediata, tu cerebro sufre un déficit temporal de dopamina, provocando cansancio simulado. Táctica: Aplica "Acoplamiento de Estímulos". Camufla el tedio aislando tu espectro auditivo con frecuencias continuas (como Ruido Café o Lluvia Sintetizada) que estimulan tu enfoque sin saturar tu atención.',
      tag: 'Neuro-estrategia: Enfoque Sensorial',
      btnText: 'Iniciar Pomodoro + Audio',
      link: '/enfoque',
    },
    time: {
      title: 'Sesgo del Presente (Optimismo temporal engañoso)',
      emoji: 'fa-solid fa-hourglass-half',
      desc: 'Tu cerebro valora las recompensas actuales (descanso, ocio) infinitamente más que las futuras (entregar a tiempo). Esto te hace creer falsamente que mañana tendrás más energía o tiempo. Táctica: "Urgencia Concreta". Haz visible el coste del tiempo. Revisa tus plazos reales traducidos a días exactos para romper la ilusión de abundancia temporal.',
      tag: 'Neuro-estrategia: Contabilidad Temporal',
      btnText: 'Ver Mis Plazos Reales',
      link: '/fechas',
    },
    distract: {
      title: 'Impulso Dopaminérgico (Distracciones por hábito)',
      emoji: 'fa-solid fa-mobile-screen-button',
      desc: 'Abrir pestañas de ocio es una respuesta neuromuscular automática grabada en tus ganglios basales. No se vence con fuerza de voluntad, sino con arquitectura de entorno. Táctica: "Fricción Activa". Activa el escudo del bloqueador para interceptar el impulso automatizado. Al añadir una barrera de 3 segundos, tu cerebro recobra el control racional.',
      tag: 'Neuro-estrategia: Fricción Ambiental',
      btnText: 'Activar Escudo de Sitios',
      link: '/bloqueador',
    },
  };

  selectedExcuseKey = signal<string | null>(null);

  selectedExcuse = computed(() => {
    const key = this.selectedExcuseKey();
    return key ? this.EXCUSES[key] : null;
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
}
