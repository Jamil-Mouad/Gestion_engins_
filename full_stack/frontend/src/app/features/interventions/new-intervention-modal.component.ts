import { Component, inject, signal, Input, Output, EventEmitter, DestroyRef, OnInit, ViewChild, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, catchError, of } from 'rxjs';
import { InterventionService } from './intervention.service';
import { Intervention, NewInterventionForm, InterventionCategorie } from '../../shared/models/intervention.model';
import { Vehicule } from '../../shared/models/vehicule.model';
import { VehiculeService } from '../vehicules/vehicule.service';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../shared/directives/double-click-guard.directive';
import { validateImageFile } from '../../shared/utils/validate-image-file';

@Component({
  selector: 'app-new-intervention-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell modalTitle="Nouvelle intervention" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="new-intervention-form">
        <!-- Vehicle picker (hidden when a vehicle is preset, e.g. opened from a vehicle's tab) -->
        @if (presetVehicule) {
          <div class="form-group">
            <label>Véhicule</label>
            <div class="picker-locked">
              <span class="picker-code">{{ presetVehicule.code }}</span>
              <span class="picker-meta">{{ presetVehicule.marque }} {{ presetVehicule.modele }}</span>
            </div>
          </div>
        } @else {
          <div class="form-group">
            <label>Véhicule</label>
            <div class="picker-wrap">
              <input class="picker-input"
                     [value]="vehiculeDisplay()"
                     (input)="onVehiculeSearch($any($event.target).value)"
                     (focus)="showPicker.set(true)"
                     placeholder="Rechercher par code, matricule…"
                     autocomplete="off" />
              @if (showPicker() && vehiculeSuggestions().length > 0) {
                <div class="picker-dropdown">
                  @for (v of vehiculeSuggestions(); track v.id) {
                    <div class="picker-option" (mousedown)="selectVehicule(v)">
                      <span class="picker-code">{{ v.code }}</span>
                      <span class="picker-meta">{{ v.marque }} {{ v.modele }} · {{ v.matricule ?? '—' }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <div class="form-row">
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
            <select formControlName="categorie">
              @for (c of categorieOptions; track c.value) {
                <option [value]="c.value">{{ c.label }}</option>
              }
            </select>
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

        <!-- Photo du bon (preuve / archive) -->
        <div class="form-group">
          <label>Photo du bon (preuve)</label>
          <div class="photo-field">
            <input formControlName="photoUrl" placeholder="https://…/photo.jpg" class="photo-url-input" />
            <span class="photo-sep">ou</span>
            <button type="button" class="btn-upload-photo" (click)="fileInput.click()">
              Choisir un fichier
            </button>
            <input #fileInput type="file" accept="image/*" class="hidden-file-input" (change)="onPhotoFileChange($event)" />
          </div>
          @if (uploadingPhoto()) {
            <span class="photo-uploading">Téléversement en cours…</span>
          }
          @if (form.get('photoUrl')?.value) {
            <img [src]="form.get('photoUrl')!.value" alt="Aperçu photo" class="photo-preview" (error)="onPhotoError($event)" />
          }
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
    .form-error { background: #FEE2E2; color: #991B1B; padding: 8px 12px; border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-submit { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-submit:hover { background: var(--color-primary-dark); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    /* Vehicle picker */
    .picker-wrap { position: relative; }
    .picker-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); box-sizing: border-box; }
    .picker-input:focus { outline: none; border-color: var(--color-primary); }
    .picker-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid var(--color-border); border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,.1); z-index: 200; max-height: 220px; overflow-y: auto; }
    .picker-option { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--color-border); }
    .picker-option:last-child { border-bottom: none; }
    .picker-option:hover { background: #F9FAFB; }
    .picker-code { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--color-text); flex-shrink: 0; }
    .picker-meta { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #6B7280; }
    .picker-locked { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface-2, #F9FAFB); }
    /* Photo field */
    .photo-field { display: flex; align-items: center; gap: 8px; }
    .photo-url-input { flex: 1; height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); background: var(--color-surface); }
    .photo-url-input:focus { outline: none; border-color: var(--color-primary); }
    .photo-sep { font-size: 12px; color: var(--color-text-muted); flex-shrink: 0; }
    .btn-upload-photo { height: 36px; padding: 0 12px; background: white; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; cursor: pointer; color: #374151; white-space: nowrap; }
    .btn-upload-photo:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .hidden-file-input { display: none; }
    .photo-uploading { font-size: 12px; color: var(--color-text-muted); font-style: italic; }
    .photo-preview { margin-top: 8px; width: 100%; max-height: 180px; object-fit: cover; border-radius: 6px; display: block; }
  `],
})
export class NewInterventionModalComponent implements OnInit {
  private interventionService = inject(InterventionService);
  private vehiculeService = inject(VehiculeService);
  private destroyRef = inject(DestroyRef);

  /** When set, the vehicle is locked to this one and the picker is hidden. */
  @Input() presetVehicule?: { id: number; code: string; marque?: string; modele?: string };

  @Output() saved = new EventEmitter<Intervention>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  submitting = signal(false);
  uploadingPhoto = signal(false);
  errorMessage = signal('');
  types = signal<{ id: number; libelle: string }[]>([]);

  readonly categorieOptions: { value: InterventionCategorie; label: string }[] = [
    { value: 'corrective', label: 'Corrective' },
    { value: 'preventive', label: 'Préventive' },
    { value: 'depannage',  label: 'Dépannage' },
    { value: 'controle',   label: 'Contrôle' },
  ];

  // Vehicle picker
  vehiculeDisplay = signal('');
  vehiculeSuggestions = signal<Vehicule[]>([]);
  showPicker = signal(false);
  private vehiculeSearch$ = new Subject<string>();

  form = inject(FormBuilder).group({
    vehiculeId: [null as number | null, [Validators.required]],
    typeInterventionId: [null as number | null, [Validators.required]],
    categorie: ['corrective' as InterventionCategorie, [Validators.required]],
    partie: [''],
    nBs: [''],
    dateDebut: ['', [Validators.required]],
    observations: [''],
    photoUrl: [null as string | null],
  });

  constructor() {
    this.interventionService.getTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (types) => this.types.set(types),
      error: (err) => console.error('[NewInterventionModal] Failed to load intervention types', err),
    });

    // Debounced vehicle search
    this.vehiculeSearch$.pipe(
      debounceTime(200),
      switchMap(q => this.vehiculeService.list({ q, size: 8 }, true).pipe(
        catchError(() => of({ content: [] as Vehicule[], totalElements: 0, totalPages: 0, page: 0, size: 8 })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(page => this.vehiculeSuggestions.set(page.content));

    // Seed suggestions on open
    this.vehiculeSearch$.next('');
  }

  ngOnInit(): void {
    if (this.presetVehicule) {
      this.form.patchValue({ vehiculeId: this.presetVehicule.id });
      this.vehiculeDisplay.set(`${this.presetVehicule.code} — ${this.presetVehicule.marque} ${this.presetVehicule.modele}`);
    }
  }

  onVehiculeSearch(q: string): void {
    this.vehiculeDisplay.set(q);
    this.form.patchValue({ vehiculeId: null });
    this.showPicker.set(true);
    this.vehiculeSearch$.next(q);
  }

  selectVehicule(v: Vehicule): void {
    this.vehiculeDisplay.set(`${v.code} — ${v.marque} ${v.modele}`);
    this.form.patchValue({ vehiculeId: v.id });
    this.showPicker.set(false);
  }

  onPhotoFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      this.errorMessage.set(validationError);
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.uploadingPhoto.set(true);
    this.interventionService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.form.patchValue({ photoUrl: res.url });
        this.uploadingPhoto.set(false);
      },
      error: () => {
        this.uploadingPhoto.set(false);
        this.errorMessage.set('Erreur lors du téléversement de la photo.');
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
    const rawDate = formValue.dateDebut;
    const dateFin = rawDate ? new Date(rawDate).toISOString() : '';
    const payload: NewInterventionForm = {
      vehiculeId: formValue.vehiculeId!,
      typeInterventionId: formValue.typeInterventionId!,
      composantId: null,
      categorie: formValue.categorie ?? 'corrective',
      partie: formValue.partie || '',
      nBs: formValue.nBs || '',
      dateDebut: dateFin,
      observations: formValue.observations || '',
      photoUrl: formValue.photoUrl || null,
    };

    this.interventionService.create(payload).subscribe({
      next: (intervention) => {
        this.submitting.set(false);
        this.saved.emit(intervention);
        this.close.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.message ?? err?.error?.error ?? err?.message;
        this.errorMessage.set(msg ?? "Erreur lors de la création de l'intervention.");
      },
    });
  }
}