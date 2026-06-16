import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PneuService } from './pneu.service';
import { Pneu } from '../../shared/models/pneu.model';
import { ModalShellComponent } from '../../shared/ui/modal/modal-shell.component';

@Component({
  selector: 'app-ajouter-pneu-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalShellComponent],
  template: `
    <app-modal-shell modalTitle="Ajouter un pneu" (onClose)="close.emit()">
      <div class="ajouter-modal">

        <!-- Mode toggle — sliding pill (login-style) -->
        <div class="tab-switcher" role="tablist">
          <div aria-hidden="true" class="tab-pill"
               [style.left]="mode() === 'nouveau' ? '4px' : 'calc(50% + 2px)'"></div>
          <button type="button" role="tab" class="tab-btn"
                  [style.fontWeight]="mode() === 'nouveau' ? '700' : '500'"
                  [style.color]="mode() === 'nouveau' ? 'var(--color-text)' : 'var(--color-text-muted)'"
                  (click)="mode.set('nouveau')">Nouveau pneu</button>
          <button type="button" role="tab" class="tab-btn"
                  [style.fontWeight]="mode() === 'existant' ? '700' : '500'"
                  [style.color]="mode() === 'existant' ? 'var(--color-text)' : 'var(--color-text-muted)'"
                  (click)="mode.set('existant'); loadAvailable()">Pneu existant</button>
        </div>

        <!-- Nouveau mode -->
        @if (mode() === 'nouveau') {
          <div class="form-group">
            <label class="form-label">Position <span class="required">*</span></label>
            <input class="form-input" type="number" [(ngModel)]="position"
                   min="1" [max]="maxPosition"
                   placeholder="ex. 1" />
            <span class="form-hint">Positions disponibles : {{ availablePositions.join(', ') || '—' }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">N° série <span class="required">*</span></label>
            <input class="form-input" type="text" [(ngModel)]="nSerie" placeholder="ex. SN-2026-000123" />
            <span class="form-hint">Identifiant unique du pneu — deux pneus ne peuvent pas partager le même N° série.</span>
          </div>

          <div class="form-group">
            <label class="form-label">Référence <span class="required">*</span></label>
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
            <label class="form-label">Durée de vie prévue (km) <span class="required">*</span></label>
            <input class="form-input" type="number" [(ngModel)]="expectedLifeKm"
                   min="1" placeholder="ex. 80000" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Pression (PSI)</label>
              <input class="form-input" type="number" [(ngModel)]="pressionPsi" placeholder="ex. 110" />
            </div>
            <div class="form-group">
              <label class="form-label">Profondeur (32è)</label>
              <input class="form-input" type="number" [(ngModel)]="profondeur32e" placeholder="ex. 25" />
            </div>
          </div>

          @if (error()) {
            <div class="form-error">{{ error() }}</div>
          }

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
            <button type="button" class="btn-confirm"
                    [disabled]="saving() || !position || !expectedLifeKm || !nSerie.trim() || !reference.trim()"
                    (click)="onConfirm()">
              {{ saving() ? 'Ajout en cours…' : 'Ajouter' }}
            </button>
          </div>
        }

        <!-- Existant mode -->
        @if (mode() === 'existant') {
          <div class="form-group">
            <label class="form-label">Pneu à remonter</label>
            @if (loadingAvailable()) {
              <p style="font-size:13px; color: var(--color-text-muted)">Chargement…</p>
            } @else if (availableTires().length === 0) {
              <p style="font-size:13px; color: var(--color-text-muted)">Aucun pneu disponible</p>
            } @else {
              <select class="form-input form-select" (change)="onExistingTireSelect($any($event.target).value)">
                <option value="">— Sélectionner un pneu —</option>
                @for (t of availableTires(); track t.id) {
                  <option [value]="t.id">
                    P{{ t.position }} — {{ t.nSerie ?? '(sans série)' }} {{ t.marque ?? '' }} — {{ t.vehiculeCode }} ({{ t.kmRestant ?? '?' }}km restants)
                  </option>
                }
              </select>
            }
          </div>

          <div class="form-group">
            <label class="form-label">Position cible <span class="required">*</span></label>
            <input class="form-input" type="number" [(ngModel)]="position"
                   min="1" [max]="maxPosition"
                   placeholder="ex. 1" />
            <span class="form-hint">Positions disponibles : {{ availablePositions.join(', ') || '—' }}</span>
          </div>

          @if (error()) {
            <div class="form-error">{{ error() }}</div>
          }

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
            <button type="button" class="btn-confirm"
                    [disabled]="saving() || !selectedExistingTireId() || !position"
                    (click)="onRemonterConfirm()">
              {{ saving() ? 'Remontage en cours…' : 'Remonter' }}
            </button>
          </div>
        }

      </div>
    </app-modal-shell>
  `,
  styles: [`
    .ajouter-modal { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-label { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .required { color: var(--color-danger); }
    .form-input { height: 38px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 12px; font-family: 'Open Sans', sans-serif; font-size: 14px; color: var(--color-text); background: var(--color-surface); outline: none; }
    .form-input:focus { border-color: var(--color-primary); }
    .form-select { height: 38px; cursor: pointer; }
    .form-hint { font-family: 'Open Sans', sans-serif; font-size: 11px; color: var(--color-text-muted); }
    .form-error { font-family: 'Open Sans', sans-serif; font-size: 13px; color: var(--color-danger); padding: 6px 10px; background: #FEF2F2; border-radius: 6px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    .btn-cancel { height: 38px; padding: 0 16px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 500; color: var(--color-text); cursor: pointer; }
    .btn-cancel:hover { background: var(--color-surface-2); }
    .btn-confirm { height: 38px; padding: 0 20px; border: none; border-radius: 8px; background: var(--color-primary); font-family: 'Open Sans', sans-serif; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; }
    .btn-confirm:hover:not(:disabled) { opacity: 0.9; }
    .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
    /* Tab switcher — login-style sliding pill */
    .tab-switcher { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--color-n100, #F3F4F6); border-radius: 10px; padding: 4px; margin-bottom: 4px; }
    .tab-pill { position: absolute; top: 4px; bottom: 4px; width: calc(50% - 6px); border-radius: 6px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,.12); transition: left 320ms cubic-bezier(0.34,1.25,0.64,1); pointer-events: none; z-index: 0; }
    .tab-btn { position: relative; z-index: 1; height: 36px; border: none; background: transparent; font-family: 'Montserrat', sans-serif; font-size: 13px; border-radius: 6px; cursor: pointer; transition: color 200ms; }
  `],
})
export class AjouterPneuModalComponent {
  private pneuService = inject(PneuService);

