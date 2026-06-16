import {
  ApplicationRef,
  Component,
  EmbeddedViewRef,
  EnvironmentInjector,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  createComponent,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Internal portal component — rendered directly on document.body to escape
 * any CSS stacking context (opacity/transform animations on ancestor rows).
 */
@Component({
  selector: 'app-lb-portal',
  standalone: true,
  imports: [],
  template: `
    <div class="lb-backdrop" (click)="close.emit()">
      <div class="lb-box" (click)="$event.stopPropagation()">
        <div class="lb-actions">
          <button class="lb-btn" (click)="expand.emit()" type="button"
                  title="Ouvrir dans un onglet" aria-label="Agrandir">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
          <button class="lb-btn" (click)="close.emit()" type="button" aria-label="Fermer">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <img class="lb-img" [src]="src" alt="photo plein écran" (error)="onError($event)" />
      </div>
    </div>
  `,
  styles: [`
    .lb-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.82);
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

    .lb-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 8px;
      z-index: 1;
    }

    .lb-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      border: none;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s;
      padding: 0;
    }
    .lb-btn:hover { background: rgba(0, 0, 0, 0.85); }

    .lb-img {
      max-width: 90vw;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      display: block;
    }
  `],
})
export class LbPortalComponent {
  @Input() src!: string;
  @Output() close = new EventEmitter<void>();
  @Output() expand = new EventEmitter<void>();

  onError(event: Event): void {
    (event.target as HTMLImageElement).alt = 'Image non disponible';
  }
}

/**
 * Renders a small thumbnail; clicking it opens a full-screen lightbox overlay
 * mounted on document.body to avoid CSS stacking-context traps from animated rows.
 * Shows a "—" dash placeholder when src is falsy.
 */
@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [],
  template: `
    @if (src) {
      <img
        class="thumb"
        [class.thumb--fill]="fill"
        [src]="src"
        alt="photo"
        (click)="openLightbox()"
        (error)="onThumbError($event)" />
    } @else {
      <span class="no-img">—</span>
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
    /* fill mode: the parent wrapper controls the thumbnail's size/shape */
    .thumb--fill { width: 100%; height: 100%; border-radius: inherit; border: none; }

    .no-img {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #9CA3AF;
    }
  `],
})
export class ImageLightboxComponent implements OnDestroy {
  @Input() src: string | null | undefined = null;
  @Input() fill = false;

  open = signal(false);

  private appRef = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);
  private doc = inject(DOCUMENT);
  private portalRef: ReturnType<typeof createComponent<LbPortalComponent>> | null = null;

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closeLightbox();
  }

  openLightbox(): void {
    if (this.portalRef || !this.src) return;

    const ref = createComponent(LbPortalComponent, {
      environmentInjector: this.envInjector,
    });
    ref.setInput('src', this.src);
    ref.instance.close.subscribe(() => this.closeLightbox());
    ref.instance.expand.subscribe(() => window.open(this.src!, '_blank'));

    this.appRef.attachView(ref.hostView);
    const el = (ref.hostView as EmbeddedViewRef<unknown>).rootNodes[0] as HTMLElement;
    this.doc.body.appendChild(el);

    this.portalRef = ref;
    this.open.set(true);
  }

  closeLightbox(): void {
    if (!this.portalRef) return;
    this.appRef.detachView(this.portalRef.hostView);
    this.portalRef.destroy();
    this.portalRef = null;
    this.open.set(false);
  }

  ngOnDestroy(): void {
    this.closeLightbox();
  }

  onThumbError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onFullError(event: Event): void {
    (event.target as HTMLImageElement).alt = 'Image non disponible';
  }
}
