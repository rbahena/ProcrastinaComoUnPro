import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginError = signal(false);

  constructor(private router: Router) {}

  onSubmit(event: Event, email: string, pass: string) {
    event.preventDefault();
    if (email.trim() === 'guerrero@procrastina.pro' && pass === 'vencerlaresistencia') {
      this.loginError.set(false);
      this.router.navigate(['/home']);
    } else {
      this.loginError.set(true);
    }
  }

  loginWithGoogle() {
    this.router.navigate(['/home']);
  }

  prefill(emailInput: HTMLInputElement, passwordInput: HTMLInputElement) {
    emailInput.value = 'guerrero@procrastina.pro';
    passwordInput.value = 'vencerlaresistencia';
    this.loginError.set(false);
  }
}
