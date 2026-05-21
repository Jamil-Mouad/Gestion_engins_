import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [],
  template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-header-title">{{ title }}</h1>
        @if (count !== undefined && count !== null) {
          <span class="page-header-count">({{ count }})</span>
        }
      </div>
      <div class="page-header-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28px 32px 20px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }
    .page-header-left {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .page-header-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
    .page-header-count {
      font-family: 'Open Sans', sans-serif;
      font-size: 16px;
      color: var(--color-text-muted);
      font-weight: 400;
    }
    .page-header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() count?: number;
}
