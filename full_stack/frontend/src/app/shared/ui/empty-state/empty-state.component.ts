import { Component, Input } from '@angular/core';

/**
 * Empty-state placeholder. `icon` is a semantic name resolved to a self-contained
 * inline SVG (no external icon dependency, so it renders in any test harness).
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  template: `
    <div class="empty-state">
      @if (icon) {
        <svg class="empty-state__icon" width="48" height="48" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round">
          @switch (icon) {
            @case ('search') {
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            }
            @case ('truck') {
              <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/>
              <path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/>
              <circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/>
            }
            @case ('fuel') {
              <line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/>
              <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/>
              <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
            }
            @case ('bar-chart-3') {
              <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
            }
            @case ('disc') {
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/>
            }
            @case ('shopping-cart') {
              <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
              <path d="M2 2h2l2.6 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H5.1"/>
            }
            @case ('clipboard-list') {
              <rect width="8" height="4" x="8" y="2" rx="1"/>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
            }
            @case ('wrench') {
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            }
            @case ('ruler') {
              <path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/>
              <path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>
            }
            @case ('bell') {
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            }
            @case ('package') {
              <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/>
              <path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>
            }
            @default {
              <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
            }
          }
        </svg>
      }
      <p class="empty-state__message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }
    .empty-state__icon {
      margin-bottom: 16px;
      color: var(--color-text-muted);
    }
    .empty-state__message {
      font-family: 'Open Sans', sans-serif;
      font-size: 15px;
      color: var(--color-text-muted);
      margin: 0;
    }
  `],
})
export class EmptyStateComponent {
  @Input() message = 'Aucune donnée disponible';
  /** Semantic icon name (search, truck, fuel, bar-chart-3, disc, shopping-cart,
   *  clipboard-list, wrench, ruler, bell, package). */
  @Input() icon = '';
}
