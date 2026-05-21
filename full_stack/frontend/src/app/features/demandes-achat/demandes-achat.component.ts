import { Component, inject, signal, computed } from '@angular/core';
import { DemandeAchatService } from './demande-achat.service';
import { DemandeAchat, DemandeStatut } from '../../shared/models/demande-achat.model';
import {
  PageHeaderComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
  RequestStatusBadgeComponent,
  UrgencyBadgeComponent,
  SkeletonComponent,
  EmptyStateComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-demandes-achat',
  standalone: true,
  imports: [
    PageHeaderComponent,
    FilterChipComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
    RequestStatusBadgeComponent,
    UrgencyBadgeComponent,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page">
      <!-- Page header -->
      <app-page-header title="Demandes d'achat" [count]="nouvelles()">
        <button class="da-btn-primary" (click)="showNewDemande.set(true)">
          + Nouvelle demande
        </button>
      </app-page-header>

      @if (actionError()) {
        <div class="demandes__error">{{ actionError() }}</div>
      }

      <!-- Toolbar: filter chips + search -->
      <div class="da-toolbar">
        <div class="da-filter-row">
          <span class="da-filter-label">Statut :</span>
          @for (tab of tabs; track tab.value) {
            <app-filter-chip
              class="demandes__tab"
              [label]="tab.label"
              [active]="activeTab() === tab.value"
              (clicked)="filterByTab(tab.value)" />
          }
        </div>
        <input
          class="da-search"
          type="search"
          placeholder="Rechercher une demande…"
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)" />
      </div>

      <!-- Table area -->
      <div class="da-table-wrap">
        <div class="da-table-card">
          <app-data-table-header [cols]="tableCols" />

          @if (loading()) {
            <app-skeleton [rows]="5" height="52px" />
          } @else if (filteredDemandes().length === 0) {
            <div class="demandes__empty">Aucune demande d'achat trouvée.</div>
          } @else {
            @for (d of filteredDemandes(); track d.id; let i = $index) {
              <app-data-table-row [idx]="i" [clickable]="false">

                <!-- N° Demande -->
                <div class="dtr-cell" style="flex:1">
                  <span class="da-code-chip">{{ d.code }}</span>
                </div>

                <!-- Désignation article -->
                <div class="dtr-cell" style="flex:2">
                  {{ d.composant?.designation ?? d.pieceLibre ?? '—' }}
                </div>

                <!-- Quantité -->
                <div class="dtr-cell dtr-cell--mono dtr-cell--sm" style="flex:0.6">
                  {{ d.quantite }}
                </div>

                <!-- Date demande -->
                <div class="dtr-cell dtr-cell--mono dtr-cell--sm da-cell-muted" style="flex:0.9">
                  {{ formatDate(d.dateDemande) }}
                </div>

                <!-- Urgence -->
                <div class="dtr-cell" style="flex:0.8">
                  <app-urgency-badge [level]="toUrgencyLevel(d.urgence)" />
                </div>

                <!-- Statut -->
                <div class="dtr-cell" style="flex:1">
                  <app-request-status-badge [status]="toRequestStatus(d.statut)" />
                </div>

                <!-- Actions -->
                <div class="dtr-cell demandes__actions" style="flex:1.2">
                  @if (d.statut === 'Nouvelle') {
                    <button class="demandes__action-btn demandes__action-btn--approve" (click)="approuver(d.id)">Approuver</button>
                    <button class="demandes__action-btn demandes__action-btn--reject" (click)="rejeter(d.id)">Rejeter</button>
                  }
                  @if (d.statut === 'Approuvée') {
                    <button class="demandes__action-btn demandes__action-btn--close" (click)="cloturer(d.id)">Clôturer</button>
                  }
                  @if (d.statut !== 'Nouvelle' && d.statut !== 'Approuvée') {
                    <span class="da-no-action">—</span>
                  }
                </div>

              </app-data-table-row>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .page {
      min-height: calc(100vh - 72px);
      background: #F5F5F5;
      animation: screenEnter 260ms ease-out both;
    }

    /* Toolbar */
    .da-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 32px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      gap: 16px;
      flex-wrap: wrap;
    }

    /* Filter row */
    .da-filter-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .da-filter-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    /* Search input */
    .da-search {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      padding: 7px 12px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: #FAFAFA;
      color: var(--color-text);
      outline: none;
      min-width: 220px;
      transition: border-color 0.15s;
    }
    .da-search:focus { border-color: var(--color-primary); }

    /* Table container */
    .da-table-wrap {
      padding: 24px 32px 32px;
    }
    .da-table-card {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      overflow: hidden;
    }

    /* Primary button */
    .da-btn-primary {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 20px;
      border-radius: var(--radius-sm);
      border: none;
      background: var(--color-primary);
      color: #fff;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .da-btn-primary:hover { opacity: 0.9; }

    /* Code chip */
    .da-code-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-primary);
      background: rgba(var(--color-primary-rgb, 37,99,235), 0.08);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .da-cell-muted { color: var(--color-text-muted); }

    /* Actions */
    .demandes__actions { display: flex; gap: 6px; align-items: center; }
    .demandes__action-btn {
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .demandes__action-btn--approve { background: #D1FAE5; color: #065F46; }
    .demandes__action-btn--reject  { background: #FEE2E2; color: #991B1B; }
    .demandes__action-btn--close   { background: #E0F2FE; color: #0369A1; }
    .demandes__action-btn:hover { opacity: 0.8; }
    .da-no-action { font-family: 'Open Sans', sans-serif; font-size: 12px; color: var(--color-text-muted); font-style: italic; }

    /* Empty state */
    .demandes__empty {
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: var(--color-text-muted);
      text-align: center;
      padding: 48px 0;
    }

    /* Error banner */
    .demandes__error {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-danger);
      background: rgba(239,68,68,0.08);
      border-radius: var(--radius-sm);
      padding: 8px 16px;
      margin: 12px 32px 0;
    }
  `],
})
export class DemandesAchatComponent {
  private demandeService = inject(DemandeAchatService);

  demandes = signal<DemandeAchat[]>([]);
  loading = signal(true);
  activeTab = signal<DemandeStatut | 'all'>('all');
  statusFilter = signal('all');
  searchQuery = signal('');
  showNewDemande = signal(false);
  actionError = signal<string | null>(null);

  nouvelles = computed(() => this.demandes().filter(d => d.statut === 'Nouvelle').length);

  filteredDemandes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.demandes().filter(d => {
      if (!q) return true;
      const designation = d.composant?.designation ?? d.pieceLibre ?? '';
      return (
        d.code.toLowerCase().includes(q) ||
        designation.toLowerCase().includes(q) ||
        `${d.demandeur.prenom} ${d.demandeur.nom}`.toLowerCase().includes(q)
      );
    });
  });

  tableCols = [
    { label: 'N° Demande',        flex: 1   },
    { label: 'Désignation article', flex: 2  },
    { label: 'Quantité',           flex: 0.6 },
    { label: 'Date demande',       flex: 0.9 },
    { label: 'Urgence',            flex: 0.8 },
    { label: 'Statut',             flex: 1   },
    { label: 'Actions',            flex: 1.2 },
  ];

  tabs = [
    { label: 'Toutes',     value: 'all'        as const },
    { label: 'Nouvelles',  value: 'Nouvelle'   as DemandeStatut },
    { label: 'Approuvées', value: 'Approuvée'  as DemandeStatut },
    { label: 'Rejetées',   value: 'Rejetée'    as DemandeStatut },
    { label: 'Clôturées',  value: 'Clôturée'   as DemandeStatut },
  ];

  constructor() {
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.loading.set(true);
    const params = this.activeTab() !== 'all' ? { statut: this.activeTab() as DemandeStatut } : {};
    this.demandeService.list(params).subscribe({
      next: (page) => { this.demandes.set(page.content); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filterByTab(tab: DemandeStatut | 'all'): void {
    this.activeTab.set(tab);
    this.loadDemandes();
  }

  approuver(id: number): void {
    this.demandeService.approuver(id).subscribe({
      next: () => { this.actionError.set(null); this.loadDemandes(); },
      error: (err) => { console.error('Approbation failed', err); this.actionError.set("Erreur lors de l'approbation."); },
    });
  }

  rejeter(id: number): void {
    const raison = prompt('Raison du rejet :');
    if (raison) this.demandeService.rejeter(id, raison).subscribe({
      next: () => { this.actionError.set(null); this.loadDemandes(); },
      error: (err) => { console.error('Rejet failed', err); this.actionError.set('Erreur lors du rejet.'); },
    });
  }

  cloturer(id: number): void {
    this.demandeService.cloturer(id).subscribe({
      next: () => { this.actionError.set(null); this.loadDemandes(); },
      error: (err) => { console.error('Clôture failed', err); this.actionError.set('Erreur lors de la clôture.'); },
    });
  }

  // Kept for backward-compat with existing specs
  getUrgenceVariant(urgence: string | null): string {
    switch (urgence) {
      case 'Haute':   return 'danger';
      case 'Moyenne': return 'warning';
      case 'Basse':   return 'info';
      default:        return 'neutral';
    }
  }

  getStatutVariant(statut: string): string {
    switch (statut) {
      case 'Nouvelle':  return 'info';
      case 'Approuvée': return 'success';
      case 'Rejetée':   return 'danger';
      case 'Clôturée':  return 'neutral';
      default:          return 'neutral';
    }
  }

  toUrgencyLevel(urgence: string | null): 'haute' | 'moyenne' | 'basse' {
    switch (urgence) {
      case 'Haute':   return 'haute';
      case 'Moyenne': return 'moyenne';
      default:        return 'basse';
    }
  }

  toRequestStatus(statut: string): 'nouvelle' | 'approuvee' | 'rejetee' | 'cloturee' {
    switch (statut) {
      case 'Nouvelle':  return 'nouvelle';
      case 'Approuvée': return 'approuvee';
      case 'Rejetée':   return 'rejetee';
      case 'Clôturée':  return 'cloturee';
      default:          return 'nouvelle';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }
}