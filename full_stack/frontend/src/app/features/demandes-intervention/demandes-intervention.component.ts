import { Component, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PageHeaderComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
  RequestStatusBadgeComponent,
  UrgencyBadgeComponent,
} from '../../shared/ui/index';

export type DemandeInterventionStatut = 'Nouvelle' | 'Approuvée' | 'Rejetée' | 'Clôturée';
export type DemandeInterventionUrgence = 'Haute' | 'Moyenne' | 'Basse';

export interface DemandeIntervention {
  id: number;
  code: string;
  vehiculeCode: string;
  symptome: string;
  urgence: DemandeInterventionUrgence;
  statut: DemandeInterventionStatut;
  dateCreation: string;
  demandeur: { prenom: string; nom: string };
}

@Component({
  selector: 'app-demandes-intervention',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    PageHeaderComponent,
    FilterChipComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
    RequestStatusBadgeComponent,
    UrgencyBadgeComponent,
  ],
  template: `
    <div class="di-screen">
      <app-page-header title="Demandes d'intervention" [count]="newCount()">
        <button class="di-btn-primary" (click)="showNewModal.set(true)">
          + Nouvelle demande
        </button>
      </app-page-header>

      <div class="di-body">
        <!-- Status filter chips -->
        <div class="di-filters">
          <span class="di-filter-label">Statut :</span>
          @for (tab of statusTabs; track tab.value) {
            <app-filter-chip
              [label]="tab.label"
              [active]="activeStatut() === tab.value"
              (clicked)="filterByStatut(tab.value)" />
          }
          <span class="di-filter-label di-filter-label--spaced">Urgence :</span>
          @for (u of urgenceTabs; track u.value) {
            <app-filter-chip
              [label]="u.label"
              [active]="activeUrgence() === u.value"
              (clicked)="filterByUrgence(u.value)" />
          }
        </div>

        <!-- Table card -->
        <div class="di-table-card">
          <app-data-table-header [cols]="tableCols" />

          @if (loading()) {
            <div class="di-loading">
              @for (i of skeletonRows; track i) {
                <div class="di-skeleton-row">
                  <div class="di-skeleton-cell di-skeleton-cell--sm"></div>
                  <div class="di-skeleton-cell di-skeleton-cell--md"></div>
                  <div class="di-skeleton-cell di-skeleton-cell--lg"></div>
                  <div class="di-skeleton-cell di-skeleton-cell--sm"></div>
                  <div class="di-skeleton-cell di-skeleton-cell--xl"></div>
                  <div class="di-skeleton-cell di-skeleton-cell--sm"></div>
                  <div class="di-skeleton-cell di-skeleton-cell--sm"></div>
                  <div class="di-skeleton-cell di-skeleton-cell--md"></div>
                </div>
              }
            </div>
          } @else {
            @for (row of filteredDemandes(); track row.id; let i = $index) {
              <app-data-table-row
                [idx]="i"
                [clickable]="true"
                [alert]="row.urgence === 'Haute' && row.statut === 'Nouvelle'"
                (rowClicked)="selectedDemande.set(row)">
                <div class="dtr-row-inner">
                  <!-- N° / code chip -->
                  <div class="dtr-col dtr-col--code">
                    <span class="di-code-chip">{{ row.code }}</span>
                  </div>
                  <!-- Véhicule -->
                  <div class="dtr-col dtr-col--veh">
                    <span class="di-veh-chip">{{ row.vehiculeCode }}</span>
                  </div>
                  <!-- Demandeur -->
                  <div class="dtr-col dtr-col--demandeur">
                    {{ row.demandeur.prenom }} {{ row.demandeur.nom }}
                  </div>
                  <!-- Symptôme / Description -->
                  <div class="dtr-col dtr-col--symptome">{{ row.symptome }}</div>
                  <!-- Date -->
                  <div class="dtr-col dtr-col--date">
                    {{ row.dateCreation | date:'dd/MM/yyyy' }}
                  </div>
                  <!-- Urgence -->
                  <div class="dtr-col dtr-col--urgence">
                    <app-urgency-badge [level]="toUrgenceKey(row.urgence)" />
                  </div>
                  <!-- Statut -->
                  <div class="dtr-col dtr-col--statut">
                    <app-request-status-badge [status]="toStatusKey(row.statut)" />
                  </div>
                  <!-- Actions -->
                  <div class="dtr-col dtr-col--actions">
                    @if (row.statut === 'Nouvelle') {
                      <button
                        class="di-action-btn di-action-btn--approve"
                        (click)="$event.stopPropagation(); updateStatut(row, 'Approuvée')">
                        Approuver
                      </button>
                      <button
                        class="di-action-btn di-action-btn--reject"
                        (click)="$event.stopPropagation(); updateStatut(row, 'Rejetée')">
                        Rejeter
                      </button>
                    } @else {
                      <span class="di-no-action">—</span>
                    }
                  </div>
                </div>
              </app-data-table-row>
            }

            @if (filteredDemandes().length === 0) {
              <div class="di-empty">
                <span class="di-empty-icon">📋</span>
                <p>Aucune demande d'intervention pour ce filtre.</p>
              </div>
            }
          }
        </div>
      </div>

      <!-- Detail modal -->
      @if (selectedDemande()) {
        <div class="di-modal-backdrop" (click)="selectedDemande.set(null)">
          <div class="di-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
            <div class="di-modal-header">
              <span class="di-modal-title">Détail — {{ selectedDemande()!.code }}</span>
              <button class="di-modal-close" (click)="selectedDemande.set(null)">✕</button>
            </div>
            <div class="di-modal-body">
              <div class="di-frow"><span class="di-frow-label">ID demande</span><span class="di-frow-value di-mono">{{ selectedDemande()!.code }}</span></div>
              <div class="di-frow"><span class="di-frow-label">Date</span><span class="di-frow-value">{{ selectedDemande()!.dateCreation | date:'dd/MM/yyyy' }}</span></div>
              <div class="di-frow"><span class="di-frow-label">Demandeur</span><span class="di-frow-value">{{ selectedDemande()!.demandeur.prenom }} {{ selectedDemande()!.demandeur.nom }}</span></div>
              <div class="di-frow"><span class="di-frow-label">Véhicule</span><span class="di-frow-value di-mono">{{ selectedDemande()!.vehiculeCode }}</span></div>
              <div class="di-frow"><span class="di-frow-label">Urgence</span><span class="di-frow-value"><app-urgency-badge [level]="toUrgenceKey(selectedDemande()!.urgence)" /></span></div>
              <div class="di-frow"><span class="di-frow-label">Statut</span><span class="di-frow-value"><app-request-status-badge [status]="toStatusKey(selectedDemande()!.statut)" /></span></div>
              <div class="di-frow di-frow--block">
                <span class="di-frow-label">Symptôme / Description</span>
                <div class="di-symptome-box">{{ selectedDemande()!.symptome }}</div>
              </div>
            </div>
            <div class="di-modal-footer">
              @if (selectedDemande()!.statut === 'Nouvelle') {
                <button class="di-action-btn di-action-btn--reject" (click)="updateStatut(selectedDemande()!, 'Rejetée'); selectedDemande.set(null)">Rejeter</button>
                <button class="di-action-btn di-action-btn--approve" (click)="updateStatut(selectedDemande()!, 'Approuvée'); selectedDemande.set(null)">Approuver → créer intervention</button>
              } @else {
                <button class="di-btn-secondary" (click)="selectedDemande.set(null)">Fermer</button>
              }
            </div>
          </div>
        </div>
      }

      <!-- New demand modal -->
      @if (showNewModal()) {
        <div class="di-modal-backdrop" (click)="showNewModal.set(false)">
          <div class="di-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
            <div class="di-modal-header">
              <span class="di-modal-title">Nouvelle demande d'intervention</span>
              <button class="di-modal-close" (click)="showNewModal.set(false)">✕</button>
            </div>
            <div class="di-modal-body">
              <div class="di-form-group">
                <label class="di-form-label">Véhicule *</label>
                <input
                  class="di-form-input"
                  [(ngModel)]="newVehicule"
                  placeholder="ex: CAM-001"
                  type="text" />
              </div>
              <div class="di-form-group">
                <label class="di-form-label">Urgence</label>
                <select class="di-form-select" [(ngModel)]="newUrgence">
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </select>
              </div>
              <div class="di-form-group">
                <label class="di-form-label">Symptôme / Description *</label>
                <textarea
                  class="di-form-textarea"
                  [(ngModel)]="newSymptome"
                  rows="4"
                  placeholder="Décrivez le problème observé…"></textarea>
              </div>
            </div>
            <div class="di-modal-footer">
              <button class="di-btn-secondary" (click)="showNewModal.set(false)">Annuler</button>
              <button class="di-btn-primary" (click)="submitNew()">Soumettre la demande</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .di-screen {
      min-height: calc(100vh - 72px);
      background: #F5F5F5;
      animation: screenEnter 280ms ease-out both;
    }

    /* ── Body ────────────────────────────────────────── */
    .di-body {
      padding: 20px 32px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Filters ─────────────────────────────────────── */
    .di-filters {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .di-filter-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted);
      font-weight: 600;
      flex-shrink: 0;
    }
    .di-filter-label--spaced { margin-left: 16px; }

    /* ── Table card ──────────────────────────────────── */
    .di-table-card {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      overflow: hidden;
    }

    /* ── Row inner layout ────────────────────────────── */
    .dtr-row-inner {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
    }
    .dtr-col {
      padding: 0 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dtr-col--code      { flex: 0.8; min-width: 120px; }
    .dtr-col--veh       { flex: 0.7; min-width: 90px; }
    .dtr-col--demandeur { flex: 1; min-width: 130px; }
    .dtr-col--symptome  { flex: 2; min-width: 200px; color: var(--color-text-muted); }
    .dtr-col--date      { flex: 0.7; min-width: 90px; font-size: 12px; color: var(--color-text-muted); }
    .dtr-col--urgence   { flex: 0.7; min-width: 90px; }
    .dtr-col--statut    { flex: 0.9; min-width: 110px; }
    .dtr-col--actions   { flex: 1; min-width: 140px; display: flex; gap: 6px; }

    /* ── Chips ───────────────────────────────────────── */
    .di-code-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-primary);
      background: var(--color-primary-soft, #EEF2FF);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .di-veh-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text);
      background: var(--color-surface-2, #F5F5F5);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid var(--color-border);
    }

    /* ── Action buttons ──────────────────────────────── */
    .di-action-btn {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .di-action-btn:hover { opacity: 0.85; }
    .di-action-btn--approve { background: #D1FAE5; color: #065F46; }
    .di-action-btn--reject  { background: #FEE2E2; color: #991B1B; }
    .di-no-action {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text-muted);
      font-style: italic;
    }

    /* ── Header buttons ──────────────────────────────── */
    .di-btn-primary {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 20px;
      border-radius: var(--radius-sm, 6px);
      border: none;
      background: var(--color-primary);
      color: #fff;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .di-btn-primary:hover { opacity: 0.9; }
    .di-btn-secondary {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 20px;
      border-radius: var(--radius-sm, 6px);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      transition: background 0.15s;
    }
    .di-btn-secondary:hover { background: var(--color-surface-2, #F5F5F5); }

    /* ── Skeleton loading ────────────────────────────── */
    .di-loading { display: flex; flex-direction: column; }
    .di-skeleton-row {
      display: flex;
      align-items: center;
      height: 52px;
      border-bottom: 1px solid var(--color-border);
      padding: 0 8px;
      gap: 8px;
    }
    .di-skeleton-cell {
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .di-skeleton-cell--sm  { flex: 0 0 80px; }
    .di-skeleton-cell--md  { flex: 0 0 120px; }
    .di-skeleton-cell--lg  { flex: 0 0 140px; }
    .di-skeleton-cell--xl  { flex: 1; }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* ── Empty state ─────────────────────────────────── */
    .di-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 0;
      gap: 12px;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text-muted);
    }
    .di-empty-icon { font-size: 32px; }

    /* ── Modal ───────────────────────────────────────── */
    .di-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: screenEnter 180ms ease-out both;
    }
    .di-modal {
      background: var(--color-surface);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      width: 560px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 64px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .di-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--color-border);
    }
    .di-modal-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: var(--color-text);
    }
    .di-modal-close {
      font-size: 16px;
      color: var(--color-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }
    .di-modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow-y: auto;
    }
    .di-modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--color-border);
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    /* ── Field rows ──────────────────────────────────── */
    .di-frow {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .di-frow--block { align-items: flex-start; flex-direction: column; gap: 6px; }
    .di-frow-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text-muted);
      font-weight: 600;
      min-width: 130px;
    }
    .di-frow-value {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
    }
    .di-mono { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--color-primary); }
    .di-symptome-box {
      background: var(--color-surface-2, #F5F5F5);
      border-radius: 8px;
      padding: 12px 14px;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text);
      line-height: 1.6;
      width: 100%;
    }

    /* ── Form ────────────────────────────────────────── */
    .di-form-group { display: flex; flex-direction: column; gap: 6px; }
    .di-form-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .di-form-input,
    .di-form-select,
    .di-form-textarea {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      background: var(--color-surface);
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .di-form-input:focus,
    .di-form-select:focus,
    .di-form-textarea:focus { border-color: var(--color-primary); }
    .di-form-textarea { resize: vertical; }
  `],
})
export class DemandesInterventionComponent {
  private http = inject(HttpClient);

