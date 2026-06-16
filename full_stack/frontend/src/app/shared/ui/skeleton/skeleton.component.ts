import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton">
      @for (row of rowArray; track $index) {
        <div class="skeleton__row" [style.height.px]="rowHeight()"></div>
      }
    </div>
  `,
  styles: [`
    .skeleton { width: 100%; }
    .skeleton__row {
      background: var(--color-surface-2);
      border-radius: var(--radius-sm);
      margin-bottom: 8px;
    }
  `],
})
export class SkeletonComponent {
  rows = input<number>(3);
  height = input<string>('40px');

  rowHeight = computed(() => parseInt(this.height(), 10) || 40);

  get rowArray(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => i);
  }
}