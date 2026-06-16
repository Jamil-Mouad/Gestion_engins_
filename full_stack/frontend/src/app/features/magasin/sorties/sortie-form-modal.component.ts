import { Component, EventEmitter, Input, Output, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ModalShellComponent } from '../../../shared/ui';
import { MagasinApiService } from '../services/magasin-api.service';
import { Sortie, SortiePayload, TypeMouvement, VehiculeSuggest } from '../models/magasin.model';

@Component({
  selector: 'app-sortie-form-modal',
  standalone: true,
  imports: [FormsModule, DecimalPipe, ModalShellComponent],
  template: `
    <app-modal-shell
      [isVisible]="true"
      [modalTitle]="sortie ? 'Modifier la sortie' : 'Nouvelle sortie carburant'"
      modalMaxWidth="640px"
      (onClose)="cancelled.emit()">

      <form class="sortie-form" (ngSubmit)="save()">

        <div class="form-grid">
          <label class="field">
            <span class="field-label">Date <b class="req">*</b></span>
            <input type="date" [(ngModel)]="dateSortie" name="dateSortie" required class="input" />
          </label>

          <label class="field">
            <span class="field-label">Type</span>
            <select [(ngModel)]="typeMouvement" name="typeMouvement" class="input">
              <option value="SORTIE">Sortie</option>
              <option value="RETOUR">Retour (carburant rendu)</option>
            </select>
          </label>

          <label class="field field--rel">
            <span class="field-label">Véhicule (code)</span>
            <input type="text" [ngModel]="vehiculeQuery()" (ngModelChange)="onVehiculeInput($event)"
                   name="vehiculeCode" class="input" placeholder="480, 435…" autocomplete="off" />
            @if (vehiculeSuggestions().length > 0) {
              <div class="suggest-list">
                @for (v of vehiculeSuggestions(); track v.id) {
                  <button type="button" class="suggest-item" (click)="pickVehicule(v)">
                    <span class="suggest-code">{{ v.code }}</span>
                    <span class="suggest-meta">{{ v.type }} · {{ v.marque }} {{ v.matricule }}</span>
                  </button>
                }
              </div>
            }
            @if (pickedVehicule(); as v) {
              <span class="picked">{{ v.code }} — {{ v.type }} {{ v.marque ?? '' }}</span>
            }
          </label>

          <label class="field field--rel">
            <span class="field-label">Destination <b class="req">*</b></span>
            <input type="text" [ngModel]="destination()" (ngModelChange)="onDestinationInput($event)"
                   name="destination" required class="input" placeholder="VOLVO 22299A73, LINDE…" autocomplete="off" />
            @if (destinationSuggestions().length > 0) {
              <div class="suggest-list">
                @for (d of destinationSuggestions(); track d) {
                  <button type="button" class="suggest-item" (click)="pickDestination(d)">{{ d }}</button>
                }
              </div>
            }
          </label>

          <label class="field">
            <span class="field-label">Totaliseur pompe</span>
            <input type="number" step="0.01" [ngModel]="totaliseur()" (ngModelChange)="onTotaliseurInput($event)"
                   name="totaliseur" class="input" />
            @if (lastTotaliseur() !== null) {
              <span class="hint">Précédent : {{ lastTotaliseur() | number:'1.0-2' }}</span>
            }
          </label>

          <label class="field">
            <span class="field-label">Quantité (L) <b class="req">*</b></span>
            <input type="number" step="0.01" min="0.01" [(ngModel)]="quantiteLitres" name="quantiteLitres"
                   required class="input input--qty" />
            @if (qtyDerived()) {
              <span class="hint hint--ok">Dérivée du totaliseur (modifiable)</span>
            }
            @if (negativeDelta()) {
              <span class="hint hint--warn">Totaliseur inférieur au précédent</span>
            }
          </label>

          <label class="field">
            <span class="field-label">Compteur véhicule (km)</span>
            <input type="number" step="0.01" [(ngModel)]="compteur" name="compteur" class="input" />
          </label>

          <label class="field">
            <span class="field-label">Demandeur</span>
            <input type="text" [(ngModel)]="demandeur" name="demandeur" class="input" />
          </label>

          <label class="field">
            <span class="field-label">N° bon de sortie</span>
            <input type="text" [(ngModel)]="numeroBs" name="numeroBs" class="input" />
          </label>

          <label class="field field--check">
            <input type="checkbox" [(ngModel)]="tiers" name="tiers" />
            <span class="field-label" style="margin:0">Tiers (externe à la flotte)</span>
          </label>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-ghost" (click)="cancelled.emit()">Annuler</button>
          <button type="submit" class="btn-primary" [disabled]="saving() || !dateSortie || !destination() || !quantiteLitres">
            {{ saving() ? 'Enregistrement…' : (sortie ? 'Enregistrer' : 'Ajouter la sortie') }}
          </button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .sortie-form { padding: 20px 24px 24px; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 18px;
    }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field--rel { position: relative; }
    .field--check { flex-direction: row; align-items: center; gap: 8px; }
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
      background: var(--color-surface, #fff);
      outline: none;
      transition: border-color 150ms;
    }
    .input:focus { border-color: var(--color-primary, #F7941D); }
    .input--qty { font-family: 'JetBrains Mono', monospace; font-weight: 700; }
    .hint { font-family: 'Open Sans', sans-serif; font-size: 11px; color: #9CA3AF; }
    .hint--ok { color: #059669; }
    .hint--warn { color: #D97706; font-weight: 600; }
    .picked { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #059669; }
    .suggest-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 20;
      max-height: 200px;
      overflow-y: auto;
    }
    .suggest-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
    }
    .suggest-item:hover { background: var(--color-primary-soft, #FEF3E2); }
    .suggest-code { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; }
    .suggest-meta { font-size: 11px; color: #9CA3AF; }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 22px;
    }
    .btn-ghost {
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: transparent;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-muted, #6B7280);
      cursor: pointer;
    }
    .btn-primary {
      height: 38px;
      padding: 0 18px;
      border-radius: 8px;
      border: none;
      background: var(--color-primary, #F7941D);
      color: #fff;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: filter 150ms;
    }
    .btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class SortieFormModalComponent implements OnInit {
  /** When set, the modal edits this sortie; otherwise it creates one. */
  @Input() sortie: Sortie | null = null;
  @Output() saved = new EventEmitter<Sortie>();
  @Output() cancelled = new EventEmitter<void>();

  private api = inject(MagasinApiService);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  dateSortie = new Date().toISOString().slice(0, 10);
  typeMouvement: TypeMouvement = 'SORTIE';
  quantiteLitres: number | null = null;
  compteur: number | null = null;
  demandeur = '';
  numeroBs = '';
  tiers = false;

  destination = signal('');
  totaliseur = signal<number | null>(null);
  lastTotaliseur = signal<number | null>(null);
  vehiculeQuery = signal('');
  pickedVehicule = signal<VehiculeSuggest | null>(null);
  vehiculeSuggestions = signal<VehiculeSuggest[]>([]);
  destinationSuggestions = signal<string[]>([]);
  saving = signal(false);
  qtyDerived = signal(false);

  negativeDelta = computed(() => {
    const t = this.totaliseur();
    const last = this.lastTotaliseur();
    return t !== null && last !== null && t < last;
  });

  private vehiculeQuery$ = new Subject<string>();
  private destinationQuery$ = new Subject<string>();

  ngOnInit(): void {
    if (this.sortie) {
      const s = this.sortie;
      this.dateSortie = s.dateSortie;
      this.typeMouvement = s.typeMouvement;
      this.quantiteLitres = s.quantiteLitres;
      this.compteur = s.compteur;
      this.demandeur = s.demandeur ?? '';
      this.numeroBs = s.numeroBs ?? '';
      this.tiers = s.tiers;
      this.destination.set(s.destination);
      this.totaliseur.set(s.totaliseur);
      this.vehiculeQuery.set(s.vehiculeCode ?? '');
    } else {
      this.api.lastTotaliseur().subscribe({
        next: res => this.lastTotaliseur.set(res.totaliseur),
        error: () => {},
      });
    }

    this.vehiculeQuery$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => q.length >= 1 ? this.api.suggestVehicules(q) : of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => this.vehiculeSuggestions.set(list));

    this.destinationQuery$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => q.length >= 2 ? this.api.suggestDestinations(q) : of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => this.destinationSuggestions.set(list));
  }

  onVehiculeInput(value: string): void {
    this.vehiculeQuery.set(value);
    this.pickedVehicule.set(null);
    this.vehiculeQuery$.next(value.trim());
  }

  pickVehicule(v: VehiculeSuggest): void {
    this.pickedVehicule.set(v);
    this.vehiculeQuery.set(v.code);
    this.vehiculeSuggestions.set([]);
    if (!this.destination()) {
      this.destination.set(`${v.marque ?? ''} ${v.matricule ?? ''}`.trim());
    }
  }

  onDestinationInput(value: string): void {
    this.destination.set(value);
    this.destinationQuery$.next(value.trim());
  }

  pickDestination(d: string): void {
    this.destination.set(d);
    this.destinationSuggestions.set([]);
  }

  onTotaliseurInput(value: number | null): void {
    this.totaliseur.set(value);
    const last = this.lastTotaliseur();
    if (value !== null && last !== null && value > last) {
      this.quantiteLitres = Math.round((value - last) * 100) / 100;
      this.qtyDerived.set(true);
    } else {
      this.qtyDerived.set(false);
    }
  }

  save(): void {
    if (!this.dateSortie || !this.destination() || !this.quantiteLitres) return;
    this.saving.set(true);
    const payload: SortiePayload = {
      dateSortie: this.dateSortie,
      totaliseur: this.totaliseur(),
      quantiteLitres: this.quantiteLitres,
      typeMouvement: this.typeMouvement,
      destination: this.destination().trim(),
      vehiculeId: this.pickedVehicule()?.id ?? null,
      vehiculeCode: this.vehiculeQuery().trim() || null,
      tiers: this.tiers,
      compteur: this.compteur,
      demandeur: this.demandeur.trim() || null,
      numeroBs: this.numeroBs.trim() || null,
    };
    const req$ = this.sortie
      ? this.api.updateSortie(this.sortie.id, payload)
      : this.api.createSortie(payload);
    req$.subscribe({
      next: s => {
        this.saving.set(false);
        this.toastr.success(this.sortie ? 'Sortie modifiée' : 'Sortie enregistrée');
        this.saved.emit(s);
      },
      error: () => this.saving.set(false),
    });
  }
}
