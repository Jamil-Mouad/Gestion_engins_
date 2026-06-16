import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { PageHeaderComponent, SkeletonComponent } from '../../../shared/ui';
import { AuthService } from '../../../core/auth/auth.service';
import { MagasinApiService } from '../services/magasin-api.service';
import { BaremeRow, Citerne, ImportGasoilReport } from '../models/magasin.model';

interface EditableRow {
  hauteurCm: number | null;
  litres: number | null;
}

@Component({
  selector: 'app-magasin-config',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SkeletonComponent],
  template: `
    <div class="magasin-page" style="animation: screenEnter 400ms ease both">
      <app-page-header title="Configuration citerne" />

      <div class="magasin-content">
        @if (loading()) {
          <app-skeleton [rows]="4" height="80px" />
        } @else {
          <div class="grid-2">

            <!-- Citerne config -->
            <div class="card">
              <div class="card-title">Citerne</div>
              <form class="config-form" (ngSubmit)="saveCiterne()">
                <label class="field">
                  <span class="field-label">Nom</span>
                  <input type="text" [(ngModel)]="nom" name="nom" class="input" />
                </label>
                <label class="field">
                  <span class="field-label">Capacité (L)</span>
                  <input type="number" step="1" min="1" [(ngModel)]="capaciteLitres" name="capaciteLitres" required class="input input--qty" />
                </label>
                <label class="field">
                  <span class="field-label">Densité (kg/L)</span>
                  <input type="number" step="0.001" min="0.5" max="1.2" [(ngModel)]="densiteKgParLitre" name="densiteKgParLitre" required class="input input--qty" />
                </label>
                <label class="field">
                  <span class="field-label">Hauteur max (cm)</span>
                  <input type="number" step="0.1" min="0" [(ngModel)]="hauteurMaxCm" name="hauteurMaxCm" class="input input--qty" />
                </label>
                <label class="field">
                  <span class="field-label">Stock initial (L)</span>
                  <input type="number" step="0.01" min="0" [(ngModel)]="stockInitialLitres" name="stockInitialLitres" required class="input input--qty" />
                </label>
                <label class="field">
                  <span class="field-label">Date du stock initial</span>
                  <input type="date" [(ngModel)]="stockInitialDate" name="stockInitialDate" required class="input" />
                </label>
                <button type="submit" class="btn-primary" [disabled]="savingCiterne()">
                  {{ savingCiterne() ? 'Enregistrement…' : 'Enregistrer la citerne' }}
                </button>
              </form>
            </div>

            <!-- Right column: barème + import -->
            <div class="col-stack">

              <!-- Barème -->
              <div class="card">
                <div class="card-title">
                  Barème de jaugeage (cm → litres)
                  <span class="card-subtitle">Interpolation linéaire entre les lignes</span>
                </div>

                <div class="bareme-grid">
                  <div class="bareme-head">
                    <span>Hauteur (cm)</span>
                    <span>Litres</span>
                    <span></span>
                  </div>
                  @for (row of rows(); track $index; let i = $index) {
                    <div class="bareme-row">
                      <input type="number" step="0.1" min="0" class="input input--qty"
                             [ngModel]="row.hauteurCm" (ngModelChange)="updateRow(i, 'hauteurCm', $event)"
                             [name]="'h' + i" />
                      <input type="number" step="0.01" min="0" class="input input--qty"
                             [ngModel]="row.litres" (ngModelChange)="updateRow(i, 'litres', $event)"
                             [name]="'l' + i" />
                      <button type="button" class="icon-btn icon-btn--danger" (click)="removeRow(i)">×</button>
                    </div>
                  }
                </div>

                <div class="bareme-actions">
                  <button type="button" class="btn-ghost" (click)="addRow()">+ Ajouter une ligne</button>
                  <button type="button" class="btn-primary" [disabled]="savingBareme()" (click)="saveBareme()">
                    {{ savingBareme() ? 'Enregistrement…' : 'Enregistrer le barème' }}
                  </button>
                </div>
              </div>

              <!-- Import historique (ADMIN only) -->
              @if (isAdmin()) {
                <div class="card">
                  <div class="card-title">
                    Import historique — GASOIL
                    <span class="card-subtitle">Ré-exécutable : remplace les données importées précédemment, les saisies manuelles sont conservées</span>
                  </div>
                  <div class="import-row">
                    <input #fileInput type="file" accept=".xlsx" class="file-input" (change)="onFileSelected($event)" />
                    <button type="button" class="btn-primary" [disabled]="!selectedFile() || importing()" (click)="runImport()">
                      {{ importing() ? 'Import en cours…' : 'Importer le fichier' }}
                    </button>
                  </div>
                  @if (importReport(); as rep) {
                    <div class="import-report">
                      <div class="ir-line">{{ rep.sortiesImportees }} sorties et {{ rep.arrivagesImportes }} arrivages importés
                        ({{ rep.lignesIgnorees }} lignes ignorées, {{ rep.sortiesSupprimees + rep.arrivagesSupprimes }} anciennes lignes remplacées)</div>
                      @if (unresolvedCodes().length > 0) {
                        <div class="ir-line ir-line--warn">Codes sans véhicule :
                          @for (c of unresolvedCodes(); track c.code; let last = $last) {
                            <span class="ir-code">{{ c.code }} (×{{ c.count }})</span>@if (!last) {, }
                          }
                        </div>
                      }
                      @for (a of rep.anomalies; track $index) {
                        <div class="ir-line ir-line--warn">{{ a }}</div>
                      }
                    </div>
                  }
                </div>
              }

            </div>

          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes screenEnter { from { opacity: 0; } to { opacity: 1; } }
    .magasin-page { background: #F5F5F5; min-height: calc(100vh - 88px); }
    .magasin-content { padding: 20px 32px 40px; }
    .grid-2 { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: start; }
    @media (max-width: 1000px) { .grid-2 { grid-template-columns: 1fr; } }
    .col-stack { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
    .card {
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    }
    .card-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #111827);
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .card-subtitle {
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      font-weight: 400;
      color: #9CA3AF;
    }
    .config-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted, #6B7280);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .input {
      height: 38px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      padding: 0 12px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      outline: none;
      transition: border-color 150ms;
    }
    .input:focus { border-color: var(--color-primary, #F7941D); }
    .input--qty { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    .bareme-grid { display: flex; flex-direction: column; gap: 8px; max-height: 480px; overflow-y: auto; padding-right: 4px; }
    .bareme-head {
      display: grid;
      grid-template-columns: 1fr 1fr 36px;
      gap: 10px;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0 2px;
    }
    .bareme-row { display: grid; grid-template-columns: 1fr 1fr 36px; gap: 10px; align-items: center; }
    .bareme-actions { display: flex; justify-content: space-between; margin-top: 16px; gap: 10px; }
    .icon-btn {
      width: 36px; height: 38px;
      border-radius: 8px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: white;
      cursor: pointer;
      font-size: 13px;
      color: #9CA3AF;
    }
    .icon-btn--danger:hover { background: #FEF2F2; border-color: #FCA5A5; color: #EF4444; }
    .btn-primary {
      height: 38px; padding: 0 18px; border-radius: 8px; border: none;
      background: var(--color-primary, #F7941D); color: #fff;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost {
      height: 38px; padding: 0 16px; border-radius: 8px;
      border: 1px dashed var(--color-border, #D1D5DB);
      background: transparent;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600;
      color: var(--color-text-muted, #6B7280);
      cursor: pointer;
    }
    .btn-ghost:hover { border-color: var(--color-primary, #F7941D); color: var(--color-primary, #F7941D); }
    .import-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .file-input {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #374151;
    }
    .import-report {
      margin-top: 14px;
      background: #F9FAFB;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 240px;
      overflow-y: auto;
    }
    .ir-line { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #065F46; }
    .ir-line--warn { color: #92400E; }
    .ir-code { font-family: 'JetBrains Mono', monospace; font-weight: 700; }
  `],
})
export class MagasinConfigComponent {
  private api = inject(MagasinApiService);
  private toastr = inject(ToastrService);
  private auth = inject(AuthService);

