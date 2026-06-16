import { Component, signal, computed, inject, ViewChildren, QueryList, ElementRef, AfterViewInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
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
      <a [routerLink]="homeLink()" class="logo-wrap">
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

      <!-- Nav -->
      <div class="nav-container">

        @if (!isMagasinOnly()) {
          <!-- Véhicules -->
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/vehicules" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/vehicules')">Véhicules</span>
            </a>
          </div>

          <!-- Interventions -->
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/interventions" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/interventions')">Interventions</span>
            </a>
          </div>

          <!-- Composants -->
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/composants" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/composants')">Composants</span>
            </a>
          </div>

          <!-- Demandes achat -->
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/demandes-achat" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/demandes-achat')">Demandes</span>
            </a>
          </div>
        }

        <!-- Magasin (gasoil) -->
        @if (isMagasinOnly()) {
          <!-- MAGASIN role: the magasin section links live directly in the top bar -->
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/magasin" routerLinkActive="nav-link--active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url === '/magasin'">Tableau de bord</span>
            </a>
          </div>
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/magasin/sorties" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/magasin/sorties')">Sorties</span>
            </a>
          </div>
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/magasin/arrivages" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/magasin/arrivages')">Arrivages</span>
            </a>
          </div>
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/magasin/jaugeages" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/magasin/jaugeages')">Jaugeages</span>
            </a>
          </div>
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/magasin/configuration" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/magasin/configuration')">Configuration</span>
            </a>
          </div>
        } @else if (canSeeMagasin()) {
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/magasin" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/magasin')">Magasin</span>
            </a>
          </div>
        }

        @if (!isMagasinOnly()) {
          <!-- Chat AI -->
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/chatbot" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/chatbot')">Chat AI</span>
            </a>
          </div>

          <!-- Import -->
          <div class="nav-item-wrap" (mouseenter)="onNavHover($any($event.currentTarget))" (mouseleave)="onNavLeave()">
            <a #navLink routerLink="/import-export" routerLinkActive="nav-link--active" class="nav-link">
              <span class="nav-label" [class.nav-label--active]="router.url.startsWith('/import-export')">Import</span>
            </a>
          </div>
        }

        <!-- Sliding active indicator -->
        <div class="nav-indicator" [style.left]="indicatorLeft()" [style.width]="indicatorWidth()"></div>

        <!-- Sliding hover glass pill -->
        <div class="nav-hover-pill"
             [style.left]="hoverLeft()"
             [style.width]="hoverWidth()"
             [class.nav-hover-pill--visible]="isHovering()"></div>

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
      height: 88px;
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

    /* ── Nav container — absolutely centered so logo width doesn't shift it ── */
    .nav-container {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      height: 100%;
      display: flex;
      align-items: center;
    }

    /* ── Nav items ── */
    .nav-item-wrap {
      position: relative;
      z-index: 1;
    }
    .nav-link {
      height: 88px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: border-color 200ms ease-out;
      text-decoration: none;
      position: relative;
    }
    /* Sliding indicator replaces per-link border-bottom */
    .nav-link--active,
    .nav-link.active {
      border-bottom-color: transparent;
    }

    /* Sliding orange underline indicator */
    .nav-indicator {
      position: absolute;
      bottom: 0;
      height: 2px;
      background: #F7941D;
      border-radius: 2px 2px 0 0;
      transition: left 280ms cubic-bezier(0.4, 0, 0.2, 1), width 280ms cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }

    /* Sliding hover glass pill */
    .nav-hover-pill {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      height: 36px;
      border-radius: 8px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      pointer-events: none;
      opacity: 0;
      transition: left 180ms cubic-bezier(0.4,0,0.2,1),
                  width 180ms cubic-bezier(0.4,0,0.2,1),
                  opacity 120ms ease;
    }
    .nav-hover-pill--visible { opacity: 1; }
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
      margin-left: auto;
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
export class TopBarComponent implements AfterViewInit {
  auth = inject(AuthService);
  router = inject(Router);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  @ViewChildren('navLink') navLinks!: QueryList<ElementRef<HTMLAnchorElement>>;

  unreadCount = this.notificationService.unreadCount;
  userMenuOpen = signal(false);
  indicatorLeft = signal('0px');
  indicatorWidth = signal('0px');
  hoverLeft  = signal('0px');
  hoverWidth = signal('0px');
  isHovering = signal(false);

  initials = computed(() => (this.auth.user()?.prenom?.[0] ?? '') + (this.auth.user()?.nom?.[0] ?? ''));
  isMagasinOnly = computed(() => this.auth.user()?.role === 'MAGASIN');
  canSeeMagasin = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'MAGASIN' || role === 'ADMIN' || role === 'FLEET_MANAGER';
  });
  homeLink = computed(() => this.isMagasinOnly() ? '/magasin' : '/vehicules');

  ngAfterViewInit(): void {
    this.moveIndicator();
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => setTimeout(() => this.moveIndicator(), 0));
    // Role-conditional links render after the async /me resolves — recompute then.
    this.navLinks.changes.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => setTimeout(() => this.moveIndicator(), 0));
  }

  private moveIndicator(): void {
    const container = this.navLinks.first?.nativeElement?.closest('.nav-container') as HTMLElement | null;
    const active = this.navLinks.find(r =>
      r.nativeElement.classList.contains('nav-link--active') ||
      r.nativeElement.classList.contains('active')
    );
    if (!active || !container) { this.indicatorWidth.set('0px'); return; }
    const cr = container.getBoundingClientRect();
    const ar = active.nativeElement.getBoundingClientRect();
    this.indicatorLeft.set(`${ar.left - cr.left}px`);
    this.indicatorWidth.set(`${ar.width}px`);
  }

  onNavHover(el: HTMLElement): void {
    const container = el.closest('.nav-container') as HTMLElement | null;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const ar = el.getBoundingClientRect();
    this.hoverLeft.set(`${ar.left - cr.left}px`);
    this.hoverWidth.set(`${ar.width}px`);
    this.isHovering.set(true);
  }

  onNavLeave(): void {
    this.isHovering.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
    });
  }
}
