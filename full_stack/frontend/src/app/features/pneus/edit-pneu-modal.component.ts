import { Component, Input, Output, EventEmitter, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PneuService } from './pneu.service';
import { Pneu } from '../../shared/models/pneu.model';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-edit-pneu-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Modifier le pneu" (onClose)="close.emit()">
      <div class="edit-pneu-modal">

        <div class="form-group">
          <label class="form-label">N° Série</label>
          <input class="form-input" type="text" [(ngModel)]="nSerie" placeholder="ex. SN-2026-000123" />
        </div>

        <div class="form-group">
          <label class="form-label">Référence</label>
          <input class="form-input" type="text" [(ngModel)]="reference" placeholder="ex. MIC-789012" />
        </div>

        <div class="form-group">
          <label class="form-label">Marque</label>
          <input class="form-input" type="text" [(ngModel)]="marque" placeholder="ex. Michelin" />
        </div>

        <div class="form-group">
          <label class="form-label">Date de montage</label>
          <input class="form-input" type="date" [(ngModel)]="dateMontage" />
        </div>

        <div class="form-group">
          <label class="form-label">Durée de vie prévue (km)</label>
          <input class="form-input" type="number" [(ngModel)]="expectedLifeKm" min="1" placeholder="ex. 80000" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Pression (PSI)</label>
            <input class="form-input" type="number" [(ngModel)]="pressionPsi" step="0.1" placeholder="ex. 110" />
          </div>
          <div class="form-group">
            <label class="form-label">Profondeur (32è)</label>
            <input class="form-input" type="number" [(ngModel)]="profondeur32e" step="1" placeholder="ex. 25" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Photo</label>
          <div class="photo-field">
            <input class="form-input photo-url-input" type="text" [(ngModel)]="photoUrl" placeholder="https://…/photo.jpg" />
            <input #fileInput type="file" accept="image/*" class="hidden-file-input" (change)="onPhotoFileChange($event)" />
            <button type="button" class="btn-upload" [disabled]="uploading()" (click)="fileInput.click()">
              {{ uploading() ? '...' : 'Choisir un fichier' }}
            </button>
          </div>
          @if (uploadError()) {
            <span class="upload-error">{{ uploadError() }}</span>
          }
          @if (photoUrl) {
            <img [src]="photoUrl" alt="Aperçu photo" class="photo-preview" (error)="photoUrl = ''" />
          }
        </div>

        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }

        <div class="modal-actions">
          <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
          <button type="button" class="btn-confirm"
                  [disabled]="saving() || !expectedLifeKm"
                  (click)="onConfirm()">
            {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .edit-pneu-modal { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .form-input { height: 38px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 12px; font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .form-input:focus { border-color: var(--color-primary); }
    .form-error { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-danger); padding: 6px 10px; background: #FEF2F2; border-radius: 6px; }
    .photo-field { display: flex; gap: 8px; align-items: center; }
    .photo-url-input { flex: 1; }
    .hidden-file-input { display: none; }
    .btn-upload { height: 38px; padding: 0 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-text); cursor: pointer; white-space: nowrap; flex-shrink: 0; }
    .btn-upload:hover { background: #F9FAFB; }
    .btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }
    .upload-error { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #991B1B; }
    .photo-preview { width: 80px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border); margin-top: 6px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    .btn-cancel { height: 38px; padding: 0 16px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 500; color: var(--color-text); cursor: pointer; }
    .btn-cancel:hover { background: var(--color-surface-2); }
    .btn-confirm { height: 38px; padding: 0 20px; border: none; border-radius: 8px; background: var(--color-primary); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; }
    .btn-confirm:hover:not(:disabled) { opacity: 0.9; }
    .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class EditPneuModalComponent implements OnInit {
  private pneuService = inject(PneuService);

  @Input({ required: true }) pneu!: Pneu;
  @Output() saved = new EventEmitter<Pneu>();
  @Output() close = new EventEmitter<void>();

  nSerie = '';
  reference = '';
  marque = '';
  dateMontage = '';
  expectedLifeKm: number | null = null;
  pressionPsi: number | null = null;
  profondeur32e: number | null = null;
  photoUrl = '';

  saving = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);
  uploadError = signal('');

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.nSerie = this.pneu.nSerie ?? '';
    this.reference = this.pneu.reference ?? '';
    this.marque = this.pneu.marque ?? '';
    this.dateMontage = this.pneu.dateMontage ?? '';
    this.expectedLifeKm = this.pneu.expectedLifeKm ?? null;
    this.pressionPsi = this.pneu.pressionPsi ?? null;
    this.profondeur32e = this.pneu.profondeur32e ?? null;
    this.photoUrl = this.pneu.photoUrl ?? '';
  }

  onPhotoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.pneuService.uploadPhoto(file).subscribe({
      next: (res) => { this.photoUrl = res.url; this.uploading.set(false); },
      error: (err: any) => {
        this.uploadError.set(err?.error?.error || 'Erreur lors du téléversement.');
        this.uploading.set(false);
      },
    });
  }

  onConfirm(): void {
    if (!this.expectedLifeKm) return;
    this.saving.set(true);
    this.error.set(null);
    this.pneuService.update(this.pneu.id, {
      nSerie: this.nSerie || null,
      reference: this.reference || null,
      marque: this.marque || null,
      dateMontage: this.dateMontage || null,
      expectedLifeKm: this.expectedLifeKm,
      pressionPsi: this.pressionPsi,
      profondeur32e: this.profondeur32e ? Number(this.profondeur32e) : null,
      photoUrl: this.photoUrl || null,
    }).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.saved.emit(updated);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.error || err?.error?.message || 'Une erreur est survenue.');
      },
    });
  }
}
