import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { IdentitySettings } from '../../components/identity-settings';

@Component({
  selector: 'app-bloqueador',
  standalone: true,
  imports: [CommonModule, RouterModule, IdentitySettings],
  templateUrl: './bloqueador.html',
  styleUrl: './bloqueador.css',
})
export class Bloqueador implements OnInit {
  userName!: any;
  showIdeasModal = signal(false);
  sidebarCollapsed!: any;
  toggleSidebar() {
    this.membership.toggleSidebar();
  }

  constructor(public membership: MembershipService) {
    this.userName = this.membership.userName;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;
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
      title: 'Resultados',
      desc: 'Tu cortafuegos contra las distracciones del navegador.'
    };
  });
}
