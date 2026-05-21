import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-filter-chip',
  standalone: true,
  imports: [],
  template: `
    <button
      class="filter-chip"
      [class.filter-chip--active]="active"
      [class.filter-chip--inactive]="!active"
      (click)="clicked.emit()"
      type="button">
      @if (active) {
        <span class="filter-chip-check">✓</span>
      }
      {{ label }}
    </button>
  `,
  styles: [`
    .filter-chip {
      height: 32px;
      padding: 0 14px;
      border-radius: 9999px;
      border: 1px solid;
      cursor: pointer;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      transition: all 150ms ease-out;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      user-select: none;
      background: transparent;
      line-height: 1;
    }
    .filter-chip--active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
      color: var(--color-primary-text);
    }
    .filter-chip--inactive {
      border-color: #D1D5DB;
      background: white;
      color: #374151;
    }
    .filter-chip-check {
      font-size: 12px;
      line-height: 1;
    }
  `],
})
export class FilterChipComponent {
  @Input() label = '';
  @Input() active = false;
  @Output() clicked = new EventEmitter<void>();
}
