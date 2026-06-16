import { Component, inject, signal, Output, EventEmitter, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, catchError, of } from 'rxjs';
import { DemandeAchatService } from './demande-achat.service';
import { NewDemandeForm, DemandeUrgence } from '../../shared/models/demande-achat.model';
import { Composant } from '../../shared/models/composant.model';
import { ComposantService } from '../composants/composant.service';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';
import { DoubleClickGuardDirective } from '../../shared/directives/double-click-guard.directive';
import { validateImageFile } from '../../shared/utils/validate-image-file';

type DemandeMode = 'composant' | 'piece_libre';

@Component({
  selector: 'app-new-demande-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, DoubleClickGuardDirective],
  template: `
    <app-modal-shell modalTitle="Nouvelle demande d'achat" (onClose)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="ndm-form">

        <!-- Mode toggle -->
        <div class="form-group">
          <label>Type de pièce</label>
          <div class="ndm-toggle">
            <button type="button"
              class="ndm-toggle-btn"
              [class.ndm-toggle-btn--active]="mode() === 'composant'"
              (click)="setMode('composant')">
              Composant catalogue
            </button>
            <button type="button"
              class="ndm-toggle-btn"
              [class.ndm-toggle-btn--active]="mode() === 'piece_libre'"
              (click)="setMode('piece_libre')">
              Pièce libre
            </button>
          </div>
        </div>

        <!-- Composant picker -->
        @if (mode() === 'composant') {
          <div class="form-group">
            <label>Composant</label>
            <div class="picker-wrap">
              <input class="picker-input"
                     [value]="composantDisplay()"
                     (input)="onComposantSearch($any($event.target).value)"
                     (focus)="showPicker.set(true)"
                     (blur)="onPickerBlur()"
                     placeholder="Rechercher par désignation ou référence…"
                     autocomplete="off" />
              @if (showPicker() && composantSuggestions().length > 0) {
                <div class="picker-dropdown">
                  @for (c of composantSuggestions(); track c.id) {
                    <div class="picker-option" (mousedown)="selectComposant(c)">
                      <span class="picker-designation">{{ c.designation }}</span>
                      @if (c.reference) {
                        <span class="picker-ref">{{ c.reference }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Pièce libre input -->
        @if (mode() === 'piece_libre') {
          <div class="form-group">
            <label>Désignation pièce libre</label>
            <input formControlName="pieceLibreCtrl" placeholder="Ex: Joint torique 45mm…" />
          </div>
        }

        <!-- Référence + Quantité -->
        <div class="form-row">
          <div class="form-group">
            <label>Référence</label>
            <input formControlName="reference" placeholder="Réf. pièce ou interne" />
          </div>
          <div class="form-group">
            <label>Quantité <span class="required-star">*</span></label>
            <input formControlName="quantite" type="number" min="1" placeholder="1" />
          </div>
        </div>

        <!-- Urgence -->
        <div class="form-group">
          <label>Urgence</label>
          <select formControlName="urgence">
            <option value="">— Aucune —</option>
            @for (u of urgenceOptions; track u.value) {
              <option [value]="u.value">{{ u.label }}</option>
            }
          </select>
        </div>

        <!-- Demandeur (nom du travailleur) -->
        <div class="form-group">
          <label>Demandeur <span class="required-star">*</span></label>
          <input formControlName="demandeurNom" placeholder="Nom complet du demandeur…" />
        </div>

        <!-- Motif -->
        <div class="form-group">
          <label>Motif</label>
          <textarea formControlName="motif" rows="3" placeholder="Raison de la demande…"></textarea>
        </div>

        <!-- Photo du bon (preuve / archive) -->
        <div class="form-group">
          <label>Photo du bon (preuve)</label>
          <div class="photo-field">
            <input formControlName="photoUrl" placeholder="https://…/photo.jpg" class="photo-url-input" />
            <span class="photo-sep">ou</span>
            <button type="button" class="btn-upload-photo" (click)="photoFileInput.click()">
              Choisir un fichier
            </button>
            <input #photoFileInput type="file" accept="image/png,image/jpeg,image/jpg,image/webp" class="hidden-file-input" (change)="onPhotoFileChange($event)" />
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
          <button type="submit" class="btn-submit"
            [disabled]="!isFormValid() || submitting()"
            [appDoubleClickGuard]="submitting()">
            {{ submitting() ? 'Enregistrement…' : 'Créer la demande' }}
          </button>
        </div>

      </form>
    </app-modal-shell>
  `,
  styles: [`
    .ndm-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .required-star { color: var(--color-danger, #EF4444); }
    .form-group input, .form-group select, .form-group textarea {
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text);
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none;
      border-color: var(--color-primary);
    }
    .form-group textarea { height: auto; padding: 8px 12px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    /* Mode toggle */
    .ndm-toggle {
      display: flex;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .ndm-toggle-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      background: transparent;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .ndm-toggle-btn + .ndm-toggle-btn { border-left: 1px solid var(--color-border); }
    .ndm-toggle-btn--active {
      background: var(--color-primary);
      color: #fff;
      font-weight: 600;
    }

    /* Composant picker */
    .picker-wrap { position: relative; }
    .picker-input {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text);
      box-sizing: border-box;
    }
    .picker-input:focus { outline: none; border-color: var(--color-primary); }
    .picker-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(0,0,0,.1);
      z-index: 200;
      max-height: 220px;
      overflow-y: auto;
    }
    .picker-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--color-border);
    }
    .picker-option:last-child { border-bottom: none; }
    .picker-option:hover { background: #F9FAFB; }
    .picker-designation {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text);
      flex: 1;
    }
    .picker-ref {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    /* Error / actions */
    .form-error {
      background: #FEE2E2;
      color: #991B1B;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
    }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 8px 20px;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      cursor: pointer;
      color: var(--color-text-muted);
    }
    .btn-submit {
      background: var(--color-primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      padding: 8px 20px;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-submit:hover:not(:disabled) { opacity: 0.9; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
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
export class NewDemandeModalComponent {
  private demandeService = inject(DemandeAchatService);
  private composantService = inject(ComposantService);
  private destroyRef = inject(DestroyRef);

  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('photoFileInput') photoFileInputRef!: ElementRef<HTMLInputElement>;

  mode = signal<DemandeMode>('composant');
  submitting = signal(false);
  uploadingPhoto = signal(false);
  errorMessage = signal('');

  // Composant picker state
  composantDisplay = signal('');
  composantSuggestions = signal<Composant[]>([]);
  showPicker = signal(false);
  private selectedComposantId = signal<number | null>(null);
  private composantSearch$ = new Subject<string>();

  readonly urgenceOptions: { value: DemandeUrgence; label: string }[] = [
    { value: 'Haute',   label: 'Haute' },
    { value: 'Moyenne', label: 'Moyenne' },
    { value: 'Basse',   label: 'Basse' },
  ];

  form = inject(FormBuilder).group({
    pieceLibreCtrl: [''],
    reference:      [null as string | null],
    quantite:       [1, [Validators.required, Validators.min(1)]],
    urgence:        [''],
    motif:          [''],
    demandeurNom:   ['', [Validators.required]],
    photoUrl:       [null as string | null],
  });

  constructor() {
    this.composantSearch$.pipe(
      debounceTime(200),
      switchMap(q => this.composantService.search(q).pipe(
        catchError(() => of([] as Composant[])),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(results => this.composantSuggestions.set(results));

    // Seed results on open
    this.composantSearch$.next('');
  }

  setMode(m: DemandeMode): void {
    this.mode.set(m);
    // Reset picker state when switching modes
    this.composantDisplay.set('');
    this.selectedComposantId.set(null);
    this.composantSuggestions.set([]);
    this.form.patchValue({ pieceLibreCtrl: '' });
  }

  onComposantSearch(q: string): void {
    this.composantDisplay.set(q);
    this.selectedComposantId.set(null);
    this.showPicker.set(true);
    this.composantSearch$.next(q);
  }

  selectComposant(c: Composant): void {
    this.composantDisplay.set(c.designation);
    this.selectedComposantId.set(c.id);
    this.showPicker.set(false);
  }

  onPickerBlur(): void {
    // Small delay so mousedown on option fires first
    setTimeout(() => this.showPicker.set(false), 150);
  }

  isFormValid(): boolean {
    const quantite = this.form.value.quantite;
    if (!quantite || quantite < 1) return false;
    if (!(this.form.value.demandeurNom ?? '').trim()) return false;
    if (this.mode() === 'composant') {
      return this.selectedComposantId() !== null;
    }
    return (this.form.value.pieceLibreCtrl ?? '').trim().length > 0;
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
    this.demandeService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.form.patchValue({ photoUrl: res.url });
        this.uploadingPhoto.set(false);
      },
      error: (err) => {
        console.error('Photo upload failed:', err);
        this.uploadingPhoto.set(false);
        const serverMsg: string | undefined = err?.error?.error;
        this.errorMessage.set(serverMsg ?? 'Erreur lors du téléversement de la photo.');
      },
    });
  }

  onPhotoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const v = this.form.value;
    const urgenceVal = v.urgence ? v.urgence as DemandeUrgence : null;

    const payload: NewDemandeForm = {
      composantId:  this.mode() === 'composant' ? this.selectedComposantId() : null,
      pieceLibre:   this.mode() === 'piece_libre' ? (v.pieceLibreCtrl?.trim() ?? null) : null,
      reference:    v.reference ?? null,
      quantite:     v.quantite ?? 1,
      motif:        v.motif ?? '',
      urgence:      urgenceVal,
      demandeurNom: (v.demandeurNom ?? '').trim() || null,
      photoUrl:     v.photoUrl || null,
    };

    this.demandeService.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.error ?? err?.error?.message ?? err?.message;
        this.errorMessage.set(msg ?? 'Erreur lors de la création de la demande.');
      },
    });
  }
}
