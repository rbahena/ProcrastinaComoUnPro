import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/**
 * Guarda de autenticación para rutas protegidas.
 * Bloquea el acceso a cualquier usuario que no tenga una sesión activa en Supabase.
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  if (!supabase.isConfigured()) {
    router.navigate(['/login']);
    return false;
  }

  // 1. Si ya tiene usuario en señal reactiva
  if (supabase.currentUser()) {
    return true;
  }

  // 2. Si tiene sesión persistida en Supabase
  const user = await supabase.getCurrentUser();
  if (user) {
    supabase.currentUser.set(user);
    return true;
  }

  // Redirigir al login si no tiene cuenta o sesión activa en Supabase
  router.navigate(['/login']);
  return false;
};

/**
 * Guarda para páginas públicas de login y registro.
 * Si el usuario ya está autenticado en Supabase, lo redirige automáticamente a /home.
 */
export const guestGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  if (!supabase.isConfigured()) {
    return true;
  }

  const user = await supabase.getCurrentUser();
  if (user) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
