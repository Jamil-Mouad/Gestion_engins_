import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-cloturer-confirm-modal',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Confirmer la clôture" (onClose)="cancel.emit()">
      <div class="cloturer-confirm">
        <p class="cloturer-confirm__message">Êtes-vous sûr de vouloir clôturer cette intervention ?</p>
        @if (_label()) {
          <p class="cloturer-confirm__label"><strong>{{ _label() }}</strong></p>
        }
        <div class="cloturer-confirm__actions">
          <button class="btn-cancel" (click)="cancel.emit()">Annuler</button>
          <button class="btn-danger" (click)="confirmed.emit()">Confirmer</button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .cloturer-confirm { display: flex; flex-direction: column; gap: 16px; }
    .cloturer-confirm__message { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); margin: 0; }
    .cloturer-confirm__label { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); margin: 0; padding: 8px 12px; background: var(--color-surface-2); border-radius: var(--radius-sm); }
    .cloturer-confirm__actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-danger { background: #DC2626; color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-danger:hover { background: #B91C1C; }
  `],
})
export class CloturerConfirmModalComponent {
  _label = signal('');
  @Input() set interventionLabel(v: string) { this._label.set(v); }
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}