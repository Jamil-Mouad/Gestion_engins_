import { Component, Input, Output, EventEmitter, HostListener, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="modal-overlay" (click)="onOverlayClick()">
        <div class="modal-dialog" [style.maxWidth]="maxWidth()" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">{{ title() }}</h2>
            <button class="modal-close" (click)="onClose.emit()" aria-label="Fermer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-dialog {
      position: relative;
      z-index: 1;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 60px rgba(17, 24, 39, 0.2);
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid var(--color-border);
    }
    .modal-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
    .modal-close {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      padding: 4px;
      display: flex;
      align-items: center;
    }
    .modal-close:hover { color: var(--color-text); }
    .modal-body {
      padding: 24px;
    }
  `],
})
export class ModalShellComponent implements OnInit, OnDestroy {
  title = signal('');
  visible = signal(true);
  maxWidth = signal('560px');
  @Input() set modalTitle(v: string) { this.title.set(v); }
  @Input() set isVisible(v: boolean) { this.visible.set(v); }
  @Input() set modalMaxWidth(v: string) { this.maxWidth.set(v); }
  @Output() onClose = new EventEmitter<void>();

  private historyStatePushed = false;

  ngOnInit(): void {
    if (this.visible()) {
      history.pushState({ modal: true }, '');
      this.historyStatePushed = true;
    }
  }

  ngOnDestroy(): void {
    this.historyStatePushed = false;
  }

  onOverlayClick(): void {
    this.historyStatePushed = false;
    this.onClose.emit();
  }

  @HostListener('window:popstate', ['$event'])
  onPopstate(event: PopStateEvent): void {
    if (this.historyStatePushed && (event.state as { modal?: boolean } | null)?.modal !== true) {
      this.historyStatePushed = false;
      this.onClose.emit();
    }
  }
}