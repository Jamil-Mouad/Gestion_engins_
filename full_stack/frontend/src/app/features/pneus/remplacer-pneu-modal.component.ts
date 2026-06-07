import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PneuService } from './pneu.service';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-remplacer-pneu-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Remplacer un pneu" (onClose)="close.emit()">
      <div class="remplacer-modal">
        <p class="remplacer-modal__info">
          Position : <strong>P{{ position }}</strong> (lecture seule)
        </p>
        <div class="form-group">
          <label class="form-label">N° série</label>
          <input class="form-input" type="text" [(ngModel)]="nSerie" placeholder="ex. MIC-789012" />
        </div>
        <div class="form-group">
          <label class="form-label">Marque</label>
          <input class="form-input" type="text" [(ngModel)]="marque" placeholder="ex. Michelin" />
        </div>
        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }
        <div class="modal-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="button" class="btn-confirm"
                  [disabled]="saving()"
                  (click)="onConfirm()">
            {{ saving() ? 'En cours…' : 'Remplacer' }}
          </button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .remplacer-modal { display: flex; flex-direction: column; gap: 16px; }
    .remplacer-modal__info { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); margin: 0; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text); }
    .form-input { height: 38px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 12px; font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .form-input:focus { border-color: var(--color-primary); }
    .form-error { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-danger); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    .btn-cancel { height: 38px; padding: 0 16px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 500; color: var(--color-text); cursor: pointer; }
    .btn-cancel:hover { background: var(--color-surface-2); }
    .btn-confirm { height: 38px; padding: 0 20px; border: none; border-radius: 8px; background: var(--color-primary); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; }
    .btn-confirm:hover:not(:disabled) { opacity: 0.9; }
    .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class RemplacerPneuModalComponent {
  private pneuService = inject(PneuService);

  @Input() pneuId!: number;
  @Input() position!: number;

  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  nSerie = '';
  marque = '';
  saving = signal(false);
  error = signal<string | null>(null);

  onConfirm(): void {
    this.saving.set(true);
    this.error.set(null);
    this.pneuService.remplacer(this.pneuId, {
      nSerie: this.nSerie || undefined,
      marque: this.marque || undefined,
      position: this.position,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Une erreur est survenue. Veuillez réessayer.');
      },
    });
  }
}
