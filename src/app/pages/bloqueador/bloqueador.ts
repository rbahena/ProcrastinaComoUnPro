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
  capturedIdeas = signal<string[]>([]);

  constructor(public membership: MembershipService) {
    this.userName = this.membership.userName;
  }

  ngOnInit() {
    this.loadIdeas();
  }

  openIdeasModal() {
    this.showIdeasModal.set(true);
    this.loadIdeas();
  }

  closeIdeasModal() {
    this.showIdeasModal.set(false);
  }

  loadIdeas() {
    const list = JSON.parse(localStorage.getItem('captured-ideas') || '[]');
    this.capturedIdeas.set(list);
  }

  removeIdea(index: number) {
    const updatedList = this.capturedIdeas().filter((_, i) => i !== index);
    this.capturedIdeas.set(updatedList);
    localStorage.setItem('captured-ideas', JSON.stringify(updatedList));
  }

  clearAllIdeas() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el baúl de ideas?')) {
      this.capturedIdeas.set([]);
      localStorage.setItem('captured-ideas', '[]');
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
      logoText: 'Kaizen Focus',
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
