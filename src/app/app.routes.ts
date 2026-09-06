import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

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
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    canActivate: [guestGuard]
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.Registro),
    canActivate: [guestGuard]
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
    canActivate: [authGuard]
  },
  {
    path: 'enfoque',
    loadComponent: () => import('./pages/enfoque/enfoque').then(m => m.Enfoque),
    canActivate: [authGuard]
  },
  {
    path: 'fechas',
    loadComponent: () => import('./pages/estadisticas/estadisticas').then(m => m.Estadisticas),
    canActivate: [authGuard]
  },
  {
    path: 'bloqueador',
    loadComponent: () => import('./pages/bloqueador/bloqueador').then(m => m.Bloqueador),
    canActivate: [authGuard]
  },
  {
    path: 'cualidades',
    loadComponent: () => import('./pages/cualidades/cualidades').then(m => m.Cualidades),
    canActivate: [authGuard]
  },
  {
    path: 'membresia',
    loadComponent: () => import('./pages/membresia/membresia').then(m => m.Membresia),
    canActivate: [authGuard]
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./pages/estadisticas/estadisticas').then(m => m.Estadisticas),
    canActivate: [authGuard]
  },
  {
    path: 'bestiario',
    loadComponent: () => import('./pages/bestiario/bestiario').then(m => m.Bestiario),
    canActivate: [authGuard]
  },
  {
    path: 'medallero',
    loadComponent: () => import('./pages/medallero/medallero').then(m => m.Medallero),
    canActivate: [authGuard]
  },
  {
    path: 'bitacora',
    loadComponent: () => import('./pages/bitacora/bitacora').then(m => m.Bitacora),
    canActivate: [authGuard]
  },
  {
    path: 'ideas',
    loadComponent: () => import('./pages/ideas/ideas').then(m => m.Ideas),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'landing'
  }
];
