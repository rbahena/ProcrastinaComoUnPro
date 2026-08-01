import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.Registro)
  },
  {
    path: 'hoy',
    loadComponent: () => import('./pages/hoy/hoy').then(m => m.Hoy)
  },
  {
    path: 'enfoque',
    loadComponent: () => import('./pages/enfoque/enfoque').then(m => m.Enfoque)
  },
  {
    path: 'fechas',
    loadComponent: () => import('./pages/fechas/fechas').then(m => m.Fechas)
  },
  {
    path: 'bloqueador',
    loadComponent: () => import('./pages/bloqueador/bloqueador').then(m => m.Bloqueador)
  }
];

