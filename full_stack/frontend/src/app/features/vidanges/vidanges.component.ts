import { Component, inject, signal, computed } from '@angular/core';
import { VidangeService } from './vidange.service';
import { VidangePlanningWeek, VidangeStatut } from '../../shared/models/vidange.model';
import {
  PageHeaderComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
  SevBadgeComponent,
  EmptyStateComponent,
  SkeletonComponent,
} from '../../shared/ui';

// État filter type
type EtatFilter = 'all' | 'depasse' | 'proche' | 'ok';

// Flattened row for the table
interface VidangeRow {
  id?: number;
  vehiculeCode: string;
  composant: string;
  statut: VidangeStatut;
  semaine: string;
  // Derived display fields
  dernierKm: string;
  prochainKm: string;
  reste: string;
  etat: EtatFilter;
}

/** Map VidangeStatut → etat filter bucket */
function statutToEtat(statut: VidangeStatut): EtatFilter {
  if (statut === 'depasse') return 'depasse';
  if (statut === 'a_faire' || statut === 'en_cours') return 'proche';
  return 'ok';
}

/** Map etat bucket → SevBadge type */
function etatToSevType(etat: EtatFilter): 'critical' | 'warning' | 'success' {
  if (etat === 'depasse') return 'critical';
  if (etat === 'proche') return 'warning';
  return 'success';
}

