import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { BellDropdownComponent } from './bell-dropdown.component';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, BellDropdownComponent, ClickOutsideDirective],
  template: `
    <header class="top-bar" [style.height]="'var(--topbar-height)'">
      <div class="top-bar__left">
        <a routerLink="/dashboard" class="top-bar__logo">
          <img src="assets/logo.png" alt="INTERSIG" class="top-bar__logo-img" />
          <span class="top-bar__logo-text">FleetTracker</span>
        </a>
      </div>

      <nav class="top-bar__nav">
        @for (link of navLinks; track link.path) {
          <a [routerLink]="link.path"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: link.path === '/dashboard' }"
             class="top-bar__nav-link">
            {{ link.label }}
          </a>
        }
      </nav>

      <div class="top-bar__right">
        <app-bell-dropdown [unreadCount]="unreadCount()" />

        <div class="top-bar__user" (click)="userMenuOpen.set(!userMenuOpen())" (clickOutside)="userMenuOpen.set(false)">
          <div class="top-bar__avatar">
            {{ (auth.user()?.prenom?.[0] ?? '') + (auth.user()?.nom?.[0] ?? '') }}
          </div>
          @if (userMenuOpen()) {
            <div class="top-bar__user-menu">
              <div class="top-bar__user-name">
                {{ auth.user()?.prenom }} {{ auth.user()?.nom }}
              </div>
              <a routerLink="/profil" class="top-bar__menu-item">Profil</a>
              <button (click)="logout()" class="top-bar__menu-item top-bar__menu-item--logout">
                Déconnexion
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .top-bar {
      display: flex;
      align-items: center;
      padding: 0 24px;
      background: var(--color-dark);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }
    .top-bar__left { flex: 0 0 auto; }
    .top-bar__logo {
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .top-bar__logo-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 0.04em;
    }
    .top-bar__logo-img {
      height: 36px;
      object-fit: contain;
    }
    .top-bar__nav {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 32px;
      flex: 1;
    }
    .top-bar__nav-link {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      transition: background 150ms, color 150ms;
    }
    .top-bar__nav-link:hover {
      background: rgba(247, 148, 29, 0.15);
      color: var(--color-primary);
    }
    .top-bar__nav-link.active {
      background: rgba(247, 148, 29, 0.15);
      color: var(--color-primary);
      font-weight: 600;
    }
    .top-bar__right {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-left: auto;
    }
    .top-bar__user { position: relative; cursor: pointer; }
    .top-bar__avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
    }
    .top-bar__user-menu {
      position: absolute;
      top: 44px;
      right: 0;
      min-width: 200px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      padding: 8px 0;
      z-index: 200;
    }
    .top-bar__user-name {
      padding: 8px 16px;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
    }
    .top-bar__menu-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      text-decoration: none;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
    }
    .top-bar__menu-item:hover {
      background: var(--color-surface-2);
    }
    .top-bar__menu-item--logout {
      color: var(--color-danger);
    }
  `],
})
export class TopBarComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  unreadCount = this.notificationService.unreadCount;
  userMenuOpen = signal(false);

  navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/vehicules', label: 'Véhicules' },
    { path: '/interventions', label: 'Interventions' },
    { path: '/composants', label: 'Composants' },
    { path: '/vidanges', label: 'Vidanges' },
    { path: '/historique', label: 'Historique' },
    { path: '/tableau-journees', label: 'Tableau' },
    { path: '/import-export', label: 'Import/Export' },
    { path: '/demandes-achat', label: 'Demandes' },
    { path: '/chatbot', label: 'Chatbot' },
  ];

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}