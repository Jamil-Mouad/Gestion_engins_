import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MagasinNavComponent } from './magasin-nav.component';

/**
 * Magasin section layout: the section nav strip renders directly under the
 * top bar for non-MAGASIN roles. MAGASIN users already get the section links
 * inline in the top bar, so the strip is hidden for them.
 */
@Component({
  selector: 'app-magasin-layout',
  standalone: true,
  imports: [RouterOutlet, MagasinNavComponent],
  template: `
    @if (!isMagasinOnly()) {
      <app-magasin-nav />
    }
    <router-outlet />
  `,
})
export class MagasinLayoutComponent {
  private auth = inject(AuthService);
  isMagasinOnly = computed(() => this.auth.user()?.role === 'MAGASIN');
}
