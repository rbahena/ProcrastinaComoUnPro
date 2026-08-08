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
    if (email.trim() === 'demo@focusapp.com' && pass === 'demo12345') {
      this.loginError.set(false);
      this.router.navigate(['/enfoque']);
    } else {
      this.loginError.set(true);
    }
  }

  loginWithGoogle() {
    this.router.navigate(['/enfoque']);
  }

  prefill(emailInput: HTMLInputElement, passwordInput: HTMLInputElement) {
    emailInput.value = 'demo@focusapp.com';
    passwordInput.value = 'demo12345';
    this.loginError.set(false);
  }
}
