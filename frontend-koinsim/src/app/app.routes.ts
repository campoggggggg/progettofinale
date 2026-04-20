import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'scenari', pathMatch: 'full' },
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: 'scenari',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scenario-list/scenario-list.component').then(
        m => m.ScenarioListComponent
      ),
  },
  {
    path: 'scenari/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scenario-dashboard/scenario-dashboard.component').then(
        m => m.ScenarioDashboardComponent
      ),
  },
  { path: '**', redirectTo: 'scenari' },
];