  demandes = signal<DemandeIntervention[]>([]);
  loading = signal(true);
  activeStatut = signal<DemandeInterventionStatut | 'Tous'>('Tous');
  activeUrgence = signal<DemandeInterventionUrgence | 'Toutes'>('Toutes');
  selectedDemande = signal<DemandeIntervention | null>(null);
  showNewModal = signal(false);

  newVehicule = '';
  newUrgence: DemandeInterventionUrgence = 'Moyenne';
  newSymptome = '';

  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly statusTabs: Array<{ label: string; value: DemandeInterventionStatut | 'Tous' }> = [
    { label: 'Toutes', value: 'Tous' },
    { label: 'Nouvelles', value: 'Nouvelle' },
    { label: 'Approuvées', value: 'Approuvée' },
    { label: 'Rejetées', value: 'Rejetée' },
    { label: 'Clôturées', value: 'Clôturée' },
  ];

  readonly urgenceTabs: Array<{ label: string; value: DemandeInterventionUrgence | 'Toutes' }> = [
    { label: 'Toutes', value: 'Toutes' },
    { label: 'Haute', value: 'Haute' },
    { label: 'Moyenne', value: 'Moyenne' },
    { label: 'Basse', value: 'Basse' },
  ];

  readonly tableCols = [
    { label: 'N°', flex: 0.8 },
    { label: 'Véhicule', flex: 0.7 },
    { label: 'Demandeur', flex: 1 },
    { label: 'Symptôme', flex: 2 },
    { label: 'Date', flex: 0.7 },
    { label: 'Urgence', flex: 0.7 },
    { label: 'Statut', flex: 0.9 },
    { label: 'Actions', flex: 1 },
  ];

