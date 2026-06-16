import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-magasin-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="magasin-nav">
      <a routerLink="/magasin" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="mn-link--active" class="mn-link">Tableau de bord</a>
      <a routerLink="/magasin/sorties" routerLinkActive="mn-link--active" class="mn-link">Sorties</a>
      <a routerLink="/magasin/arrivages" routerLinkActive="mn-link--active" class="mn-link">Arrivages</a>
      <a routerLink="/magasin/jaugeages" routerLinkActive="mn-link--active" class="mn-link">Jaugeages</a>
      @if (canConfigure()) {
        <a routerLink="/magasin/configuration" routerLinkActive="mn-link--active" class="mn-link">Configuration</a>
      }
    </nav>
  `,
  styles: [`
    .magasin-nav {
      display: flex;
      gap: 6px;
      padding: 12px 32px 0;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }
    .mn-link {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-muted, #6B7280);
      text-decoration: none;
      padding: 10px 14px;
      border-bottom: 2px solid transparent;
      transition: color 150ms, border-color 150ms;
      white-space: nowrap;
    }
    .mn-link:hover { color: var(--color-text, #111827); }
    .mn-link--active {
      color: var(--color-primary, #F7941D);
      border-bottom-color: var(--color-primary, #F7941D);
    }
  `],
})
export class MagasinNavComponent {
  private auth = inject(AuthService);
  canConfigure = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MAGASIN';
  });
}
