import { Component, input } from '@angular/core';
import { SpinnerComponent } from './spinner.component';

@Component({
  selector: 'app-spinner-overlay',
  standalone: true,
  imports: [SpinnerComponent],
  template: `
    @if (show()) {
      <div class="spinner-overlay">
        <app-spinner size="lg" />
      </div>
    }
  `,
  styles: [`
    @keyframes ovFadeIn { from { opacity: 0; } to { opacity: 1; } }
    .spinner-overlay {
      position: fixed;
      inset: 0;
      z-index: 9000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(245, 245, 245, 0.72);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      animation: ovFadeIn 120ms ease-out;
    }
  `],
})
export class SpinnerOverlayComponent {
  show = input<boolean>(false);
}
