import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [],
  template: `
    <div class="card-host">
      @if (title) {
        <div class="card-title-row">
          <h3 class="card-title-text">{{ title }}</h3>
          <ng-content select="[card-title-right]" />
        </div>
      }
      <div class="card-body">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .card-host {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid var(--color-border);
    }
    .card-title-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
    .card-body {
      padding: 24px;
    }
  `],
})
export class CardComponent {
  @Input() title?: string;
}
