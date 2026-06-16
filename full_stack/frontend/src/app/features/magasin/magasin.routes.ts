import { Routes } from '@angular/router';
import { MagasinLayoutComponent } from './magasin-layout.component';

export const MAGASIN_ROUTES: Routes = [
  {
    path: '',
    component: MagasinLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/magasin-dashboard.component').then(m => m.MagasinDashboardComponent),
      },
      {
        path: 'sorties',
        loadComponent: () => import('./sorties/magasin-sorties.component').then(m => m.MagasinSortiesComponent),
      },
      {
        path: 'arrivages',
        loadComponent: () => import('./arrivages/magasin-arrivages.component').then(m => m.MagasinArrivagesComponent),
      },
      {
        path: 'jaugeages',
        loadComponent: () => import('./jaugeages/magasin-jaugeages.component').then(m => m.MagasinJaugeagesComponent),
      },
      {
        path: 'configuration',
        loadComponent: () => import('./config/magasin-config.component').then(m => m.MagasinConfigComponent),
      },
    ],
  },
];
