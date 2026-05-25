import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { VehiculeService } from '../vehicule.service';
import { Vehicule, VehiculeType, VehiculeStatut, isCamionType } from '../../../shared/models/vehicule.model';
import { ModalShellComponent } from '../../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../../shared/directives/double-click-guard.directive';

@Component({
  selector: 'app-new-vehicule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell modalTitle="Ajouter un véhicule" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="new-vehicule-form">
        <div class="form-group">
          <label>Code</label>
          <input formControlName="code" placeholder="CAM-001" />
        </div>

        <div class="form-group">
          <label>Type</label>
          <select formControlName="type">
            @for (t of typeOptions; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Marque</label>
            <input formControlName="marque" placeholder="Volvo" />
          </div>
          <div class="form-group">
            <label>Modèle</label>
            <input formControlName="modele" placeholder="FH16" />
          </div>
        </div>

        <div class="form-group">
          <label>Matricule</label>
          <input formControlName="matricule" placeholder="A-123-456" />
        </div>

        <div class="form-group">
          <label>Statut</label>
          <select formControlName="statut">
            @for (s of statutOptions; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        </div>

        @if (isCamionTypeSelected()) {
          <div class="camion-subform">
            <h3>Détails camion</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Capacité (tonnes)</label>
                <input formControlName="capaciteTonnes" type="number" placeholder="25" />
              </div>
              <div class="form-group">
                <label>Config axe</label>
                <select formControlName="configAxle">
                  <option value="4x2">4x2</option>
                  <option value="6x4">6x4</option>
                  <option value="plateau-2x2">Plateau 2x2</option>
                </select>
              </div>
            </div>
          </div>
        }

        @if (errorMessage()) {
          <div class="form-error">{{ errorMessage() }}</div>
        }

        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="submit" class="btn-submit" [disabled]="form.invalid || submitting()" [appDoubleClickGuard]="submitting()">
            {{ submitting() ? 'Enregistrement...' : 'Ajouter' }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .new-vehicule-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .form-group input, .form-group select { height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .camion-subform { border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px; }
    .camion-subform h3 { font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0 0 12px; }
    .form-error { background: #FEE2E2; color: #991B1B; padding: 8px 12px; border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-submit { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-submit:hover { background: var(--color-primary-dark); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class NewVehiculeModalComponent {
  private vehiculeService = inject(VehiculeService);

  @Output() saved = new EventEmitter<Vehicule>();
  @Output() close = new EventEmitter<void>();

  submitting = signal(false);
  errorMessage = signal('');

  isCamionTypeSelected(): boolean {
    return isCamionType(this.form.get('type')?.value ?? '');
  }

  typeOptions: { value: VehiculeType; label: string }[] = [
    { value: 'camion',          label: 'Camion' },
    { value: 'camion_tracteur', label: 'Camion (Tracteur)' },
    { value: 'voiture',         label: 'Voiture' },
    { value: 'semi_remorque',   label: 'Semi-remorque' },
    { value: 'chariot',         label: 'Chariot' },
    { value: 'chargeur',        label: 'Chargeur' },
    { value: 'bus',             label: 'Bus' },
    { value: 'balayeuse',       label: 'Balayeuse' },
    { value: 'pick_up',         label: 'Pick-up' },
  ];

  statutOptions: { value: VehiculeStatut; label: string }[] = [
    { value: 'in-service', label: 'En service' },
    { value: 'workshop', label: 'En atelier' },
    { value: 'maintenance', label: 'En maintenance' },
    { value: 'out-of-service', label: 'Hors service' },
  ];

  form = inject(FormBuilder).group({
    code: ['', [Validators.required]],
    type: ['camion' as VehiculeType, [Validators.required]],
    marque: ['', [Validators.required]],
    modele: ['', [Validators.required]],
    matricule: [''],
    nChassis: [''],
    annee: [null as number | null],
    carburant: ['Diesel'],
    statut: ['in-service' as VehiculeStatut, [Validators.required]],
    dateMiseService: [null as string | null],
    capaciteTonnes: [null as number | null],
    configAxle: ['4x2' as '4x2' | '6x4' | 'plateau-2x2' | null],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const formValue = this.form.value;
    const newVehicule: any = {
      code: formValue.code,
      type: formValue.type,
      marque: formValue.marque,
      modele: formValue.modele,
      matricule: formValue.matricule || '',
      nChassis: formValue.nChassis || '',
      annee: formValue.annee,
      carburant: formValue.carburant || 'Diesel',
      statut: formValue.statut,
      dateMiseService: formValue.dateMiseService,
    };

    if (isCamionType(formValue.type ?? '')) {
      newVehicule.camionDetails = {
        capaciteTonnes: formValue.capaciteTonnes ?? null,
        configAxle: formValue.configAxle ?? null,
      };
    }

    this.vehiculeService.create(newVehicule).subscribe({
      next: (v) => {
        this.submitting.set(false);
        this.saved.emit(v);
        this.close.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Erreur lors de la création du véhicule.');
      },
    });
  }
}