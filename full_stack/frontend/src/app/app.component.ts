import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { TopBarComponent } from './shared/ui/top-bar/top-bar.component';
import { EventSourceService } from './core/realtime/event-source.service';
import { SpinnerOverlayComponent } from './shared/ui/spinner/spinner-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopBarComponent, SpinnerOverlayComponent],
  template: `
    @if (auth.isAuthenticated()) {
      <app-top-bar />
    }
    <main [class.with-topbar]="auth.isAuthenticated()">
      <router-outlet />
    </main>
    <app-spinner-overlay [show]="routeLoading()" />
  `,
  styles: [`
    .with-topbar {
      padding-top: var(--topbar-height);
    }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private router = inject(Router);
  private eventSourceService = inject(EventSourceService);

  routeLoading = signal(false);
  private navTimer: ReturnType<typeof setTimeout> | null = null;
  private navSub!: Subscription;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.eventSourceService.connect();
    }

    this.navSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Only show spinner after 200ms — instant cached-chunk nav never flashes
        this.navTimer = setTimeout(() => this.routeLoading.set(true), 200);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (this.navTimer) { clearTimeout(this.navTimer); this.navTimer = null; }
        // Brief delay so new component's first paint lands before overlay disappears
        setTimeout(() => this.routeLoading.set(false), 80);
      }
    });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    if (this.navTimer) clearTimeout(this.navTimer);
  }
}