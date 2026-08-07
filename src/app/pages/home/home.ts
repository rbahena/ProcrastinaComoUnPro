import { Component, signal, computed, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  currentTheme = signal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>('samurai');
  userName = signal('Ramiro');

  // Mi Avatar / Guardián activo
  selectedAvatar = signal<'lobo' | 'leon' | 'buho' | 'zorro' | 'dragon'>('zorro');

  // Métricas de la Comunidad
  private readonly targetFocusedUsers = 1284;
  private readonly targetCompletedObjectives = 12487; // Actualizado a 12,487

  liveFocusedUsersCount = signal(0); // Inicia en 0 para animación
  liveCompletedObjectivesToday = signal(0); // Inicia en 0 para animación
  rankingPosition = signal(42);
  percentageBeaten = signal(84);

  labels = computed(() => {
    return {
      logoText: 'Kaizen Focus',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Dojo',
      navZen: 'Arena',
      navTimer: 'Espejo',
      navShield: 'Resultados',
      title: 'El Dojo',
      desc: 'Tu espacio mental para declarar objetivos de alto impacto.'
    };
  });

  // Auxiliar para obtener el icono de mi avatar
  getAvatarIcon() {
    switch (this.selectedAvatar()) {
      case 'lobo': return 'fa-shield-halved';
      case 'leon': return 'fa-crown';
      case 'buho': return 'fa-glasses';
      case 'dragon': return 'fa-dragon';
      default: return 'fa-mask';
    }
  }

  // Auxiliar para obtener el nombre de mi avatar
  getAvatarName() {
    switch (this.selectedAvatar()) {
      case 'lobo': return 'Lobo Samurai';
      case 'leon': return 'León Shogun';
      case 'buho': return 'Búho Estratega';
      case 'dragon': return 'Dragón Guardián';
      default: return 'Zorro Ninja';
    }
  }

  ngOnInit() {
    // Animación de conteo desde cero para ambas métricas
    const duration = 1500;
    const frameRate = 1000 / 60;
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easeProgress = progress * (2 - progress);
      
      const currentFocused = Math.round(easeProgress * this.targetFocusedUsers);
      this.liveFocusedUsersCount.set(currentFocused);

      const currentCompleted = Math.round(easeProgress * this.targetCompletedObjectives);
      this.liveCompletedObjectivesToday.set(currentCompleted);

      if (frame >= totalFrames) {
        this.liveFocusedUsersCount.set(this.targetFocusedUsers);
        this.liveCompletedObjectivesToday.set(this.targetCompletedObjectives);
        clearInterval(timer);
      }
    }, frameRate);
  }
}
