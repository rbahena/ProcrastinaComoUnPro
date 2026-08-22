import { Component, signal, computed, inject, WritableSignal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from '../../services/membership.service';
import { DojoBossService } from '../../services/dojo-boss.service';


@Component({
  selector: 'app-bestiario',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './bestiario.html',
  styleUrl: './bestiario.css'
})
export class Bestiario {
  membership = inject(MembershipService);
  bossService = inject(DojoBossService);

  currentTheme!: WritableSignal<'samurai' | 'cyberpunk' | 'aurora' | 'zen'>;
  userName!: WritableSignal<string>;
  selectedAvatar!: WritableSignal<any>;
  sidebarCollapsed!: any;

  // Selected villain for detail view
  selectedVillainId = signal<string>('samurai');
  sirenRevealed = signal<boolean>(false);

  selectVillain(id: string) {
    this.selectedVillainId.set(id);
    this.sirenRevealed.set(false);
  }

  toggleSirenReveal() {
    this.sirenRevealed.update(v => !v);
  }

  constructor() {
    this.currentTheme = this.membership.selectedTheme;
    this.userName = this.membership.userName;
    this.selectedAvatar = this.membership.selectedAvatar;
    this.sidebarCollapsed = this.membership.sidebarCollapsed;

    // Set selected villain to current active boss
    this.selectedVillainId.set(this.bossService.activeBoss().type);
  }

  // Helper for avatar icons
  getAvatarName() {
    return this.membership.getSelectedAvatarName();
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }


  // Dynamic labels helper
  labels = computed(() => {
    const t = this.currentTheme();
    if (t === 'cyberpunk') {
      return {
        logoText: 'COFU PRO',
        navTasks: 'Terminal',
        navZen: 'Zona de Enfoque',
        navTimer: 'Métricas de Red',
        navShield: 'Cortafuegos'
      };
    } else if (t === 'zen') {
      return {
        logoText: 'COFU ZEN',
        navTasks: 'Bonsái',
        navZen: 'Zona de Enfoque',
        navTimer: 'Jardín Temporal',
        navShield: 'Silencio'
      };
    } else if (t === 'aurora') {
      return {
        logoText: 'COFU AURORA',
        navTasks: 'Objetivos',
        navZen: 'Zona de Enfoque',
        navTimer: 'Cronograma',
        navShield: 'Protección'
      };
    } else {
      return {
        logoText: 'COFU SAMURÁI',
        navTasks: 'Misiones',
        navZen: 'Zona de Enfoque',
        navTimer: 'Estadísticas',
        navShield: 'Ideas fugaces'
      };
    }
  });
}
