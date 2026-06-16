import { Component, EventEmitter, Input, Output, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { ModalShellComponent } from '../../../shared/ui';
import { MagasinApiService } from '../services/magasin-api.service';
import { Arrivage, ArrivagePayload } from '../models/magasin.model';

@Component({
  selector: 'app-arrivage-form-modal',
  standalone: true,
  imports: [FormsModule, DecimalPipe, ModalShellComponent],
  template: `
    <app-modal-shell
      [isVisible]="true"
      [modalTitle]="arrivage ? 'Modifier l\\'arrivage' : 'Nouvel arrivage de gasoil'"
      modalMaxWidth="520px"
      (onClose)="cancelled.emit()">

      <form class="arrivage-form" (ngSubmit)="save()">
        <div class="form-grid">
          <label class="field">
            <span class="field-label">Date <b class="req">*</b></span>
            <input type="date" [(ngModel)]="dateArrivage" name="dateArrivage" required class="input" />
          </label>

          <label class="field">
            <span class="field-label">N° bon de livraison</span>
            <input type="text" [(ngModel)]="numeroBl" name="numeroBl" class="input" />
          </label>

          <label class="field">
            <span class="field-label">Quantité (L) <b class="req">*</b></span>
            <input type="number" step="0.01" min="0.01" [ngModel]="quantiteLitres()" (ngModelChange)="quantiteLitres.set($event)"
                   name="quantiteLitres" required class="input input--qty" placeholder="16000" />
          </label>

          <label class="field">
            <span class="field-label">Prix unitaire HT (DH/L)</span>
            <input type="number" step="0.0001" min="0" [ngModel]="prixUnitaireHt()" (ngModelChange)="prixUnitaireHt.set($event)"
                   name="prixUnitaireHt" class="input" />
          </label>

          <label class="field">
            <span class="field-label">Fournisseur</span>
            <input type="text" [(ngModel)]="fournisseur" name="fournisseur" class="input" />
          </label>

          <div class="field">
            <span class="field-label">Valeur HT</span>
            <span class="valeur-display">
              {{ valeurHt() !== null ? ((valeurHt() | number:'1.2-2') + ' DH') : '—' }}
            </span>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-ghost" (click)="cancelled.emit()">Annuler</button>
          <button type="submit" class="btn-primary" [disabled]="saving() || !dateArrivage || !quantiteLitres()">
            {{ saving() ? 'Enregistrement…' : (arrivage ? 'Enregistrer' : 'Ajouter l\\'arrivage') }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .arrivage-form { padding: 20px 24px 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted, #6B7280);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .req { color: #EF4444; }
    .input {
      height: 38px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      padding: 0 12px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text, #111827);
      outline: none;
      transition: border-color 150ms;
    }
    .input:focus { border-color: var(--color-primary, #F7941D); }
    .input--qty { font-family: 'JetBrains Mono', monospace; font-weight: 700; }
    .valeur-display {
      height: 38px;
      display: flex;
      align-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      color: var(--color-primary, #F7941D);
    }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
    .btn-ghost {
      height: 38px; padding: 0 16px; border-radius: 8px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: transparent;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600;
      color: var(--color-text-muted, #6B7280); cursor: pointer;
    }
    .btn-primary {
      height: 38px; padding: 0 18px; border-radius: 8px; border: none;
      background: var(--color-primary, #F7941D); color: #fff;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: filter 150ms;
    }
    .btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ArrivageFormModalComponent implements OnInit {
  @Input() arrivage: Arrivage | null = null;
  @Output() saved = new EventEmitter<Arrivage>();
  @Output() cancelled = new EventEmitter<void>();

  private api = inject(MagasinApiService);
  private toastr = inject(ToastrService);

  dateArrivage = new Date().toISOString().slice(0, 10);
  numeroBl = '';
  fournisseur = '';
  quantiteLitres = signal<number | null>(null);
  prixUnitaireHt = signal<number | null>(null);
  saving = signal(false);

  valeurHt = computed(() => {
    const q = this.quantiteLitres();
    const pu = this.prixUnitaireHt();
    return q !== null && pu !== null ? Math.round(q * pu * 100) / 100 : null;
  });

  ngOnInit(): void {
    if (this.arrivage) {
      this.dateArrivage = this.arrivage.dateArrivage;
      this.numeroBl = this.arrivage.numeroBl ?? '';
      this.fournisseur = this.arrivage.fournisseur ?? '';
      this.quantiteLitres.set(this.arrivage.quantiteLitres);
      this.prixUnitaireHt.set(this.arrivage.prixUnitaireHt);
    }
  }

  save(): void {
    if (!this.dateArrivage || !this.quantiteLitres()) return;
    this.saving.set(true);
    const payload: ArrivagePayload = {
      dateArrivage: this.dateArrivage,
      numeroBl: this.numeroBl.trim() || null,
      quantiteLitres: this.quantiteLitres()!,
      prixUnitaireHt: this.prixUnitaireHt(),
      fournisseur: this.fournisseur.trim() || null,
    };
    const req$ = this.arrivage
      ? this.api.updateArrivage(this.arrivage.id, payload)
      : this.api.createArrivage(payload);
    req$.subscribe({
      next: a => {
        this.saving.set(false);
        this.toastr.success(this.arrivage ? 'Arrivage modifié' : 'Arrivage enregistré');
        this.saved.emit(a);
      },
      error: () => this.saving.set(false),
    });
  }
}
