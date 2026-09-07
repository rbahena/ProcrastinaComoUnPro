import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MembershipService } from '../../services/membership.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html'
})
export class Navbar {
  public membership = inject(MembershipService);

  showLockedToast = signal<boolean>(false);
  lockedToastMessage = signal<string>('🔒 Navegación bloqueada durante el Pomodoro. Para salir a otra sección, debes abandonar la sesión desde el temporizador.');
  private toastTimeout: any;

  onNavClick(event: Event, targetUrl: string) {
    if (this.membership.isFocusActive()) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerLockedFeedback();
    }
  }

  onAvatarMenuToggle(event: Event) {
    if (this.membership.isFocusActive()) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerLockedFeedback();
      return;
    }
    this.membership.toggleAvatarMenu(event);
  }

  triggerLockedFeedback() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.showLockedToast.set(true);
    this.toastTimeout = setTimeout(() => {
      this.showLockedToast.set(false);
    }, 4500);
  }
}