@Component({
  selector: 'app-vidanges',
  standalone: true,
  imports: [
    PageHeaderComponent,
    FilterChipComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
    SevBadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="vidanges-page" style="animation: screenEnter 400ms ease both">

      <!-- Page header -->
      <app-page-header title="Vidanges" [count]="allRows().length">
        <button class="btn-primary" type="button">
          + Planifier une vidange
        </button>
      </app-page-header>

      <div class="vidanges-content">

        <!-- Filter row -->
        <div class="filter-card">
          <span class="filter-label">État :</span>
          <app-filter-chip
            label="Tous"
            [active]="etatFilter() === 'all'"
            (clicked)="etatFilter.set('all')" />
          <app-filter-chip
            label="🔴 Dépassé"
            [active]="etatFilter() === 'depasse'"
            (clicked)="etatFilter.set(etatFilter() === 'depasse' ? 'all' : 'depasse')" />
          <app-filter-chip
            label="⚠ Proche"
            [active]="etatFilter() === 'proche'"
            (clicked)="etatFilter.set(etatFilter() === 'proche' ? 'all' : 'proche')" />
          <app-filter-chip
            label="✓ OK"
            [active]="etatFilter() === 'ok'"
            (clicked)="etatFilter.set(etatFilter() === 'ok' ? 'all' : 'ok')" />
        </div>

        <!-- Data table -->
        <div class="table-wrap">
          <app-data-table-header [cols]="tableCols" />

          @if (loading()) {
            <app-skeleton [rows]="6" height="52px" />
          } @else if (filteredRows().length === 0) {
            <app-empty-state icon="🔧" message="Aucune vidange planifiée pour les prochaines semaines." />
          } @else {
            @for (row of filteredRows(); track (row.id ?? row.vehiculeCode + row.composant); let i = $index) {
              <app-data-table-row
                [idx]="i"
                [alert]="row.etat === 'depasse'"
                [clickable]="true">

                <!-- Véhicule chip -->
                <div class="dtr-cell" style="flex:0.8">
                  <span class="veh-chip">{{ row.vehiculeCode }}</span>
                </div>

                <!-- Type d'huile / composant -->
                <div class="dtr-cell" style="flex:1.5">
                  <span class="composant-text">{{ row.composant }}</span>
                </div>

                <!-- Dernier KM -->
                <div class="dtr-cell dtr-cell--mono" style="flex:1">
                  <span class="km-text km-text--muted">{{ row.dernierKm }}</span>
                </div>

                <!-- Prochain KM -->
                <div class="dtr-cell dtr-cell--mono" style="flex:1">
                  <span class="km-text">{{ row.prochainKm }}</span>
                </div>

                <!-- KM restants -->
                <div class="dtr-cell dtr-cell--mono" style="flex:0.8">
                  <span class="reste-text reste-text--{{ row.etat }}">{{ row.reste }}</span>
                </div>

                <!-- État badge -->
                <div class="dtr-cell" style="flex:0.9">
                  <app-sev-badge [type]="etatToSevType(row.etat)" />
                </div>

                <!-- Actions -->
                <div class="dtr-cell dtr-cell--actions" style="flex:0.7">
                  @if (row.statut !== 'fait') {
                    <button
                      class="btn-effectuer"
                      type="button"
                      (click)="$event.stopPropagation(); onCloturer(row)">
                      Effectuer
                    </button>
                  }
                </div>

              </app-data-table-row>
            }
          }
        </div>

        <!-- Calendar planning card -->
        @if (!loading() && planning().length > 0) {
          <div class="calendar-card">
            <div class="calendar-card__title">Planning calendrier — 4 semaines à venir</div>
            <div class="calendar-grid">
              @for (week of planning(); track week.semaine; let last = $last) {
                <div class="calendar-week" [class.calendar-week--last]="last">
                  <div class="calendar-week__label">{{ week.semaine }}</div>
                  @if (week.vidanges.length === 0) {
                    <span class="calendar-empty">Aucun événement</span>
                  } @else {
                    @for (v of week.vidanges; track $index) {
                      <div class="calendar-item calendar-item--{{ statutToEtat(v.statut) }}">
                        {{ v.vehiculeCode }} {{ v.composant }}
                      </div>
                    }
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
    @keyframes screenEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .vidanges-page { background: #F5F5F5; min-height: calc(100vh - 72px); }
    .vidanges-content { padding: 20px 32px 32px; }

    /* Filter card */
    .filter-card {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      padding: 14px 20px;
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }

    /* Table */
    .table-wrap {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      overflow: hidden;
      margin-bottom: 20px;
    }

    /* Cell layout override */
    .dtr-cell {
      padding: 0 16px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
    }
    .dtr-cell--mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }
    .dtr-cell--actions { justify-content: flex-start; }

    /* Vehicle code chip */
    .veh-chip {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      background: #F5F5F5;
      border: 1px solid #E5E5E5;
      padding: 3px 8px;
      border-radius: 4px;
      white-space: nowrap;
    }

    /* Composant text */
    .composant-text {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #374151;
    }

    /* KM text */
    .km-text {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 12px;
      color: #374151;
    }
    .km-text--muted { color: #9CA3AF; }

    /* Reste colored number */
    .reste-text {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 700;
    }
    .reste-text--depasse { color: var(--color-danger, #EF4444); }
    .reste-text--proche  { color: #D97706; }
    .reste-text--ok      { color: #059669; }
    .reste-text--all     { color: #374151; }

    /* Effectuer button */
    .btn-effectuer {
      height: 28px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1px solid var(--color-primary, #1A56DB);
      color: var(--color-primary, #1A56DB);
      background: transparent;
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms;
      white-space: nowrap;
    }
    .btn-effectuer:hover {
      background: var(--color-primary, #1A56DB);
      color: #fff;
    }

    /* Primary button in header */
    .btn-primary {
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      border: none;
      background: var(--color-primary, #1A56DB);
      color: #fff;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms;
      white-space: nowrap;
    }
    .btn-primary:hover { background: var(--color-primary-dark, #1648c7); }

    /* Calendar card */
    .calendar-card {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      overflow: hidden;
    }
    .calendar-card__title {
      padding: 16px 20px 12px;
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      border-bottom: 1px solid var(--color-border);
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
    .calendar-week {
      padding: 16px;
      border-right: 1px solid var(--color-border);
    }
    .calendar-week--last { border-right: none; }
    .calendar-week__label {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 12px;
    }
    .calendar-empty {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: #D1D5DB;
      font-style: italic;
    }
    .calendar-item {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 10px;
      border-radius: 8px;
      margin-bottom: 6px;
    }
    .calendar-item--depasse { background: #FEE2E2; color: #991B1B; }
    .calendar-item--proche  { background: #FEF3C7; color: #92400E; }
    .calendar-item--ok      { background: #D1FAE5; color: #065F46; }
    .calendar-item--all     { background: #F3F4F6; color: #374151; }
  `],
})
export class VidangesComponent {
  private vidangeService = inject(VidangeService);

  // ── core data signals (preserved for service compatibility) ──────────────────
  planning = signal<VidangePlanningWeek[]>([]);
  loading = signal(true);

  // ── UI filter signals ────────────────────────────────────────────────────────
  searchQuery = signal('');
  etatFilter = signal<EtatFilter>('all');

  // ── computed flat rows ───────────────────────────────────────────────────────
  allRows = computed<VidangeRow[]>(() =>
    this.planning().flatMap(week =>
      week.vidanges.map(v => ({
        id: v.id,
        vehiculeCode: v.vehiculeCode,
        composant: v.composant,
        statut: v.statut,
        semaine: week.semaine,
        dernierKm: '—',
        prochainKm: '—',
        reste: '—',
        etat: statutToEtat(v.statut),
      }))
    )
  );

  filteredRows = computed<VidangeRow[]>(() => {
    const filter = this.etatFilter();
    if (filter === 'all') return this.allRows();
    return this.allRows().filter(r => r.etat === filter);
  });

  // ── static config ────────────────────────────────────────────────────────────
  readonly tableCols = [
    { label: 'Véhicule',       flex: 0.8 },
    { label: 'Type entretien', flex: 1.5 },
    { label: 'Dernier',        flex: 1   },
    { label: 'Prochain',       flex: 1   },
    { label: 'Reste',          flex: 0.8 },
    { label: 'État',           flex: 0.9 },
    { label: 'Actions',        flex: 0.7 },
  ];

  // ── helpers exposed to template ──────────────────────────────────────────────
  readonly etatToSevType = etatToSevType;
  readonly statutToEtat = statutToEtat;

  constructor() {
    this.loadPlanning();
  }

  loadPlanning(): void {
    this.loading.set(true);
    this.vidangeService.planning(4).subscribe({
      next: (weeks) => {
        this.planning.set(weeks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onCloturer(row: VidangeRow): void {
    if (row.id == null) {
      console.warn('onCloturer: missing id, cannot clôturer', row);
      return;
    }
    this.vidangeService.cloturer(row.id).subscribe({
      next: () => this.loadPlanning(),
      error: (err) => console.error('cloturer failed', err),
    });
  }
}
