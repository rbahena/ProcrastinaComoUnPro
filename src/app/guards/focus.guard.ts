import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MembershipService } from '../services/membership.service';
import { Enfoque } from '../pages/enfoque/enfoque';

/**
 * Guarda de navegación de salida para la vista de Enfoque.
 * Bloquea la navegación fuera de /enfoque si hay una sesión de Pomodoro activa (no en descanso).
 * Si el usuario intenta salir, activa el modal de confirmación de abandono.
 */
export const focusDeactivateGuard: CanDeactivateFn<Enfoque> = (component) => {
  const membership = inject(MembershipService);

  if (membership.isFocusActive()) {
    // Si el temporizador de concentración está en curso, solicitar confirmación de abandono
    if (component && typeof component.abandonSession === 'function') {
      component.abandonSession();
    }
    return false;
  }

  return true;
};
