import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <nav class="breadcrumb">
      @for (item of items; track item.label; let i = $index; let last = $last) {
        @if (i > 0) {
          <lucide-icon name="chevron-right" [size]="14" class="breadcrumb-sep" />
        }
        @if (item.route && !last) {
          <a [routerLink]="item.route" class="breadcrumb-item breadcrumb-item--link">{{ item.label }}</a>
        } @else {
          <span class="breadcrumb-item" [class.breadcrumb-item--current]="last">{{ item.label }}</span>
        }
      }
    </nav>
  `,
  styles: [`
    .breadcrumb {
      padding: 12px 32px;
      border-bottom: 1px solid #E5E5E5;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--color-surface);
    }
    .breadcrumb-item {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 400;
      color: var(--color-text-muted);
      text-decoration: none;
    }
    .breadcrumb-item--link {
      cursor: pointer;
    }
    .breadcrumb-item--link:hover {
      color: var(--color-text);
    }
    .breadcrumb-item--current {
      font-weight: 600;
      color: var(--color-text);
    }
    .breadcrumb-sep {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }
  `],
})
export class BreadcrumbComponent {
  @Input() items: { label: string; route?: string }[] = [];
}
