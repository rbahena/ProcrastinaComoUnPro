import { Component, signal, computed, OnInit } from '@angular/core';
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
export class Fechas implements OnInit {
  userName!: any;
  showIdeasModal = signal(false);

  constructor(public membership: MembershipService) {
    this.userName = this.membership.userName;
  }

  ngOnInit() {
  }

  openIdeasModal() {
    this.showIdeasModal.set(true);
  }

  closeIdeasModal() {
    this.showIdeasModal.set(false);
  }

  removeIdea(index: number) {
    this.membership.removeIdea(index);
  }

  clearAllIdeas() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el baúl de ideas?')) {
      this.membership.clearAllIdeas();
    }
  }

  getAvatarIcon() {
    return this.membership.getSelectedAvatarIcon();
  }

  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  labels = computed(() => {
    return {
      logoText: 'COFU',
      logoIcon: 'fa-yin-yang',
      navTasks: 'Inicio',
      navZen: 'Zona de concentración',
      navTimer: 'Estadísticas',
      navShield: 'Baúl de ideas',
      title: 'El Espejo',
      desc: 'Tu espacio para medir tu progreso y disciplina.'
    };
  });
}
