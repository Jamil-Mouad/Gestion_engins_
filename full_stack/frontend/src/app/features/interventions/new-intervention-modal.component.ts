import { Component, inject, signal, Output, EventEmitter, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InterventionService } from './intervention.service';
import { Intervention, InterventionCategorie, NewInterventionForm } from '../../shared/models/intervention.model';
import { VehiculeService } from '../vehicules/vehicule.service';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../shared/directives/double-click-guard.directive';

@Component({
  selector: 'app-new-intervention-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell modalTitle="Nouvelle intervention" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="new-intervention-form">
        <div class="form-group">
          <label>Véhicule</label>
          <input formControlName="vehiculeId" type="number" placeholder="ID véhicule" />
        </div>

        <div class="form-group">
          <label>Type d'intervention</label>
          <select formControlName="typeInterventionId">
            <option value="">— Sélectionner —</option>
            @for (t of types(); track t.id) {
              <option [value]="t.id">{{ t.libelle }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>Catégorie</label>
          <div class="radio-group">
            @for (c of categories; track c.value) {
              <label class="radio-label">
                <input type="radio" formControlName="categorie" [value]="c.value" />
                {{ c.label }}
              </label>
            }
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Partie</label>
            <input formControlName="partie" placeholder="Moteur, Transmission…" />
          </div>
          <div class="form-group">
            <label>N°BS</label>
            <input formControlName="nBs" placeholder="BS-2026-001" />
          </div>
        </div>

        <div class="form-group">
          <label>Date début</label>
          <input formControlName="dateDebut" type="datetime-local" />
        </div>

        <div class="form-group">
          <label>Observations</label>
          <textarea formControlName="observations" rows="3" placeholder="Description de l'intervention…"></textarea>
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
    .new-intervention-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group select, .form-group textarea { height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .form-group textarea { height: auto; padding: 8px 12px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .radio-group { display: flex; flex-wrap: wrap; gap: 12px; }
    .radio-label { display: flex; align-items: center; gap: 4px; font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); cursor: pointer; }
    .form-error { background: #FEE2E2; color: #991B1B; padding: 8px 12px; border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-submit { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-submit:hover { background: var(--color-primary-dark); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class NewInterventionModalComponent {
  private interventionService = inject(InterventionService);
  private destroyRef = inject(DestroyRef);

  @Output() saved = new EventEmitter<Intervention>();
  @Output() close = new EventEmitter<void>();

  submitting = signal(false);
  errorMessage = signal('');
  types = signal<{ id: number; libelle: string }[]>([]);

  categories: { value: InterventionCategorie; label: string }[] = [
    { value: 'preventive', label: 'Préventive' },
    { value: 'corrective', label: 'Corrective' },
    { value: 'depannage', label: 'Dépannage' },
    { value: 'controle', label: 'Contrôle' },
  ];

  form = inject(FormBuilder).group({
    vehiculeId: [null as number | null, [Validators.required]],
    typeInterventionId: [null as number | null, [Validators.required]],
    categorie: ['preventive' as InterventionCategorie, [Validators.required]],
    partie: [''],
    nBs: [''],
    dateDebut: ['', [Validators.required]],
    observations: [''],
  });

  constructor() {
    this.interventionService.getTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (types) => this.types.set(types),
      error: () => {},
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const formValue = this.form.value;
    const payload: NewInterventionForm = {
      vehiculeId: formValue.vehiculeId!,
      typeInterventionId: formValue.typeInterventionId!,
      composantId: null,
      categorie: formValue.categorie as InterventionCategorie,
      partie: formValue.partie || '',
      nBs: formValue.nBs || '',
      dateDebut: formValue.dateDebut!,
      observations: formValue.observations || '',
    };

    this.interventionService.create(payload).subscribe({
      next: (intervention) => {
        this.submitting.set(false);
        this.saved.emit(intervention);
        this.close.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set("Erreur lors de la création de l'intervention.");
      },
    });
  }
}