  @Input({ required: true }) vehiculeId!: number;
  @Input() availablePositions: number[] = [];
  @Input() maxPosition = 10;
  @Input() set initialPosition(value: number | null) {
    if (value != null) this.position = value;
  }

  @Output() saved = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  position: number | null = null;
  nSerie = '';
  reference = '';
  marque = '';
  dateMontage = '';
  expectedLifeKm: number | null = 80000;
  pressionPsi: number | null = null;
  profondeur32e: number | null = null;

  saving = signal(false);
  error = signal<string | null>(null);

  // Mode toggle
  mode = signal<'nouveau' | 'existant'>('nouveau');
  availableTires = signal<Pneu[]>([]);
  selectedExistingTireId = signal<number | null>(null);
  loadingAvailable = signal(false);

  loadAvailable(): void {
    if (this.loadingAvailable()) return;
    this.loadingAvailable.set(true);
    this.pneuService.listAvailable().subscribe({
      next: (tires) => {
        this.availableTires.set(tires);
        this.loadingAvailable.set(false);
      },
      error: () => {
        this.loadingAvailable.set(false);
      },
    });
  }

  onExistingTireSelect(value: string): void {
    this.selectedExistingTireId.set(+value || null);
  }

  onRemonterConfirm(): void {
    const tireId = this.selectedExistingTireId();
    if (!tireId || !this.position) return;
    this.saving.set(true);
    this.error.set(null);
    this.pneuService.remonter(tireId, this.vehiculeId, this.position).subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (err: any) => { this.saving.set(false); this.error.set(err?.error?.error || err?.error?.message || 'Erreur.'); },
    });
  }

  onConfirm(): void {
    if (!this.position || !this.expectedLifeKm || !this.nSerie.trim() || !this.reference.trim()) return;
    this.saving.set(true);
    this.error.set(null);
    this.pneuService.assign(this.vehiculeId, {
      position: this.position,
      nSerie: this.nSerie.trim(),
      reference: this.reference.trim(),
      marque: this.marque || null,
      dateMontage: this.dateMontage || null,
      expectedLifeKm: this.expectedLifeKm,
      pressionPsi: this.pressionPsi,
      profondeur32e: this.profondeur32e ? Number(this.profondeur32e) : null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.error || err?.error?.message || 'Une erreur est survenue.');
      },
    });
  }
}
