import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-registro',
  imports: [RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  constructor(private router: Router) {}

  onSubmit(event: Event) {
    event.preventDefault();
    // Simular registro exitoso redirigiendo al dashboard
    this.router.navigate(['/enfoque']);
  }

  registerWithGoogle() {
    // Simular registro con Google redirigiendo al dashboard
    this.router.navigate(['/enfoque']);
  }
}
