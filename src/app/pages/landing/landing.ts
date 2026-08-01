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
      title: 'Perfeccionismo y Miedo al Fracaso',
      emoji: '😰',
      desc: 'Tu cerebro evita iniciar porque teme que el resultado no sea perfecto. La solución científica es el micro-compromiso: dile a tu mente que solo vas a trabajar 15 minutos y que puedes dejarlo si quieres. Esto reduce la ansiedad de inicio.',
      tag: 'Táctica: Micro-compromiso',
      btnText: 'Iniciar Pomodoro Corto',
      link: '/enfoque',
    },
    bored: {
      title: 'Tedio y Sobrecarga Cognitiva',
      emoji: '🥱',
      desc: 'Las tareas largas y aburridas saturan tu memoria de trabajo. Necesitas acotar el estímulo. Te recomendamos iniciar una sesión clásica usando un sonido ambiente sintetizado (como lluvia o ruido café) para disminuir el ruido mental y lograr fluidez.',
      tag: 'Táctica: Enfoque Sensorial',
      btnText: 'Iniciar Pomodoro + Sonido Ambiente',
      link: '/enfoque',
    },
    time: {
      title: 'Sesgo del Presente (Pensar que hay tiempo)',
      emoji: '⏳',
      desc: 'Creer que "mañana habrá más tiempo" es una distorsión cognitiva clásica. Necesitas recordatorios explícitos de la realidad temporal. Visualiza cuántos días reales te quedan para tus fechas límite y acorta la ventana de acción hoy.',
      tag: 'Táctica: Presión de Urgencia Real',
      btnText: 'Ver mis Fechas Límite',
      link: '/fechas',
    },
    distract: {
      title: 'Respuestas Impulsivas Habituales',
      emoji: '📱',
      desc: 'Abrir redes sociales o pestañas de ocio es una acción automática del cerebro buscando dopamina rápida. Añade fricción a tu entorno: activa el escudo del bloqueador para detener el impulso inconsciente.',
      tag: 'Táctica: Arquitectura de Fricción',
      btnText: 'Activar el Bloqueador de Sitios',
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
