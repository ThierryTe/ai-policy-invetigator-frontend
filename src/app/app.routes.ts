import { Routes } from '@angular/router';
import { Shell } from './shared/shell';
import { authGuard, loginGuard } from './core/auth.guard';

const protectedRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    loadComponent: () => import('./features/investigations/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'policies',
    loadComponent: () => import('./features/policies/policies').then((m) => m.Policies),
  },
  {
    path: 'investigations/new',
    loadComponent: () =>
      import('./features/investigations/start').then((m) => m.StartInvestigation),
  },
  {
    path: 'investigations/:id',
    loadComponent: () => import('./features/investigations/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'investigations',
    loadComponent: () => import('./features/investigations/directory').then((m) => m.Directory),
  },
  {
    path: 'evidence',
    loadComponent: () => import('./features/evidence/evidence').then((m) => m.EvidencePage),
  },
  {
    path: 'evaluations',
    loadComponent: () => import('./features/settings/evaluations').then((m) => m.Evaluations),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
  },
  { path: '**', redirectTo: 'overview' },
];

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: protectedRoutes,
  },
];
