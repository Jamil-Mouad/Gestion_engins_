import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'vehicules',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vehicules/list/vehicules-list.component').then(m => m.VehiculesListComponent),
  },
  {
    path: 'vehicules/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vehicules/detail/vehicule-detail.component').then(m => m.VehiculeDetailComponent),
  },
  {
    path: 'interventions',
    canActivate: [authGuard],
    loadComponent: () => import('./features/interventions/interventions.component').then(m => m.InterventionsComponent),
  },
  {
    path: 'pneus',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pneus/list/pneus-list.component').then(m => m.PneusListComponent),
  },
  {
    path: 'pneus/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pneus/detail/pneu-detail.component').then(m => m.PneuDetailComponent),
  },
  {
    path: 'composants',
    canActivate: [authGuard],
    loadComponent: () => import('./features/composants/composants.component').then(m => m.ComposantsComponent),
  },
  {
    path: 'vidanges',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vidanges/vidanges.component').then(m => m.VidangesComponent),
  },
  {
    path: 'historique',
    canActivate: [authGuard],
    loadComponent: () => import('./features/historique/historique.component').then(m => m.HistoriqueComponent),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
  },
  {
    path: 'tableau-journees',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tableau-journees/tableau-journees.component').then(m => m.TableauJourneesComponent),
  },
  {
    path: 'profil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profil/profil.component').then(m => m.ProfilComponent),
  },
  {
    path: 'import-export',
    canActivate: [authGuard],
    loadComponent: () => import('./features/import-export/import-export.component').then(m => m.ImportExportComponent),
  },
  {
    path: 'demandes-achat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/demandes-achat/demandes-achat.component').then(m => m.DemandesAchatComponent),
  },
  {
    path: 'chatbot',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chatbot/chatbot.component').then(m => m.ChatbotComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];