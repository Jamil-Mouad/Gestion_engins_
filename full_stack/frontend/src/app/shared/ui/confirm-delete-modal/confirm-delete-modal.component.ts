import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalShellComponent } from '../../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../../shared/directives/double-click-guard.directive';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell modalTitle="Confirmer la suppression" (onClose)="cancel.emit()">
      <div class="confirm-delete">
        <p class="confirm-delete__message">{{ message() }}</p>
        @if (entityName()) {
          <p class="confirm-delete__entity"><strong>{{ entityName() }}</strong></p>
        }
        <div class="confirm-delete__actions">
          <button class="btn-cancel" (click)="cancel.emit()">Annuler</button>
          <button class="btn-danger" (click)="confirm.emit()" [appDoubleClickGuard]="deleting()">
            {{ deleting() ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .confirm-delete { display: flex; flex-direction: column; gap: 16px; }
    .confirm-delete__message { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); margin: 0; }
    .confirm-delete__entity { font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); margin: 0; padding: 8px 12px; background: var(--color-surface-2); border-radius: var(--radius-sm); }
    .confirm-delete__actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-danger { background: #DC2626; color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-danger:hover { background: #B91C1C; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ConfirmDeleteModalComponent {
  message = signal('Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.');
  entityName = signal('');
  deleting = signal(false);

  @Input() set confirmMessage(v: string) { this.message.set(v); }
  @Input() set itemLabel(v: string) { this.entityName.set(v); }
  @Input() set isDeleting(v: boolean) { this.deleting.set(v); }
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}