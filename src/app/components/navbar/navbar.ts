import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { TranslationService, TranslatePipe } from '../../services/translation.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './navbar.html'
})
export class Navbar {
  public membership = inject(MembershipService);
  public notificationService = inject(NotificationService);
  public translationService = inject(TranslationService);
  private elementRef = inject(ElementRef);

  showLockedToast = signal<boolean>(false);
  lockedToastMessage = signal<string>('🔒 Navegación bloqueada durante el Pomodoro. Para salir a otra sección, debes abandonar la sesión desde el temporizador.');
  private toastTimeout: any;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.membership.closeAvatarMenu();
      this.notificationService.closePanel();
    }
  }

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
    this.notificationService.closePanel();
    this.membership.toggleAvatarMenu(event);
  }

  onBellToggle(event: Event) {
    if (this.membership.isFocusActive()) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerLockedFeedback();
      return;
    }
    this.membership.closeAvatarMenu();
    this.notificationService.togglePanel(event);
  }

  onNotificationClick(notif: AppNotification) {
    if (this.membership.isFocusActive() && notif.route !== '/focus' && notif.route !== '/enfoque') {
      this.triggerLockedFeedback();
      return;
    }
    this.notificationService.onNotificationClick(notif);
  }

  triggerLockedFeedback() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.showLockedToast.set(true);
    this.toastTimeout = setTimeout(() => {
      this.showLockedToast.set(false);
    }, 4500);
  }
}
