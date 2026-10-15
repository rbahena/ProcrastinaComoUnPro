import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { focusDeactivateGuard } from './guards/focus.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
    canActivate: [guestGuard],
    pathMatch: 'full'
  },
  {
    path: 'landing',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/registro/registro').then(m => m.Registro),
    canActivate: [guestGuard]
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
    canActivate: [authGuard]
  },
  {
    path: 'focus',
    loadComponent: () => import('./pages/enfoque/enfoque').then(m => m.Enfoque),
    canActivate: [authGuard],
    canDeactivate: [focusDeactivateGuard]
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/estadisticas/estadisticas').then(m => m.Estadisticas),
    canActivate: [authGuard]
  },
  {
    path: 'blocker',
    loadComponent: () => import('./pages/bloqueador/bloqueador').then(m => m.Bloqueador),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/cualidades/cualidades').then(m => m.Cualidades),
    canActivate: [authGuard]
  },
  {
    path: 'membership',
    loadComponent: () => import('./pages/membresia/membresia').then(m => m.Membresia),
    canActivate: [authGuard]
  },
  {
    path: 'membresia',
    loadComponent: () => import('./pages/membresia/membresia').then(m => m.Membresia),
    canActivate: [authGuard]
  },
  {
    path: 'bestiary',
    loadComponent: () => import('./pages/bestiario/bestiario').then(m => m.Bestiario),
    canActivate: [authGuard]
  },
  {
    path: 'leaderboards',
    loadComponent: () => import('./pages/medallero/medallero').then(m => m.Medallero),
    canActivate: [authGuard]
  },
  {
    path: 'logbook',
    loadComponent: () => import('./pages/bitacora/bitacora').then(m => m.Bitacora),
    canActivate: [authGuard]
  },
  {
    path: 'goals',
    loadComponent: () => import('./pages/ideas/ideas').then(m => m.Ideas),
    canActivate: [authGuard]
  },
  // Backward compatibility & aliases
  { path: 'registro', redirectTo: 'register', pathMatch: 'full' },
  { path: 'signup', redirectTo: 'register', pathMatch: 'full' },
  { path: 'enfoque', redirectTo: 'focus', pathMatch: 'full' },
  { path: 'fechas', redirectTo: 'analytics', pathMatch: 'full' },
  { path: 'estadisticas', redirectTo: 'analytics', pathMatch: 'full' },
  { path: 'stats', redirectTo: 'analytics', pathMatch: 'full' },
  { path: 'bloqueador', redirectTo: 'blocker', pathMatch: 'full' },
  { path: 'cualidades', redirectTo: 'profile', pathMatch: 'full' },
  { path: 'qualities', redirectTo: 'profile', pathMatch: 'full' },
  { path: 'bestiario', redirectTo: 'bestiary', pathMatch: 'full' },
  { path: 'retos', redirectTo: 'bestiary', pathMatch: 'full' },
  { path: 'challenges', redirectTo: 'bestiary', pathMatch: 'full' },
  { path: 'medallero', redirectTo: 'leaderboards', pathMatch: 'full' },
  { path: 'records', redirectTo: 'leaderboards', pathMatch: 'full' },
  { path: 'medals', redirectTo: 'leaderboards', pathMatch: 'full' },
  { path: 'bitacora', redirectTo: 'logbook', pathMatch: 'full' },
  { path: 'log', redirectTo: 'logbook', pathMatch: 'full' },
  { path: 'ideas', redirectTo: 'goals', pathMatch: 'full' },
  {
    path: '**',
    redirectTo: ''
  }
];
