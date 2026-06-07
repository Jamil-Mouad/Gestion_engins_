import { Component, Input, signal, HostListener } from '@angular/core';

/**
 * Renders a small thumbnail; clicking it opens a full-screen lightbox overlay.
 * Shows a "—" dash placeholder when src is falsy.
 */
@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  template: `
    @if (src) {
      <img
        class="thumb"
        [src]="src"
        alt="photo"
        (click)="open.set(true)"
        (error)="onThumbError($event)" />
    } @else {
      <span class="no-img">—</span>
    }

    @if (open()) {
      <div class="lb-backdrop" (click)="open.set(false)">
        <div class="lb-box" (click)="$event.stopPropagation()">
          <button class="lb-close" (click)="open.set(false)" type="button" aria-label="Fermer">✕</button>
          <img class="lb-img" [src]="src" alt="photo plein écran" (error)="onFullError($event)" />
        </div>
      </div>
    }
  `,
  styles: [`
    .thumb {
      height: 36px;
      width: 52px;
      object-fit: cover;
      border-radius: 4px;
      display: block;
      cursor: pointer;
      border: 1px solid var(--color-border, #E5E7EB);
      transition: opacity 0.15s;
    }
    .thumb:hover { opacity: 0.85; }

    .no-img {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #9CA3AF;
    }

    /* Lightbox overlay — rendered in the current stacking context;
       z-index 10000 ensures it always floats above other content. */
    .lb-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease both;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .lb-box {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      background: transparent;
    }

    .lb-close {
      position: absolute;
      top: -36px;
      right: 0;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
      opacity: 0.8;
    }
    .lb-close:hover { opacity: 1; }

    .lb-img {
      max-width: 90vw;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      display: block;
    }
  `],
})
export class ImageLightboxComponent {
  @Input() src: string | null | undefined = null;

  open = signal(false);

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.open.set(false);
  }

  onThumbError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onFullError(event: Event): void {
    (event.target as HTMLImageElement).alt = 'Image non disponible';
  }
}
