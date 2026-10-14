import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SupabaseService } from '../../services/supabase.service';
import { Subscription } from 'rxjs';
import { TranslatePipe, TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  loginError = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  showPassword = signal(false);

  // Estados de solicitud de recuperación de contraseña
  showResetModal = signal(false);
  resetEmail = signal('');
  isResetLoading = signal(false);
  resetSuccessMessage = signal<string | null>(null);
  resetErrorMessage = signal<string | null>(null);

  // Estados para establecer nueva contraseña (cuando llega desde el correo)
  showNewPasswordModal = signal(false);
  showNewPassword = signal(false);
  isUpdatingPassword = signal(false);
  updatePasswordError = signal<string | null>(null);
  updatePasswordSuccess = signal<string | null>(null);

  private authSubscription: any = null;

  constructor(
    private router: Router, 
    private membership: MembershipService,
    private analytics: AnalyticsService,
    private supabaseService: SupabaseService,
    public translation: TranslationService
  ) {}

  ngOnInit() {
    // 1. Detección directa por URL fragment (#access_token=...&type=recovery)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        this.showNewPasswordModal.set(true);
      }
    }

    // 2. Detección por evento de autenticación de Supabase
    if (this.supabaseService.isConfigured()) {
      const { data } = this.supabaseService.client.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          this.showNewPasswordModal.set(true);
        }
      });
      this.authSubscription = data.subscription;
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword.update(show => !show);
  }

  openResetModal() {
    this.showResetModal.set(true);
    this.resetSuccessMessage.set(null);
    this.resetErrorMessage.set(null);
  }

  closeResetModal() {
    this.showResetModal.set(false);
  }

  closeNewPasswordModal() {
    this.showNewPasswordModal.set(false);
    // Limpiar el hash de la URL si se cancela
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  async sendPasswordReset(email: string) {
    if (!email || !email.trim()) {
      this.resetErrorMessage.set(this.translation.t('auth.resetEmailRequired'));
      return;
    }

    this.isResetLoading.set(true);
    this.resetErrorMessage.set(null);
    this.resetSuccessMessage.set(null);

    const result = await this.membership.resetPassword(email);
    this.isResetLoading.set(false);

    if (result.success) {
      this.resetSuccessMessage.set(this.translation.t('auth.resetSuccess'));
    } else {
      this.resetErrorMessage.set(result.error || this.translation.t('auth.resetError'));
    }
  }

  async onUpdatePassword(event: Event, newPass: string, confirmPass: string) {
    event.preventDefault();

    if (!newPass || newPass.length < 6) {
      this.updatePasswordError.set(this.translation.t('auth.passwordLengthError'));
      return;
    }

    if (newPass !== confirmPass) {
      this.updatePasswordError.set(this.translation.t('auth.passwordMismatchError'));
      return;
    }

    this.isUpdatingPassword.set(true);
    this.updatePasswordError.set(null);
    this.updatePasswordSuccess.set(null);

    const result = await this.membership.updatePassword(newPass);
    this.isUpdatingPassword.set(false);

    if (result.success) {
      this.updatePasswordSuccess.set(this.translation.t('auth.passwordUpdateSuccess'));
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setTimeout(() => {
        this.showNewPasswordModal.set(false);
        this.router.navigate(['/home']);
      }, 1500);
    } else {
      this.updatePasswordError.set(result.error || this.translation.t('auth.passwordUpdateError'));
    }
  }

  async onSubmit(event: Event, email: string, pass: string) {
    event.preventDefault();
    this.isLoading.set(true);
    this.loginError.set(false);
    this.errorMessage.set(null);

    const result = await this.membership.loginUser(email, pass);
    this.isLoading.set(false);

    if (result.success) {
      this.loginError.set(false);
      this.errorMessage.set(null);
      this.analytics.trackLogin('email');
      this.router.navigate(['/home']);
    } else {
      this.loginError.set(true);
      this.errorMessage.set(result.error || this.translation.t('auth.invalidCredentials'));
    }
  }
}
