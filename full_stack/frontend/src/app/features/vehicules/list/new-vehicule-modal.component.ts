import { Component, inject, signal, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
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

        <div class="form-row">
          <div class="form-group">
            <label>Matricule</label>
            <input formControlName="matricule" placeholder="A-123-456" />
          </div>
          <div class="form-group">
            <label>N° châssis *</label>
            <input formControlName="nChassis" placeholder="JALFSR23HW3000244" />
          </div>
        </div>

        <div class="form-group">
          <label>Statut</label>
          <select formControlName="statut">
            @for (s of statutOptions; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>Carburant</label>
          <select formControlName="carburant">
            @for (c of carburantOptions; track c.value) {
              <option [value]="c.value">{{ c.label }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>Photo</label>
          <div class="photo-field">
            <input formControlName="photoUrl" placeholder="https://…/photo.jpg" class="photo-url-input" />
            <input #fileInput type="file" accept="image/*" class="hidden-file-input" (change)="onPhotoFileChange($event)" />
            <button type="button" class="btn-upload" [disabled]="uploading()" (click)="fileInput.click()">
              {{ uploading() ? '...' : 'Choisir un fichier' }}
            </button>
          </div>
          @if (uploadError()) {
            <span class="upload-error">{{ uploadError() }}</span>
          }
          @if (form.get('photoUrl')?.value) {
            <img [src]="form.get('photoUrl')!.value" alt="Aperçu photo" class="photo-preview" (error)="onPhotoError($event)" />
          }
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
          <button type="submit" class="btn-submit" [disabled]="form.invalid || submitting() || uploading()" [appDoubleClickGuard]="submitting()">
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
    .photo-field { display: flex; gap: 8px; align-items: center; }
    .photo-url-input { flex: 1; height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .hidden-file-input { display: none; }
    .btn-upload { height: 40px; padding: 0 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); cursor: pointer; white-space: nowrap; flex-shrink: 0; }
    .btn-upload:hover { background: #F9FAFB; }
    .btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }
    .upload-error { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #991B1B; margin-top: 4px; }
    .photo-preview { width: 80px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border); margin-top: 6px; }
  `],
})
export class NewVehiculeModalComponent {
  private vehiculeService = inject(VehiculeService);

  @Output() saved = new EventEmitter<Vehicule>();
  @Output() close = new EventEmitter<void>();
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  submitting = signal(false);
  uploading = signal(false);
  errorMessage = signal('');
  uploadError = signal('');

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
    modele: [''],
    matricule: [''],
    nChassis: ['', [Validators.required]],
    annee: [null as number | null],
    carburant: ['gasoil'],
    statut: ['in-service' as VehiculeStatut, [Validators.required]],
    dateMiseService: [null as string | null],
    capaciteTonnes: [null as number | null],
    configAxle: ['4x2' as '4x2' | '6x4' | 'plateau-2x2' | null],
    photoUrl: ['' as string | null],
  });

  carburantOptions = [
    { value: 'gasoil',     label: 'Gasoil' },
    { value: 'essence',    label: 'Essence' },
    { value: 'electrique', label: 'Électrique' },
    { value: 'hybride',    label: 'Hybride' },
  ];

  onPhotoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.vehiculeService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.form.patchValue({ photoUrl: res.url });
        this.uploading.set(false);
      },
      error: (err: any) => {
        this.uploadError.set(err?.error?.error || 'Erreur lors du téléversement de la photo.');
        this.uploading.set(false);
      },
    });
  }

  onPhotoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

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
      matricule: formValue.matricule || null,
      nChassis: formValue.nChassis || null,
      annee: formValue.annee,
      carburant: formValue.carburant || 'gasoil',
      statut: formValue.statut,
      dateMiseService: formValue.dateMiseService,
      photoUrl: formValue.photoUrl || null,
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
      error: (err: any) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || err?.error?.message || 'Erreur lors de la création du véhicule.');
      },
    });
  }
}