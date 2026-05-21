import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sources-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (sources.length > 0) {
      <div class="sources">
        <span class="sources__label">Sources :</span>
        @for (src of sources; track src.url) {
          <a [href]="src.url" target="_blank" class="sources__chip">{{ src.title }}</a>
        }
      </div>
    }
  `,
  styles: [`
    .sources { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
    .sources__label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); }
    .sources__chip { font-family: 'Open Sans', sans-serif; font-size: 12px; padding: 3px 10px; border-radius: var(--radius-sm); background: var(--color-surface-2); color: var(--color-primary); text-decoration: none; }
    .sources__chip:hover { background: var(--color-primary-soft); }
  `],
})
export class SourcesPanelComponent {
  @Input() sources: { title: string; url: string }[] = [];
}