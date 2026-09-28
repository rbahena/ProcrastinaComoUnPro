import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-fusion',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './fusion.html',
  styleUrl: './fusion.css'
})
export class Fusion {
  public membership = inject(MembershipService);
  private router = inject(Router);

  // Requisito de maestría para desbloquear la Fusión
  readonly REQUIRED_TOMATOES = 100;

  // Tomates acumulados actuales del usuario
  currentTomatoes = computed(() => this.membership.focusTomatoes());

  // Tomates faltantes para la maestría
  remainingTomatoes = computed(() => Math.max(0, this.REQUIRED_TOMATOES - this.currentTomatoes()));

  // Porcentaje de progreso hacia el desbloqueo
  progressPercent = computed(() => {
    return Math.min(100, Math.round((this.currentTomatoes() / this.REQUIRED_TOMATOES) * 100));
  });

  // Está desbloqueado para la élite
  isUnlocked = computed(() => this.currentTomatoes() >= this.REQUIRED_TOMATOES);

  goToFocus() {
    this.router.navigate(['/enfoque']);
  }

  goToStats() {
    this.router.navigate(['/fechas']);
  }
}
