import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface DataTableRowCol {
  content: unknown;
  flex?: number;
  minWidth?: number;
  mono?: boolean;
  sm?: boolean;
}

@Component({
  selector: 'app-data-table-row',
  standalone: true,
  imports: [],
  template: `
    <div
      class="dtr-row"
      [class.dtr-row--alert]="alert"
      [class.dtr-row--selected]="selected"
      [class.dtr-row--clickable]="clickable"
      [style.animation-delay]="idx * 30 + 'ms'"
      (click)="clickable ? rowClicked.emit() : null">
      @if (cols && cols.length > 0) {
        @for (col of cols; track $index) {
          <div
            class="dtr-cell"
            [class.dtr-cell--mono]="col.mono"
            [class.dtr-cell--sm]="col.sm"
            [style.flex]="col.flex ?? 1"
            [style.min-width.px]="col.minWidth ?? 0">
            {{ col.content }}
          </div>
        }
      } @else {
        <ng-content />
      }
    </div>
  `,
  styles: [`
    .dtr-row {
      display: flex;
      height: 52px;
      border-bottom: 1px solid var(--color-border);
      border-left: 3px solid transparent;
      align-items: center;
      animation: rowEnter 240ms ease-out both;
      background: var(--color-surface);
      transition: background 100ms ease;
    }
    .dtr-row--selected {
      border-left-color: var(--color-primary);
    }
    .dtr-row--alert {
      background: #FFF8F0;
    }
    .dtr-row--clickable {
      cursor: pointer;
    }
    .dtr-row--clickable:hover {
      background: var(--color-surface-2, #F5F5F5);
    }
    .dtr-cell {
      padding: 0 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dtr-cell--mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .dtr-cell--sm {
      font-size: 12px;
    }
  `],
})
export class DataTableRowComponent {
  @Input() cols?: DataTableRowCol[];
  @Input() alert = false;
  @Input() selected = false;
  @Input() idx = 0;
  @Input() clickable = false;
  @Output() rowClicked = new EventEmitter<void>();
}
