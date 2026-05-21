import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PneuService } from './pneu.service';
import { InspectionActivity, InspectionForm, PneuInspection } from '../../shared/models/pneu.model';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../shared/directives/double-click-guard.directive';

@Component({
  selector: 'app-inspection-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell modalTitle="Nouvelle inspection" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="inspection-form">
        <div class="form-group">
          <label>Activité</label>
          <select formControlName="activity">
            @for (a of activities; track a.value) {
              <option [value]="a.value">{{ a.label }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>Date d'inspection</label>
          <input formControlName="dateInspection" type="datetime-local" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Pression (PSI)</label>
            <input formControlName="pressionPsi" type="number" step="0.1" placeholder="Optionnel" />
          </div>
          <div class="form-group">
            <label>Profondeur (32")</label>
            <input formControlName="profondeur32e" type="number" step="1" placeholder="Optionnel" />
          </div>
        </div>

        <div class="form-group">
          <label>Méthode</label>
          <input formControlName="methode" placeholder="Visuelle, Manuelle…" />
        </div>

        <div class="form-group">
          <label>Notes</label>
          <textarea formControlName="notes" rows="3" placeholder="Observations…"></textarea>
        </div>

        @if (errorMessage()) {
          <div class="form-error">{{ errorMessage() }}</div>
        }

        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="submit" class="btn-submit" [disabled]="form.invalid || submitting()" [appDoubleClickGuard]="submitting()">
            {{ submitting() ? 'Enregistrement…' : 'Créer' }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .inspection-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group select, .form-group textarea { height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .form-group textarea { height: auto; padding: 8px 12px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-error { background: #FEE2E2; color: #991B1B; padding: 8px 12px; border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-submit { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-submit:hover { background: var(--color-primary-dark); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class InspectionModalComponent {
  private pneuService = inject(PneuService);

  @Input({ required: true }) pneuId!: number;
  @Output() saved = new EventEmitter<PneuInspection>();
  @Output() close = new EventEmitter<void>();

  submitting = signal(false);
  errorMessage = signal('');

  activities: { value: InspectionActivity; label: string }[] = [
    { value: 'Installed', label: 'Installation' },
    { value: 'Tread Depth Reading', label: 'Lecteur profondeur' },
    { value: 'Inspection', label: 'Inspection' },
    { value: 'Rotation', label: 'Rotation' },
    { value: 'Replaced', label: 'Remplacement' },
  ];

  form = inject(FormBuilder).group({
    activity: ['Inspection' as InspectionActivity, [Validators.required]],
    dateInspection: ['', [Validators.required]],
    pressionPsi: [null as number | null],
    profondeur32e: [null as number | null],
    methode: [''],
    notes: [''],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const formValue = this.form.value;
    const payload: InspectionForm = {
      activity: formValue.activity as InspectionActivity,
      dateInspection: formValue.dateInspection!,
      pressionPsi: formValue.pressionPsi ?? null,
      profondeur32e: formValue.profondeur32e ?? null,
      methode: formValue.methode ?? '',
      notes: formValue.notes ?? '',
    };

    this.pneuService.createInspection(this.pneuId, payload).subscribe({
      next: (inspection) => {
        this.submitting.set(false);
        this.saved.emit(inspection);
        this.close.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set("Erreur lors de la création de l'inspection.");
      },
    });
  }
}