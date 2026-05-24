import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { TopBarComponent } from './shared/ui/top-bar/top-bar.component';
import { EventSourceService } from './core/realtime/event-source.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopBarComponent],
  template: `
    @if (auth.isAuthenticated()) {
      <app-top-bar />
    }
    <main [class.with-topbar]="auth.isAuthenticated()">
      <router-outlet />
    </main>
  `,
  styles: [`
    .with-topbar {
      padding-top: var(--topbar-height);
    }
  `],
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  private eventSourceService = inject(EventSourceService);

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.eventSourceService.connect();
    }
  }
}