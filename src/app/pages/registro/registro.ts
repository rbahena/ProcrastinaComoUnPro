import { Component, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MembershipService } from '../../services/membership.service';
import { LegalService } from '../../services/legal.service';
import { AnalyticsService } from '../../services/analytics.service';
import { TranslatePipe, TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-registro',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  registroError = signal<string | null>(null);
  emailError = signal<string | null>(null);
  isLoading = signal(false);
  showPassword = signal(false);
  password = signal<string>('');

  // Medidor puramente informativo de fuerza de contraseña (no bloquea el registro)
  strengthScore = computed(() => {
    const p = this.password();
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    const hasLower = /[a-z]/.test(p);
    const hasUpper = /[A-Z]/.test(p);
    const hasNumber = /\d/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);

    if (hasLower && hasUpper) score++;
    if (hasNumber || hasSpecial) score++;

    return Math.min(4, Math.max(1, score));
  });

  strengthColor = computed(() => {
    switch (this.strengthScore()) {
      case 1: return '#ef4444'; // Rojo (Débil)
      case 2: return '#f59e0b'; // Ámbar/Naranja (Aceptable)
      case 3: return '#06b6d4'; // Cyan (Buena)
      case 4: return '#10b981'; // Verde Esmeralda (Muy fuerte)
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  });

  strengthLabelKey = computed(() => {
    switch (this.strengthScore()) {
      case 1: return 'auth.strengthWeak';
      case 2: return 'auth.strengthMedium';
      case 3: return 'auth.strengthGood';
      case 4: return 'auth.strengthStrong';
      default: return 'auth.strengthWeak';
    }
  });

  constructor(
    private router: Router, 
    private membership: MembershipService,
    public legalService: LegalService,
    private analytics: AnalyticsService,
    public translation: TranslationService
  ) {}

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const trimmed = email.trim();
    if (trimmed.length > 254) return false;
    if (trimmed.includes('..') || /\s/.test(trimmed)) return false;
    // Estructura formal: usuario @ dominio/subdominio . tld (debe contener un punto en el dominio, ej. .com, .co, .es, .org)
    const parts = trimmed.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1] || !parts[1].includes('.')) {
      return false;
    }
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
  }

  onEmailInput(val: string) {
    // Si ya había un error visible, se reevalúa para removerlo en cuanto cumpla la regla de estructura
    if (this.emailError()) {
      if (!val || this.isValidEmail(val)) {
        this.emailError.set(null);
      }
    }
  }

  onEmailBlur(val: string) {
    const trimmed = (val || '').trim();
    // Solo notifica al usuario cuando este no cumpla la regla
    if (trimmed.length > 0 && !this.isValidEmail(trimmed)) {
      this.emailError.set(this.translation.t('auth.invalidEmailError'));
    } else {
      this.emailError.set(null);
    }
  }

  onPasswordInput(val: string) {
    this.password.set(val);
  }

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  async onSubmit(event: Event, email: string, pass: string) {
    event.preventDefault();
    this.registroError.set(null);

    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      this.emailError.set(this.translation.t('auth.emailRequiredError'));
      return;
    }

    if (!this.isValidEmail(trimmedEmail)) {
      const msg = this.translation.t('auth.invalidEmailError');
      this.emailError.set(msg);
      this.registroError.set(msg);
      return;
    }

    if (!pass || pass.length < 8) {
      const msg = this.translation.currentLang() === 'en'
        ? 'Password must be at least 8 characters long.'
        : 'La contraseña debe tener al menos 8 caracteres.';
      this.registroError.set(msg);
      return;
    }

    this.emailError.set(null);
    this.registroError.set(null);
    this.isLoading.set(true);

    const result = await this.membership.registerUser(trimmedEmail, pass);
    this.isLoading.set(false);

    if (result.success) {
      this.registroError.set(null);
      this.analytics.trackSignup('email');
      localStorage.setItem('procrastina-just-registered', 'true');
      this.router.navigate(['/profile']);
    } else {
      this.registroError.set(result.error || this.translation.t('auth.registrationError'));
    }
  }
}
