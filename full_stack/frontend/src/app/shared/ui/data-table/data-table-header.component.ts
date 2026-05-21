import { Component, Input } from '@angular/core';

export interface DataTableCol {
  label: string;
  flex?: number;
  minWidth?: number;
}

@Component({
  selector: 'app-data-table-header',
  standalone: true,
  imports: [],
  template: `
    <div class="dth-row">
      @for (col of cols; track col.label) {
        <div
          class="dth-cell"
          [style.flex]="col.flex ?? 1"
          [style.min-width.px]="col.minWidth ?? 0">
          {{ col.label }}
        </div>
      }
    </div>
  `,
  styles: [`
    .dth-row {
      display: flex;
      background: var(--color-surface-2, #F5F5F5);
      border-bottom: 1px solid var(--color-border);
    }
    .dth-cell {
      padding: 0 16px;
      height: 44px;
      display: flex;
      align-items: center;
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
  `],
})
export class DataTableHeaderComponent {
  @Input() cols: DataTableCol[] = [];
}
