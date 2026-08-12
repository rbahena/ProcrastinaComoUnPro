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

  constructor(private router: Router, private membership: MembershipService) {}

  onSubmit(event: Event, email: string, pass: string) {
    event.preventDefault();
    const result = this.membership.loginUser(email, pass);
    if (result.success) {
      this.loginError.set(false);
      this.errorMessage.set(null);
      this.router.navigate(['/home']);
    } else {
      this.loginError.set(true);
      this.errorMessage.set(result.error || 'Las credenciales de acceso ingresadas son incorrectas.');
    }
  }

  loginWithGoogle() {
    const googleEmail = 'google_guerrero@focusapp.com';
    const users = JSON.parse(localStorage.getItem('procrastina-registered-users') || '[]');
    const exists = users.some((u: any) => u.email.toLowerCase() === googleEmail.toLowerCase());
    
    if (!exists) {
      this.membership.registerUser(googleEmail, 'google12345');
    } else {
      this.membership.loginUser(googleEmail, 'google12345');
    }
    
    this.router.navigate(['/home']);
  }

  prefill(emailInput: HTMLInputElement, passwordInput: HTMLInputElement) {
    emailInput.value = 'demo@focusapp.com';
    passwordInput.value = 'demo12345';
    this.loginError.set(false);
    this.errorMessage.set(null);
  }
}
