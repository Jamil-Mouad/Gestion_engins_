import { Component, inject, signal, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ComposantService } from './composant.service';
import { Composant, ComposantCategorie } from '../../shared/models/composant.model';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../shared/directives/double-click-guard.directive';

export interface ComposantFormContext {
  /** Edit mode: existing composant to edit. */
  composant?: Composant;
  /** Create-child mode: pre-sets parentId + niveau. */
  parent?: { id: number; designation: string; niveau: 1 | 2 };
}

const CATEGORIE_OPTIONS: { value: ComposantCategorie; label: string }[] = [
  { value: 'moteur',        label: 'Moteur' },
  { value: 'pneumatique',   label: 'Pneumatique' },
  { value: 'freinage',      label: 'Freinage' },
  { value: 'hydraulique',   label: 'Hydraulique' },
  { value: 'electrique',    label: 'Électrique' },
  { value: 'transmission',  label: 'Transmission' },
  { value: 'chassis',       label: 'Châssis' },
  { value: 'carrosserie',   label: 'Carrosserie' },
  { value: 'suspension',    label: 'Suspension' },
  { value: 'autre',         label: 'Autre' },
];

@Component({
  selector: 'app-composant-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell [modalTitle]="modalTitle()" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="cfm-form">

        @if (ctx.parent) {
          <div class="cfm-parent-info">
            Sous-composant de : <strong>{{ ctx.parent.designation }}</strong>
          </div>
        }

        <div class="form-row">
          <div class="form-group">
            <label>Désignation <span class="req">*</span></label>
            <input formControlName="designation" placeholder="Ex: Filtre à huile…" />
          </div>
          <div class="form-group">
            <label>Référence</label>
            <input formControlName="reference" placeholder="Ex: FLT-001" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Catégorie</label>
            <select formControlName="categorie">
              <option value="">— Sélectionner —</option>
              @for (c of categorieOptions; track c.value) {
                <option [value]="c.value">{{ c.label }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>Unité</label>
            <input formControlName="unite" placeholder="Ex: pièce, litre…" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Stock</label>
            <input formControlName="stock" type="number" min="0" placeholder="0" />
          </div>
          <div class="form-group">
            <label>Marque</label>
            <input formControlName="marque" placeholder="Ex: Bosch, Mann…" />
          </div>
        </div>

        <!-- Image (disk upload or URL) -->
        <div class="form-group">
          <label>Image</label>
          <div class="photo-field">
            <input formControlName="imageUrl" placeholder="https://…/image.jpg" class="photo-url-input" />
            <span class="photo-sep">ou</span>
            <button type="button" class="btn-upload-photo" (click)="fileInput.click()">
              Choisir un fichier
            </button>
            <input #fileInput type="file" accept="image/*" class="hidden-file-input" (change)="onPhotoFileChange($event)" />
          </div>
          @if (uploadingPhoto()) {
            <span class="photo-uploading">Téléversement en cours…</span>
          }
          @if (form.get('imageUrl')?.value) {
            <img [src]="form.get('imageUrl')!.value" alt="Aperçu" class="photo-preview" (error)="onPhotoError($event)" />
          }
        </div>

        @if (errorMessage()) {
          <div class="form-error">{{ errorMessage() }}</div>
        }

        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="submit" class="btn-submit"
            [disabled]="form.invalid || submitting()"
            [appDoubleClickGuard]="submitting()">
            {{ submitting() ? 'Enregistrement…' : (ctx.composant ? 'Modifier' : 'Créer') }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .cfm-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .req { color: var(--color-danger, #EF4444); }
    .form-group input, .form-group select { height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--color-primary); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .cfm-parent-info { font-family: 'Open Sans', sans-serif; font-size: 13px; color: #6B7280; background: #F9FAFB; border: 1px solid var(--color-border); border-radius: 6px; padding: 8px 12px; }
    /* Photo */
    .photo-field { display: flex; align-items: center; gap: 8px; }
    .photo-url-input { flex: 1; height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); background: var(--color-surface); }
    .photo-url-input:focus { outline: none; border-color: var(--color-primary); }
    .photo-sep { font-size: 12px; color: var(--color-text-muted); flex-shrink: 0; }
    .btn-upload-photo { height: 36px; padding: 0 12px; background: white; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; cursor: pointer; color: #374151; white-space: nowrap; }
    .btn-upload-photo:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .hidden-file-input { display: none; }
    .photo-uploading { font-size: 12px; color: var(--color-text-muted); font-style: italic; }
    .photo-preview { margin-top: 8px; width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; display: block; }
    /* Error / actions */
    .form-error { background: #FEE2E2; color: #991B1B; padding: 8px 12px; border-radius: var(--radius-sm); font-family: 'Open Sans', sans-serif; font-size: 13px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel { background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; cursor: pointer; color: var(--color-text-muted); }
    .btn-submit { background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 20px; font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-submit:hover:not(:disabled) { opacity: 0.9; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ComposantFormModalComponent implements OnChanges {
  private composantService = inject(ComposantService);

  /** Provide either `composant` (edit) or `parent` (create child), or neither (create root). */
  @Input() ctx: ComposantFormContext = {};
  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  submitting = signal(false);
  uploadingPhoto = signal(false);
  errorMessage = signal('');

  readonly categorieOptions = CATEGORIE_OPTIONS;

  form = inject(FormBuilder).group({
    designation: ['', [Validators.required]],
    reference:   [null as string | null],
    categorie:   [null as string | null],
    unite:       [null as string | null],
    stock:       [0],
    marque:      [null as string | null],
    imageUrl:    [null as string | null],
  });

  modalTitle(): string {
    if (this.ctx.composant) return 'Modifier le composant';
    if (this.ctx.parent) return `Nouveau sous-composant (${this.ctx.parent.designation})`;
    return 'Nouveau composant';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ctx'] && this.ctx.composant) {
      const c = this.ctx.composant;
      this.form.patchValue({
        designation: c.designation,
        reference:   c.reference,
        categorie:   c.categorie,
        unite:       c.unite,
        stock:       c.stock ?? 0,
        marque:      c.marque,
        imageUrl:    c.imageUrl,
      });
    }
  }

  onPhotoFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingPhoto.set(true);
    this.composantService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.form.patchValue({ imageUrl: res.url });
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

    const v = this.form.value;
    const payload: Partial<Composant> = {
      designation: v.designation!,
      reference:   v.reference || null,
      categorie:   (v.categorie as ComposantCategorie | null) || null,
      unite:       v.unite || null,
      stock:       v.stock ?? 0,
      marque:      v.marque || null,
      imageUrl:    v.imageUrl || null,
    };

    const isEdit = !!this.ctx.composant;
    if (!isEdit) {
      // Set parent + niveau for create-child
      if (this.ctx.parent) {
        payload['parentId' as keyof typeof payload] = this.ctx.parent.id as any;
        payload['niveau' as keyof typeof payload] = (this.ctx.parent.niveau + 1) as any;
      } else {
        payload['niveau' as keyof typeof payload] = 1 as any;
      }
    }

    const obs = isEdit
      ? this.composantService.update(this.ctx.composant!.id, payload)
      : this.composantService.create(payload);

    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.error ?? err?.error?.message ?? err?.message;
        this.errorMessage.set(msg ?? 'Erreur lors de l\'enregistrement.');
      },
    });
  }
}
