import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MembershipService } from '../../services/membership.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginError = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  constructor(private router: Router, private membership: MembershipService) {}

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
      this.router.navigate(['/home']);
    } else {
      this.loginError.set(true);
      this.errorMessage.set(result.error || 'Las credenciales de acceso ingresadas son incorrectas.');
    }
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    const result = await this.membership.loginWithGoogle();
    this.isLoading.set(false);

    if (result.success) {
      this.router.navigate(['/home']);
    } else if (result.error) {
      this.loginError.set(true);
      this.errorMessage.set(result.error);
    }
  }

  prefill(emailInput: HTMLInputElement, passwordInput: HTMLInputElement) {
    emailInput.value = 'demo@focusapp.com';
    passwordInput.value = 'demo12345';
    this.loginError.set(false);
    this.errorMessage.set(null);
  }
}
