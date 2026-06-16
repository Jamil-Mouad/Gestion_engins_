import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="vt-container">
      <button
        class="vt-btn"
        [class.vt-btn--active]="view() === 'table'"
        [class.vt-btn--inactive]="view() !== 'table'"
        (click)="viewChange.emit('table')"
        type="button"
        title="Vue tableau">
        <lucide-icon name="table-2" [size]="16" />
        <span class="vt-label">Tableau</span>
      </button>
      <button
        class="vt-btn vt-btn--cards-side"
        [class.vt-btn--active]="view() === 'cards'"
        [class.vt-btn--inactive]="view() !== 'cards'"
        (click)="viewChange.emit('cards')"
        type="button"
        title="Vue cartes">
        <lucide-icon name="layout-grid" [size]="16" />
        <span class="vt-label">Cartes</span>
      </button>
    </div>
  `,
  styles: [`
    .vt-container {
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      display: flex;
    }
    .vt-btn {
      display: flex;
      align-items: center;
      padding: 0 14px;
      height: 40px;
      cursor: pointer;
      transition: all 150ms;
      border: none;
      gap: 6px;
      font-family: 'Open Sans', sans-serif;
    }
    .vt-btn--cards-side {
      border-left: 1px solid #D1D5DB;
    }
    .vt-label {
      font-size: 13px;
      font-weight: 600;
    }
    .vt-btn--active  { background: var(--color-primary); color: white; }
    .vt-btn--inactive { background: white; color: #374151; }
    .vt-btn--inactive:hover { background: #F9FAFB; }
  `],
})
export class ViewToggleComponent {
  view = input<'table' | 'cards'>('table');
  viewChange = output<'table' | 'cards'>();
}
