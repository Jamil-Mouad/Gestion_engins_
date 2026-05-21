import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      @if (icon) {
        <div class="empty-state__icon">{{ icon }}</div>
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
      font-size: 48px;
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
  @Input() icon = '';
}