  isAdmin = computed(() => this.auth.user()?.role === 'ADMIN');

  loading = signal(true);
  savingCiterne = signal(false);
  savingBareme = signal(false);
  rows = signal<EditableRow[]>([]);
  selectedFile = signal<File | null>(null);
  importing = signal(false);
  importReport = signal<ImportGasoilReport | null>(null);

  unresolvedCodes = computed(() =>
    Object.entries(this.importReport()?.codesNonResolus ?? {})
      .map(([code, count]) => ({ code, count })));

  nom = '';
  capaciteLitres: number | null = null;
  densiteKgParLitre: number | null = null;
  hauteurMaxCm: number | null = null;
  stockInitialLitres: number | null = null;
  stockInitialDate = '';

  constructor() {
    this.api.getCiterne().subscribe({
      next: c => {
        this.applyCiterne(c);
        this.api.getBareme().subscribe({
          next: bareme => {
            this.rows.set(bareme.map(r => ({ hauteurCm: r.hauteurCm, litres: r.litres })));
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  private applyCiterne(c: Citerne): void {
    this.nom = c.nom;
    this.capaciteLitres = c.capaciteLitres;
    this.densiteKgParLitre = c.densiteKgParLitre;
    this.hauteurMaxCm = c.hauteurMaxCm;
    this.stockInitialLitres = c.stockInitialLitres;
    this.stockInitialDate = c.stockInitialDate;
  }

  updateRow(index: number, field: keyof EditableRow, value: number | null): void {
    this.rows.update(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  addRow(): void {
    this.rows.update(rows => [...rows, { hauteurCm: null, litres: null }]);
  }

  removeRow(index: number): void {
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  saveCiterne(): void {
    if (this.capaciteLitres === null || this.densiteKgParLitre === null
        || this.stockInitialLitres === null || !this.stockInitialDate) {
      return;
    }
    this.savingCiterne.set(true);
    this.api.updateCiterne({
      nom: this.nom.trim() || 'Citerne gasoil',
      capaciteLitres: this.capaciteLitres,
      densiteKgParLitre: this.densiteKgParLitre,
      hauteurMaxCm: this.hauteurMaxCm,
      stockInitialLitres: this.stockInitialLitres,
      stockInitialDate: this.stockInitialDate,
    }).subscribe({
      next: c => {
        this.savingCiterne.set(false);
        this.applyCiterne(c);
        this.toastr.success('Citerne mise à jour');
      },
      error: () => this.savingCiterne.set(false),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  runImport(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.importing.set(true);
    this.importReport.set(null);
    this.api.importGasoil(file).subscribe({
      next: rep => {
        this.importing.set(false);
        this.importReport.set(rep);
        this.toastr.success(`${rep.sortiesImportees} sorties et ${rep.arrivagesImportes} arrivages importés`);
      },
      error: () => this.importing.set(false),
    });
  }

  saveBareme(): void {
    const valid = this.rows()
      .filter((r): r is { hauteurCm: number; litres: number } =>
        r.hauteurCm !== null && r.litres !== null)
      .sort((a, b) => a.hauteurCm - b.hauteurCm);
    this.savingBareme.set(true);
    this.api.replaceBareme(valid).subscribe({
      next: (bareme: BaremeRow[]) => {
        this.savingBareme.set(false);
        this.rows.set(bareme.map(r => ({ hauteurCm: r.hauteurCm, litres: r.litres })));
        this.toastr.success('Barème enregistré');
      },
      error: () => this.savingBareme.set(false),
    });
  }
}
