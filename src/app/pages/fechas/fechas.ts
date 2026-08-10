import { Component, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../services/membership.service';
import { IdentitySettings } from '../../components/identity-settings';

@Component({
  selector: 'app-fechas',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IdentitySettings],
  templateUrl: './fechas.html',
  styleUrl: './fechas.css',
})
export class Fechas {
  userName!: any;

  constructor(public membership: MembershipService) {
    this.userName = this.membership.userName;
  }

  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  labels = computed(() => {
    return {
      logoText: 'Kaizen Focus',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Dojo',
      navZen: 'Arena',
      navTimer: 'Espejo',
      navShield: 'Resultados',
      title: 'El Espejo',
      desc: 'Tu espacio para medir tu progreso y disciplina.'
    };
  });
}
