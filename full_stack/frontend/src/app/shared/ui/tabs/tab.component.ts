import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-tab',
  standalone: true,
  imports: [],
  template: `
    <button
      class="tab"
      [class.tab--active]="active"
      [class.tab--inactive]="!active"
      (click)="clicked.emit()"
      type="button">
      {{ label }}
      @if (badge !== undefined && badge !== null) {
        <span class="tab-badge" [class.tab-badge--active]="active" [class.tab-badge--inactive]="!active">
          {{ badge }}
        </span>
      }
    </button>
  `,
  styles: [`
    .tab {
      position: relative;
      z-index: 1;
      height: 48px;
      padding: 0 20px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      cursor: pointer;
      border: none;
      border-bottom: 2px solid;
      background: transparent;
      transition: all 150ms ease-out;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .tab--active {
      border-color: var(--color-primary);
      font-weight: 600;
      color: var(--color-text);
      font-synthesis: none;
      -webkit-font-smoothing: antialiased;
    }
    .tab--inactive {
      border-color: transparent;
      font-weight: 400;
      color: var(--color-text-muted);
    }
    .tab-badge {
      height: 20px;
      min-width: 20px;
      padding: 0 6px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .tab-badge--active   { background: var(--color-primary); color: white; }
    .tab-badge--inactive { background: #E5E5E5; color: #6B7280; }
  `],
})
export class TabComponent {
  @Input() label = '';
  @Input() active = false;
  @Input() badge?: number;
  @Output() clicked = new EventEmitter<void>();
}
