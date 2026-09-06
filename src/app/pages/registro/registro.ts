import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MembershipService } from '../../services/membership.service';

@Component({
  selector: 'app-registro',
  imports: [RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  registroError = signal<string | null>(null);
  isLoading = signal(false);
  showPassword = signal(false);

  constructor(private router: Router, private membership: MembershipService) {}

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
      localStorage.setItem('procrastina-just-registered', 'true');
      this.router.navigate(['/cualidades']);
    } else {
      this.registroError.set(result.error || 'Ocurrió un error en el registro.');
    }
  }

  async registerWithGoogle() {
    this.isLoading.set(true);
    const result = await this.membership.loginWithGoogle();
    this.isLoading.set(false);

    if (result.success) {
      localStorage.setItem('procrastina-just-registered', 'true');
      this.router.navigate(['/cualidades']);
    } else if (result.error) {
      this.registroError.set(result.error);
    }
  }
}
