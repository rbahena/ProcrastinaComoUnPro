import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MembershipService } from '../../services/membership.service';

@Component({
  selector: 'app-registro',
  imports: [RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  constructor(private router: Router, private membership: MembershipService) {}

  onSubmit(event: Event) {
    event.preventDefault();
    
    // Obtener el valor del correo ingresado en el formulario
    const form = event.target as HTMLFormElement;
    const emailInput = form.querySelector('#email') as HTMLInputElement;
    const email = emailInput?.value || '';
    
    // El nombre predeterminado es la parte anterior al arroba (@)
    let defaultUsername = 'Usuario';
    if (email && email.includes('@')) {
      defaultUsername = email.split('@')[0];
    }

    // Resetear el estado para arrancar los datos completamente desde cero
    this.membership.resetNewUserAccount();
    
    // Guardar el nombre de usuario predeterminado derivado del correo
    this.membership.userName.set(defaultUsername);

    localStorage.setItem('procrastina-just-registered', 'true');
    // Simular registro exitoso redirigiendo a la pantalla de cualidades e identidad
    this.router.navigate(['/cualidades']);
  }

  registerWithGoogle() {
    // Resetear el estado para arrancar los datos completamente desde cero
    this.membership.resetNewUserAccount();
    
    // Simular un nombre predeterminado para el flujo de Google
    this.membership.userName.set('guerrero_dojo');

    localStorage.setItem('procrastina-just-registered', 'true');
    // Simular registro con Google redirigiendo a la pantalla de cualidades e identidad
    this.router.navigate(['/cualidades']);
  }
}
