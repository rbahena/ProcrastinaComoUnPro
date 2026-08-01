import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(private router: Router) {}

  onSubmit(event: Event) {
    event.preventDefault();
    // Simular inicio de sesión exitoso redirigiendo al dashboard
    this.router.navigate(['/hoy']);
  }

  loginWithGoogle() {
    // Simular inicio de sesión con Google redirigiendo al dashboard
    this.router.navigate(['/hoy']);
  }
}
