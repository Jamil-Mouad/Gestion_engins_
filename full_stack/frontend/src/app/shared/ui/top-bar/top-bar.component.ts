import { Component, signal, computed, inject, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { BellDropdownComponent } from './bell-dropdown.component';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, BellDropdownComponent, ClickOutsideDirective],
  template: `
    <header class="top-bar">

      <!-- Logo lockup -->
      <a routerLink="/vehicules" class="logo-wrap">
        <img src="assets/logo.png" alt="INTERSIG" class="logo-img" />
        <div class="logo-arrow-square">
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
            <path d="M0 8L7 0V4H20V12H7V16L0 8Z" fill="white"/>
          </svg>
        </div>
        <div class="logo-text-stack">
          <div class="logo-brand">INTERSIG</div>
          <div class="logo-product">FleetTracker</div>
        </div>
      </a>

      <!-- Nav + liquid-glass pill -->
      <div #navContainer class="nav-container" (mouseleave)="hidePill()">

        <!-- Glass pill -->
        <div #hoverPill class="hover-pill"></div>

        <!-- Véhicules -->
        <div class="nav-item-wrap" (mouseenter)="movePill($event.currentTarget)">
          <a routerLink="/vehicules" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/vehicules')">Véhicules</span>
          </a>
        </div>

        <!-- Interventions -->
        <div class="nav-item-wrap" (mouseenter)="movePill($event.currentTarget)">
          <a routerLink="/interventions" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/interventions')">Interventions</span>
          </a>
        </div>

        <!-- Composants -->
        <div class="nav-item-wrap" (mouseenter)="movePill($event.currentTarget)">
          <a routerLink="/composants" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/composants')">Composants</span>
          </a>
        </div>

        <!-- Demandes achat -->
        <div class="nav-item-wrap" (mouseenter)="movePill($event.currentTarget)">
          <a routerLink="/demandes-achat" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/demandes-achat')">Demandes</span>
          </a>
        </div>

        <!-- Chat AI -->
        <div class="nav-item-wrap" (mouseenter)="movePill($event.currentTarget)">
          <a routerLink="/chatbot" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/chatbot')">Chat AI</span>
          </a>
        </div>

        <!-- Import -->
        <div class="nav-item-wrap" (mouseenter)="movePill($event.currentTarget)">
          <a routerLink="/import-export" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/import-export')">Import</span>
          </a>
        </div>

        <!-- Journées -->
        <div class="nav-item-wrap" (mouseenter)="movePill($event.currentTarget)">
          <a routerLink="/tableau-journees" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/tableau-journees')">Journées</span>
          </a>
        </div>

      </div><!-- /nav-container -->

      <!-- Right cluster -->
      <div class="topbar-right">
        <app-bell-dropdown [unreadCount]="unreadCount()" />
        <div class="topbar-divider"></div>
        <div class="user-cluster"
             (click)="userMenuOpen.set(!userMenuOpen())"
             (clickOutside)="userMenuOpen.set(false)">
          <div class="user-avatar">{{ initials() }}</div>
          <lucide-icon name="chevron-down" [size]="14" color="rgba(107,114,128,1)" />
          @if (userMenuOpen()) {
            <div class="user-menu">
              <div class="user-name">{{ auth.user()?.prenom }} {{ auth.user()?.nom }}</div>
              <a routerLink="/profil" class="user-menu-item">Profil</a>
              <button (click)="logout()" class="user-menu-item user-menu-item--logout">Déconnexion</button>
            </div>
          }
        </div>
      </div>

    </header>
  `,
  styles: [`
    :host { display: block; }

    .top-bar {
      display: flex;
      align-items: center;
      padding: 0 20px;
      background: #141414;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 72px;
      z-index: 100;
      gap: 0;
      flex-shrink: 0;
    }

    /* ── Logo ── */
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-right: 28px;
      text-decoration: none;
      flex-shrink: 0;
      cursor: pointer;
    }
    .logo-img {
      height: 36px;
      width: auto;
      display: block;
      flex-shrink: 0;
    }
    .logo-arrow-square {
      width: 36px;
      height: 36px;
      background: #F7941D;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo-text-stack { line-height: 1; }
    .logo-brand {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.05em;
      line-height: 1.2;
    }
    .logo-product {
      font-family: 'Open Sans', sans-serif;
      font-size: 10px;
      color: #F7941D;
      font-weight: 500;
      letter-spacing: 0.03em;
    }

    /* ── Nav container ── */
    .nav-container {
      display: flex;
      flex: 1;
      height: 100%;
      position: relative;
      overflow: visible;
    }

    /* ── Hover pill ── */
    .hover-pill {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      height: 36px;
      border-radius: 8px;
      pointer-events: none;
      z-index: 0;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.13);
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      transition: left 320ms cubic-bezier(0.34,1.2,0.64,1), width 320ms cubic-bezier(0.34,1.2,0.64,1), opacity 180ms ease;
      opacity: 0;
    }

    /* ── Nav items ── */
    .nav-item-wrap {
      position: relative;
      z-index: 1;
    }
    .nav-link {
      height: 72px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: border-color 200ms ease-out;
      text-decoration: none;
      position: relative;
    }
    .nav-link--active,
    .nav-link.active {
      border-bottom-color: #F7941D;
    }
    /* Glass pill behind the active tab label */
    .nav-link--active::before,
    .nav-link.active::before {
      content: '';
      position: absolute;
      top: 19px;
      left: 0;
      right: 0;
      height: 32px;
      border-radius: 8px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08);
      pointer-events: none;
    }

    .nav-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13.5px;
      font-weight: 400;
      color: rgba(255,255,255,0.62);
      user-select: none;
      transition: color 200ms;
      white-space: nowrap;
      position: relative;
    }
    .nav-label--active {
      font-weight: 600;
      color: #fff;
      font-synthesis: none;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Right cluster ── */
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .topbar-divider {
      width: 1px;
      height: 24px;
      background: #374151;
    }
    .user-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      position: relative;
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 9999px;
      background: #F7941D;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #1A1A1A;
      flex-shrink: 0;
    }
    .user-menu {
      position: absolute;
      top: 44px;
      right: 0;
      min-width: 200px;
      background: rgba(20,20,20,0.97);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      padding: 8px 0;
      z-index: 200;
      color: #fff;
    }
    .user-name {
      padding: 8px 16px;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
    }
    .user-menu-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      box-sizing: border-box;
    }
    .user-menu-item:hover {
      background: rgba(255,255,255,0.07);
    }
    .user-menu-item--logout {
      color: #EF4444;
    }
  `],
})
export class TopBarComponent {
  auth = inject(AuthService);
  router = inject(Router);
  private notificationService = inject(NotificationService);

  @ViewChild('navContainer') navContainerRef!: ElementRef;
  @ViewChild('hoverPill') hoverPillRef!: ElementRef;

  unreadCount = this.notificationService.unreadCount;
  userMenuOpen = signal(false);

  initials = computed(() => (this.auth.user()?.prenom?.[0] ?? '') + (this.auth.user()?.nom?.[0] ?? ''));

  movePill(el: EventTarget | null): void {
    const pill = this.hoverPillRef?.nativeElement;
    const container = this.navContainerRef?.nativeElement;
    if (!pill || !container || !el) return;
    const htmlEl = el as HTMLElement;
    const elRect = htmlEl.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    pill.style.left = (elRect.left - cRect.left) + 'px';
    pill.style.width = elRect.width + 'px';
    pill.style.opacity = '1';
  }

  hidePill(): void {
    if (this.hoverPillRef?.nativeElement) {
      this.hoverPillRef.nativeElement.style.opacity = '0';
    }
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
    });
  }
}
