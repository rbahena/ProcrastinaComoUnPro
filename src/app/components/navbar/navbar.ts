import { Component, inject, signal, HostListener, ElementRef, OnDestroy } from '@angular/core';
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
export class Navbar implements OnDestroy {
  public membership = inject(MembershipService);
  public notificationService = inject(NotificationService);
  public translationService = inject(TranslationService);
  private elementRef = inject(ElementRef);

  showLockedToast = signal<boolean>(false);
  lockedToastMessage = signal<string>('🔒 Navegación bloqueada durante el Pomodoro. Para salir a otra sección, debes abandonar la sesión desde el temporizador.');
  mobileMenuOpen = signal<boolean>(false);
  private toastTimeout: any;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.membership.closeAvatarMenu();
      this.notificationService.closePanel();
      this.closeMobileMenu();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.closeMobileMenu();
    this.membership.closeAvatarMenu();
    this.notificationService.closePanel();
  }

  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined' && window.innerWidth > 768 && this.mobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }

  toggleMobileMenu(event: Event) {
    event.stopPropagation();
    this.membership.closeAvatarMenu();
    this.notificationService.closePanel();
    const next = !this.mobileMenuOpen();
    this.mobileMenuOpen.set(next);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('mobile-menu-open', next);
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('mobile-menu-open');
    }
  }

  ngOnDestroy() {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('mobile-menu-open');
    }
  }

  onNavClick(event: Event, targetUrl: string) {
    if (this.membership.isFocusActive()) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerLockedFeedback();
      return;
    }
    this.closeMobileMenu();
  }

  onAvatarMenuToggle(event: Event) {
    if (this.membership.isFocusActive()) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerLockedFeedback();
      return;
    }
    this.closeMobileMenu();
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
    this.closeMobileMenu();
    this.membership.closeAvatarMenu();
    this.notificationService.togglePanel(event);
  }

  onNotificationClick(notif: AppNotification) {
    if (this.membership.isFocusActive() && notif.route !== '/focus' && notif.route !== '/enfoque') {
      this.triggerLockedFeedback();
      return;
    }
    this.closeMobileMenu();
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
