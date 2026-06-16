import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VehiculeService } from '../vehicule.service';
import { Attelage, Vehicule } from '../../../shared/models/vehicule.model';
import { ModalShellComponent } from '../../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-assign-semi-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Atteler une semi-remorque" (onClose)="close.emit()">

      <!-- Mode toggle — sliding pill (same pattern as ajouter-pneu) -->
      <div class="tab-switcher" role="tablist">
        <div aria-hidden="true" class="tab-pill"
             [style.left]="mode() === 'existante' ? '4px' : 'calc(50% + 2px)'"></div>
        <button type="button" role="tab" class="tab-btn"
                [style.fontWeight]="mode() === 'existante' ? '700' : '500'"
                [style.color]="mode() === 'existante' ? 'var(--color-text)' : 'var(--color-text-muted)'"
                (click)="mode.set('existante')">Semi existante</button>
        <button type="button" role="tab" class="tab-btn"
                [style.fontWeight]="mode() === 'creer' ? '700' : '500'"
                [style.color]="mode() === 'creer' ? 'var(--color-text)' : 'var(--color-text-muted)'"
                (click)="mode.set('creer')">Créer une semi-remorque</button>
      </div>

      @if (errorMessage()) {
        <p class="modal-error">{{ errorMessage() }}</p>
      }

      <!-- Existing semi mode -->
      @if (mode() === 'existante') {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-field">
            <label>Semi-remorque</label>
            <select formControlName="semiId">
              <option value="">— Sélectionner —</option>
              @for (s of availableSemis(); track s.id) {
                <option [value]="s.id">{{ s.code }} · {{ s.marque }} {{ s.modele }} ({{ s.matricule ?? '—' }})</option>
              }
            </select>
          </div>

          <div class="form-field">
            <label>Date de début</label>
            <input type="date" formControlName="dateDebut" />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
            <button type="submit" class="btn-submit" [disabled]="submitting() || form.invalid">
              {{ submitting() ? 'En cours…' : 'Atteler' }}
            </button>
          </div>
        </form>
      }

      <!-- Create + attach mode -->
      @if (mode() === 'creer') {
        <form [formGroup]="createForm" (ngSubmit)="submitCreate()">
          <div class="form-field">
            <label>Code <span class="req">*</span></label>
            <input type="text" formControlName="code" placeholder="ex. 438" />
            <span class="hint">Pré-rempli avec le code du tracteur — l'attelage partage un seul code.</span>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Marque <span class="req">*</span></label>
              <input type="text" formControlName="marque" placeholder="ex. FABRINOV" />
            </div>
            <div class="form-field">
              <label>Modèle</label>
              <input type="text" formControlName="modele" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Matricule</label>
              <input type="text" formControlName="matricule" />
            </div>
            <div class="form-field">
              <label>N° châssis <span class="req">*</span></label>
              <input type="text" formControlName="nChassis" placeholder="ex. CF9PC21AXFFBR1949" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>Configuration essieux</label>
              <select formControlName="configAxleSemi">
                <option value="">—</option>
                <option value="plateau-2x2">Plateau 2x2</option>
                <option value="semi-2-essieux">Semi 2 essieux</option>
                <option value="semi-3-essieux">Semi 3 essieux</option>
              </select>
            </div>
            <div class="form-field">
              <label>Date de début d'attelage</label>
              <input type="date" formControlName="dateDebut" />
            </div>
          </div>

          @if (createdSemiId()) {
            <p class="modal-warn">
              La semi-remorque a été créée mais l'attelage a échoué — cliquez sur
              « Réessayer l'attelage » pour le relancer.
            </p>
          }

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
            <button type="submit" class="btn-submit" [disabled]="submitting() || createForm.invalid">
              {{ submitting() ? 'En cours…' : (createdSemiId() ? "Réessayer l'attelage" : 'Créer et atteler') }}
            </button>
          </div>
        </form>
      }
    </app-modal-shell>
  `,
  styles: [`
    .form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; flex: 1; }
    .form-row { display: flex; gap: 12px; }
    .form-field label { font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600; }
    .form-field select, .form-field input { padding: 8px 10px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 14px; }
    .req { color: var(--color-danger); }
    .hint { font-family: 'Open Sans', sans-serif; font-size: 11px; color: var(--color-text-muted); }
    .modal-error { color: var(--color-danger); font-size: 13px; margin-bottom: 12px; }
    .modal-warn { color: #B45309; background: #FFFBEB; border-radius: 6px; padding: 8px 10px; font-size: 13px; margin-bottom: 12px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .tab-switcher { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--color-n100, #F3F4F6); border-radius: 10px; padding: 4px; margin-bottom: 16px; }
    .tab-pill { position: absolute; top: 4px; bottom: 4px; width: calc(50% - 6px); border-radius: 6px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,.12); transition: left 320ms cubic-bezier(0.34,1.25,0.64,1); pointer-events: none; z-index: 0; }
    .tab-btn { position: relative; z-index: 1; height: 36px; border: none; background: transparent; font-family: 'Montserrat', sans-serif; font-size: 13px; border-radius: 6px; cursor: pointer; transition: color 200ms; }
  `],
})
export class AssignSemiModalComponent implements OnInit {
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);

  @Input() tracteurId!: number;
  @Input() tracteurCode: string | null = null;
  @Output() saved = new EventEmitter<Attelage>();
  @Output() close = new EventEmitter<void>();

  availableSemis = signal<Vehicule[]>([]);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  mode = signal<'existante' | 'creer'>('existante');
  // set when the semi was created but the attelage call failed (partial failure)
  createdSemiId = signal<number | null>(null);

  form = this.fb.group({
    semiId:    ['', Validators.required],
    dateDebut: [new Date().toISOString().split('T')[0], Validators.required],
  });

  createForm = this.fb.group({
    code:           ['', Validators.required],
    marque:         ['', Validators.required],
    modele:         [''],
    matricule:      [''],
    nChassis:       ['', Validators.required],
    configAxleSemi: [''],
    dateDebut:      [new Date().toISOString().split('T')[0], Validators.required],
  });

  ngOnInit(): void {
    if (this.tracteurCode) {
      this.createForm.patchValue({ code: this.tracteurCode });
    }
    this.vehiculeService.list({ type: 'semi_remorque', size: 200 }).subscribe({
      next: (page) => this.availableSemis.set(page.content),
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    const { semiId, dateDebut } = this.form.value;
    this.attach(Number(semiId), dateDebut!);
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    const v = this.createForm.value;

    // partial-failure retry: the semi already exists, only redo the attelage
    const existingId = this.createdSemiId();
    if (existingId) {
      this.attach(existingId, v.dateDebut!);
      return;
    }

    this.vehiculeService.create({
      code: v.code!.trim(),
      type: 'semi_remorque',
      marque: v.marque!.trim(),
      modele: v.modele ?? '',
      matricule: v.matricule || null,
      nChassis: v.nChassis!.trim(),
      annee: null,
      carburant: null,
      statut: 'in-service',
      dateMiseService: null,
      configAxleSemi: (v.configAxleSemi || null) as 'plateau-2x2' | 'semi-2-essieux' | 'semi-3-essieux' | null,
    }).subscribe({
      next: (semi) => {
        this.createdSemiId.set(semi.id);
        this.attach(semi.id, v.dateDebut!);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || err?.error?.message || 'Erreur lors de la création de la semi-remorque.');
      },
    });
  }

  private attach(semiId: number, dateDebut: string): void {
    this.vehiculeService.createAttelage(this.tracteurId, semiId, dateDebut).subscribe({
      next: (a) => { this.submitting.set(false); this.saved.emit(a); },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || err?.error?.message || "Erreur lors de l'attelage");
      },
    });
  }
}
