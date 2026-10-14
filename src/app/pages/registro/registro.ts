import { Component, signal } from '@angular/core';
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
  isLoading = signal(false);
  showPassword = signal(false);

  constructor(
    private router: Router, 
    private membership: MembershipService,
    public legalService: LegalService,
    private analytics: AnalyticsService,
    public translation: TranslationService
  ) {}

  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  async onSubmit(event: Event, email: string, pass: string) {
    event.preventDefault();
    this.isLoading.set(true);
    this.registroError.set(null);

    const result = await this.membership.registerUser(email, pass);
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