  filteredDemandes = computed(() => {
    let list = this.demandes();
    if (this.activeStatut() !== 'Tous') {
      list = list.filter(d => d.statut === this.activeStatut());
    }
    if (this.activeUrgence() !== 'Toutes') {
      list = list.filter(d => d.urgence === this.activeUrgence());
    }
    return list;
  });

  newCount = computed(() => this.demandes().filter(d => d.statut === 'Nouvelle').length);

  constructor() {
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.loading.set(true);
    this.http.get<DemandeIntervention[]>('/api/v1/demandes-intervention').subscribe({
      next: (list) => {
        this.demandes.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.demandes.set([]);
        this.loading.set(false);
      },
    });
  }

  filterByStatut(value: DemandeInterventionStatut | 'Tous'): void {
    this.activeStatut.set(value);
  }

  filterByUrgence(value: DemandeInterventionUrgence | 'Toutes'): void {
    this.activeUrgence.set(value);
  }

  updateStatut(demande: DemandeIntervention, statut: DemandeInterventionStatut): void {
    this.demandes.update(list =>
      list.map(d => d.id === demande.id ? { ...d, statut } : d)
    );
  }

  submitNew(): void {
    if (!this.newVehicule.trim() || !this.newSymptome.trim()) {
      return;
    }
    const newItem: DemandeIntervention = {
      id: Date.now(),
      code: `DI-${new Date().getFullYear()}-${String(this.demandes().length + 1).padStart(4, '0')}`,
      vehiculeCode: this.newVehicule.trim(),
      symptome: this.newSymptome.trim(),
      urgence: this.newUrgence,
      statut: 'Nouvelle',
      dateCreation: new Date().toISOString(),
      demandeur: { prenom: 'Utilisateur', nom: 'Courant' },
    };
    this.demandes.update(list => [newItem, ...list]);
    this.newVehicule = '';
    this.newSymptome = '';
    this.newUrgence = 'Moyenne';
    this.showNewModal.set(false);
  }

  toStatusKey(statut: string): 'nouvelle' | 'approuvee' | 'rejetee' | 'cloturee' {
    const map: Record<string, 'nouvelle' | 'approuvee' | 'rejetee' | 'cloturee'> = {
      'Nouvelle': 'nouvelle',
      'Approuvée': 'approuvee',
      'Rejetée': 'rejetee',
      'Clôturée': 'cloturee',
    };
    return map[statut] ?? 'nouvelle';
  }

  toUrgenceKey(urgence: string): 'haute' | 'moyenne' | 'basse' {
    const map: Record<string, 'haute' | 'moyenne' | 'basse'> = {
      'Haute': 'haute',
      'Moyenne': 'moyenne',
      'Basse': 'basse',
    };
    return map[urgence] ?? 'basse';
  }
}
