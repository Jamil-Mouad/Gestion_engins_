import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PneuService } from './pneu.service';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-permuter-pneu-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Permuter les positions" (onClose)="close.emit()">
      <div class="permuter-modal">
        <p class="permuter-modal__info">
          Position actuelle : <strong>P{{ currentPosition }}</strong>
        </p>
        <div class="form-group">
          <label class="form-label">Permuter avec la position</label>
          <select class="form-select" [(ngModel)]="targetPosition">
            <option [ngValue]="null" disabled>Choisir une position…</option>
            @for (pos of availablePositions; track pos) {
              <option [ngValue]="pos">P{{ pos }}</option>
            }
          </select>
        </div>
        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }
        <div class="modal-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="button" class="btn-confirm"
                  [disabled]="targetPosition === null || saving()"
                  (click)="onConfirm()">
            {{ saving() ? 'En cours…' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .permuter-modal { display: flex; flex-direction: column; gap: 16px; }
    .permuter-modal__info { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); margin: 0; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text); }
    .form-select { height: 38px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 12px; font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .form-select:focus { border-color: var(--color-primary); }
    .form-error { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-danger); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    .btn-cancel { height: 38px; padding: 0 16px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 500; color: var(--color-text); cursor: pointer; }
    .btn-cancel:hover { background: var(--color-surface-2); }
    .btn-confirm { height: 38px; padding: 0 20px; border: none; border-radius: 8px; background: var(--color-primary); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; }
    .btn-confirm:hover:not(:disabled) { opacity: 0.9; }
    .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class PermuterPneuModalComponent {
  private pneuService = inject(PneuService);

  @Input() pneuId!: number;
  @Input() currentPosition!: number;
  @Input() availablePositions: number[] = [];

  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  targetPosition: number | null = null;
  saving = signal(false);
  error = signal<string | null>(null);

  onConfirm(): void {
    if (this.targetPosition === null) return;
    this.saving.set(true);
    this.error.set(null);
    this.pneuService.permuter(this.pneuId, this.targetPosition).subscribe({
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
