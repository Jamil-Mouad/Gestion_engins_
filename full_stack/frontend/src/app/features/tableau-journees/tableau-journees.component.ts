import { Component, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TableauJournee, TableauJourneeVehicule } from '../../shared/models/tableau-journee.model';
import {
  PageHeaderComponent,
  FilterChipComponent,
  StatusBadgeComponent,
  SkeletonComponent,
  EmptyStateComponent,
} from '../../shared/ui';

type StatutFilter = 'all' | 'in-service' | 'workshop' | 'maintenance' | 'out-of-service';

@Component({
  selector: 'app-tableau-journees',
  standalone: true,
  imports: [
    PageHeaderComponent,
    FilterChipComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="tj-page" style="animation: screenEnter 400ms ease both">

      <!-- Page header -->
      <app-page-header title="Tableau de journées">
        <span class="tj-header-date-label">Date :</span>
        <div class="tj-date-box">
          <input
            type="date"
            class="tj-date-input"
            [value]="selectedDate()"
            (change)="onDateChange($event)"
          />
        </div>
      </app-page-header>

      <!-- Body -->
      <div class="tj-body">

        <!-- Filter bar -->
        <div class="tj-filter-card">
          <div class="tj-filter-left">
            <input
              class="tj-search"
              type="text"
              placeholder="Rechercher par matricule…"
              [value]="searchQuery()"
              (input)="onSearch($event)"
            />
          </div>
          <div class="tj-filter-right">
            <app-filter-chip
              label="Tous"
              [active]="statutFilter() === 'all'"
              (clicked)="onStatutFilter('all')"
            />
            <app-filter-chip
              label="En service"
              [active]="statutFilter() === 'in-service'"
              (clicked)="onStatutFilter(statutFilter() === 'in-service' ? 'all' : 'in-service')"
            />
            <app-filter-chip
              label="Atelier"
              [active]="statutFilter() === 'workshop'"
              (clicked)="onStatutFilter(statutFilter() === 'workshop' ? 'all' : 'workshop')"
            />
            <app-filter-chip
              label="Maintenance"
              [active]="statutFilter() === 'maintenance'"
              (clicked)="onStatutFilter(statutFilter() === 'maintenance' ? 'all' : 'maintenance')"
            />
          </div>
        </div>

        <!-- Table card -->
        @if (loading()) {
          <app-skeleton [rows]="8" height="48px" />
        } @else if (data()) {

          <div class="tj-table-card">
            <!-- Table header -->
            <div class="tj-thead">
              <div class="tj-th tj-col-n">#</div>
              <div class="tj-th tj-col-mat">Matricule</div>
              <div class="tj-th tj-col-code">Code</div>
              <div class="tj-th tj-col-type">Type</div>
              <div class="tj-th tj-col-statut">Statut</div>
              <div class="tj-th tj-col-chauffeur">Chauffeur</div>
            </div>

            @if (filteredVehicules().length === 0) {
              <app-empty-state icon="clipboard-list" message="Aucun véhicule pour ce filtre." />
            } @else {
              @for (v of filteredVehicules(); track v.id; let i = $index) {
                <div class="tj-trow" [style.animation-delay]="i * 20 + 'ms'">
                  <div class="tj-td tj-col-n tj-num">{{ i + 1 }}</div>
                  <div class="tj-td tj-col-mat tj-mat">{{ v.matricule ?? '—' }}</div>
                  <div class="tj-td tj-col-code">
                    <span class="tj-code-chip">{{ v.code }}</span>
                  </div>
                  <div class="tj-td tj-col-type tj-type">{{ v.type }}</div>
                  <div class="tj-td tj-col-statut">
                    <app-status-badge [status]="v.statut" />
                  </div>
                  <div class="tj-td tj-col-chauffeur tj-chauffeur">{{ v.chauffeurNom ?? '—' }}</div>
                </div>
              }
            }
          </div>

          <!-- Footer stats -->
          <div class="tj-footer-stats">
            @for (stat of footerStats(); track stat.label) {
              <div class="tj-stat-chip">
                <div class="tj-stat-dot" [style.background]="stat.color"></div>
                <span class="tj-stat-text">{{ stat.label }}</span>
              </div>
            }
          </div>

        } @else {
          <app-empty-state icon="clipboard-list" message="Aucune donnée pour cette date." />
        }

      </div>
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .tj-page {
      background: #F5F5F5;
      min-height: calc(100vh - 88px);
    }

    /* ── Header extras ─────────────────────────────────────── */
    .tj-header-date-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted);
    }
    .tj-date-box {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      height: 40px;
      display: flex;
      align-items: center;
      padding: 0 14px;
    }
    .tj-date-input {
      border: none;
      outline: none;
      background: transparent;
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      color: var(--color-text);
      cursor: pointer;
    }

    /* ── Body ─────────────────────────────────────────────── */
    .tj-body {
      padding: 20px 32px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Filter card ─────────────────────────────────────── */
    .tj-filter-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .tj-filter-left {
      flex: 1;
      min-width: 200px;
    }
    .tj-filter-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tj-search {
      width: 100%;
      max-width: 420px;
      height: 38px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0 14px 0 36px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      background: #F9FAFB url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8' stroke='%239CA3AF' stroke-width='2'/%3E%3Cpath stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center;
      outline: none;
      transition: border-color 150ms;
    }
    .tj-search:focus {
      border-color: var(--color-primary);
    }

    /* ── Table card ─────────────────────────────────────── */
    .tj-table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    /* ── Column widths ───────────────────────────────────── */
    .tj-col-n        { flex: 0 0 52px; }
    .tj-col-mat      { flex: 1.4; }
    .tj-col-code     { flex: 1; }
    .tj-col-type     { flex: 1; }
    .tj-col-statut   { flex: 1.2; }
    .tj-col-chauffeur{ flex: 1.6; }

    /* ── Table header ────────────────────────────────────── */
    .tj-thead {
      display: flex;
      align-items: center;
      padding: 0 20px;
      background: #F9FAFB;
      border-bottom: 2px solid var(--color-border);
      height: 42px;
    }
    .tj-th {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding-right: 12px;
    }

    /* ── Table row ──────────────────────────────────────── */
    .tj-trow {
      display: flex;
      align-items: center;
      padding: 0 20px;
      height: 52px;
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      transition: background 150ms;
      animation: screenEnter 300ms ease both;
    }
    .tj-trow:last-child {
      border-bottom: none;
    }
    .tj-trow:hover {
      background: #F9FAFB;
    }
    .tj-td {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
      padding-right: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tj-num {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .tj-mat {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      color: #374151;
    }
    .tj-code-chip {
      display: inline-block;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text);
      background: #F3F4F6;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .tj-type {
      color: var(--color-text-muted);
    }
    .tj-chauffeur {
      color: #374151;
    }

    /* ── Footer stats ──────────────────────────────────── */
    .tj-footer-stats {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .tj-stat-chip {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .tj-stat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .tj-stat-text {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #374151;
      font-weight: 500;
    }
  `],
})
export class TableauJourneesComponent {
  private http = inject(HttpClient);

  data = signal<TableauJournee | null>(null);
  loading = signal(true);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  searchQuery = signal('');
  statutFilter = signal<StatutFilter>('all');

  filteredVehicules = computed<TableauJourneeVehicule[]>(() => {
    const d = this.data();
    if (!d) return [];
    const q = this.searchQuery().toLowerCase().trim();
    const sf = this.statutFilter();
    return d.vehicules.filter(v => {
      const matchSearch = !q ||
        (v.matricule ?? '').toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q);
      const matchStatut = sf === 'all' || v.statut === sf;
      return matchSearch && matchStatut;
    });
  });

  footerStats = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: `Total : ${d.stats.total}`,         color: '#6B7280' },
      { label: `En service : ${d.stats.enService}`, color: '#16A34A' },
      { label: `Atelier : ${d.stats.workshop}`,     color: '#DC2626' },
      { label: `Maintenance : ${d.stats.maintenance}`, color: '#D97706' },
    ];
  });

  constructor() {
    this.loadTableau();
  }

  loadTableau(date?: string): void {
    this.loading.set(true);
    let url = '/api/v1/tableau-journees';
    if (date) url += `?date=${date}`;
    this.http.get<TableauJournee>(url).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.selectedDate.set(value);
    this.loadTableau(value);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onStatutFilter(value: StatutFilter | string): void {
    this.statutFilter.set(value as StatutFilter);
  }
}
