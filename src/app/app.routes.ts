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
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.Home)
  },
  {
    path: 'enfoque',
    loadComponent: () => import('./pages/enfoque/enfoque').then(m => m.Enfoque)
  },
  {
    path: 'fechas',
    loadComponent: () => import('./pages/estadisticas/estadisticas').then(m => m.Estadisticas)
  },
  {
    path: 'bloqueador',
    loadComponent: () => import('./pages/bloqueador/bloqueador').then(m => m.Bloqueador)
  },
  {
    path: 'cualidades',
    loadComponent: () => import('./pages/cualidades/cualidades').then(m => m.Cualidades)
  },
  {
    path: 'membresia',
    loadComponent: () => import('./pages/membresia/membresia').then(m => m.Membresia)
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./pages/estadisticas/estadisticas').then(m => m.Estadisticas)
  },
  {
    path: 'bestiario',
    loadComponent: () => import('./pages/bestiario/bestiario').then(m => m.Bestiario)
  },
  {
    path: 'medallero',
    loadComponent: () => import('./pages/medallero/medallero').then(m => m.Medallero)
  },
  {
    path: 'bitacora',
    loadComponent: () => import('./pages/bitacora/bitacora').then(m => m.Bitacora)
  },
  {
    path: 'ideas',
    loadComponent: () => import('./pages/ideas/ideas').then(m => m.Ideas)
  }
];

