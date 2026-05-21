import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-f-row',
  standalone: true,
  imports: [],
  template: `
    <div class="f-row">
      <label class="f-row-label">
        <span>{{ label }}@if (required) { <span class="f-row-asterisk">*</span> }</span>
        <ng-content />
      </label>
    </div>
  `,
  styles: [`
    .f-row {
      margin-bottom: 16px;
    }
    .f-row-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      display: block;
    }
    .f-row-asterisk {
      color: #EF4444;
      margin-left: 2px;
    }
  `],
})
export class FRowComponent {
  @Input() label = '';
  @Input() required = false;
}
