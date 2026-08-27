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

  constructor(private router: Router, private membership: MembershipService) {}

  onSubmit(event: Event, email: string, pass: string) {
    event.preventDefault();
    
    const result = this.membership.registerUser(email, pass);
    if (result.success) {
      this.registroError.set(null);
      localStorage.setItem('procrastina-just-registered', 'true');
      // Redirigir a la pantalla de cualidades e identidad
      this.router.navigate(['/cualidades']);
    } else {
      this.registroError.set(result.error || 'Ocurrió un error en el registro.');
    }
  }

  registerWithGoogle() {
    const googleEmail = 'google_guerrero@focusapp.com';
    const users = JSON.parse(localStorage.getItem('procrastina-registered-users') || '[]');
    const exists = users.some((u: any) => u.email.toLowerCase() === googleEmail.toLowerCase());
    
    if (!exists) {
      this.membership.registerUser(googleEmail, 'google12345');
    } else {
      this.membership.loginUser(googleEmail, 'google12345');
    }
    
    if (this.membership.userName() === 'google_guerrero') {
      this.membership.userName.set('guerrero_comunidad');
    }

    localStorage.setItem('procrastina-just-registered', 'true');
    this.router.navigate(['/cualidades']);
  }
}
