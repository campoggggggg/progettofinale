import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'transactions',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/transactions/transactions.component').then(m => m.TransactionsComponent)
  },
  {
    path: 'scenarios',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/scenarios/scenario-list.component').then(m => m.ScenarioListComponent)
  },
  {
    path: 'scenarios/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/scenarios/scenario-detail.component').then(m => m.ScenarioDetailComponent)
  },
  {
    path: 'market-data',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/market-data/market-data.component').then(m => m.MarketDataComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
