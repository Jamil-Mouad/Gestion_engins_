import { Component, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReleveCompteurService } from './releve-compteur.service';
import { ReleveCompteur } from '../../shared/models/releve-compteur.model';
import {
  PageHeaderComponent,
  FilterChipComponent,
  SkeletonComponent,
  EmptyStateComponent,
} from '../../shared/ui';

type SourceFilter = 'all' | 'manual' | 'excel_import' | 'intervention';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [
    DecimalPipe,
    PageHeaderComponent,
    FilterChipComponent,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="hist-page" style="animation: screenEnter 400ms ease both">

      <!-- Page header -->
      <app-page-header title="Historique" [count]="releves().length" />

      <!-- Filter bar -->
      <div class="hist-filter-bar">
        <div class="hist-filter-left">
          <app-filter-chip label="Tous"         [active]="sourceFilter() === 'all'"          (clicked)="onSourceFilter('all')" />
          <app-filter-chip label="Manuel"       [active]="sourceFilter() === 'manual'"       (clicked)="onSourceFilter(sourceFilter() === 'manual'       ? 'all' : 'manual')" />
          <app-filter-chip label="Import"       [active]="sourceFilter() === 'excel_import'" (clicked)="onSourceFilter(sourceFilter() === 'excel_import' ? 'all' : 'excel_import')" />
          <app-filter-chip label="Intervention" [active]="sourceFilter() === 'intervention'" (clicked)="onSourceFilter(sourceFilter() === 'intervention' ? 'all' : 'intervention')" />
        </div>
        <div class="hist-filter-right">
          <span class="hist-filter-label">Véhicule :</span>
          <select class="hist-select" [value]="selectedVehiculeId()" (change)="onVehicleFilter($event)">
            <option value="">Tous les véhicules</option>
            @for (v of vehicles(); track v.id) {
              <option [value]="v.id">{{ v.code }}</option>
            }
          </select>
          @if (sourceFilter() !== 'all') {
            <button class="hist-reset-btn" (click)="onSourceFilter('all')">Réinitialiser</button>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="hist-content">

        @if (loadError()) {
          <div class="hist-error">{{ loadError() }}</div>
        }

        @if (loading()) {
          <app-skeleton [rows]="6" height="80px" />
        } @else if (filteredReleves().length === 0) {
          <app-empty-state icon="📋" message="Aucun relevé trouvé." />
        } @else {

          <!-- Year groups -->
          @for (group of yearGroups(); track group.year) {
            <div class="hist-year-group">

              <!-- Year divider -->
              <div class="hist-year-divider">
                <div class="hist-year-line"></div>
                <span class="hist-year-pill">{{ group.year }}</span>
                <div class="hist-year-line hist-year-line--flex"></div>
              </div>

              <!-- Timeline -->
              <div class="hist-timeline-wrap">
                <!-- Vertical spine -->
                <div class="hist-spine"></div>

                <!-- Entries list -->
                <div class="hist-entries">
                  @for (releve of group.releves; track releve.id; let i = $index) {
                    <div class="hist-entry" [style.animation-delay]="i * 30 + 'ms'">

                      <!-- Timeline node dot -->
                      <div class="hist-node" [class]="'hist-node hist-node--' + getSourceVariant(releve.source)"></div>

                      <!-- Entry card -->
                      <div class="hist-card">
                        <div class="hist-card-top">
                          <div class="hist-card-meta">
                            <span class="hist-date">{{ formatDate(releve.dateReleve) }}</span>
                            <span [class]="'hist-badge hist-badge--' + getSourceVariant(releve.source)">
                              {{ getSourceLabel(releve.source) }}
                            </span>
                            <span class="hist-veh-chip">{{ releve.vehicule.code }}</span>
                          </div>
                          <div class="hist-card-right">
                            @if (releve.compteurKm !== null && releve.compteurKm !== undefined) {
                              <span class="hist-km-chip">{{ releve.compteurKm | number }} km</span>
                            }
                            @if (releve.compteurHeures !== null && releve.compteurHeures !== undefined) {
                              <span class="hist-km-chip hist-km-chip--hours">{{ releve.compteurHeures }} h</span>
                            }
                          </div>
                        </div>
                        @if (releve.createdBy) {
                          <div class="hist-card-secondary">
                            Enregistré par : {{ releve.createdBy.prenom }} {{ releve.createdBy.nom }}
                          </div>
                        } @else {
                          <div class="hist-card-secondary">{{ getSourceTypeLabel(releve.source) }}</div>
                        }
                      </div>

                    </div>
                  }
                </div>
              </div>

            </div>
          }

        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes rowEnter {
      from { opacity: 0; transform: translateX(-8px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* ── Page shell ──────────────────────────────────────────── */
    .hist-page {
      background: var(--color-background, #F5F5F5);
      min-height: calc(100vh - 72px);
    }

    /* ── Filter bar ──────────────────────────────────────────── */
    .hist-filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding: 12px 32px;
      background: var(--color-surface, #fff);
      border-bottom: 1px solid var(--color-border, #E5E7EB);
    }
    .hist-filter-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hist-filter-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hist-filter-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted, #6B7280);
      white-space: nowrap;
    }
    .hist-select {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      padding: 5px 10px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      background: #fff;
      color: var(--color-text, #111827);
      cursor: pointer;
    }
    .hist-reset-btn {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-primary, #1D4ED8);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 150ms;
    }
    .hist-reset-btn:hover {
      background: rgba(29,78,216,0.07);
    }

    /* ── Content area ────────────────────────────────────────── */
    .hist-content {
      padding: 28px 32px 40px;
    }

    /* ── Error banner ────────────────────────────────────────── */
    .hist-error {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-danger, #DC2626);
      background: rgba(239,68,68,0.08);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 16px;
    }

    /* ── Year group ──────────────────────────────────────────── */
    .hist-year-group {
      margin-bottom: 32px;
    }

    /* ── Year divider ────────────────────────────────────────── */
    .hist-year-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .hist-year-line {
      height: 1px;
      width: 32px;
      background: var(--color-border, #E5E7EB);
    }
    .hist-year-line--flex {
      flex: 1;
      width: auto;
    }
    .hist-year-pill {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-primary, #1D4ED8);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      white-space: nowrap;
    }

    /* ── Timeline wrap ───────────────────────────────────────── */
    .hist-timeline-wrap {
      display: flex;
      gap: 0;
      position: relative;
    }
    .hist-spine {
      width: 2px;
      background: linear-gradient(to bottom, var(--color-border, #E5E7EB), transparent);
      flex-shrink: 0;
      margin-right: 24px;
      border-radius: 2px;
      min-height: 40px;
    }

    /* ── Entries container ───────────────────────────────────── */
    .hist-entries {
      flex: 1;
      min-width: 0;
    }

    /* ── Timeline entry row ──────────────────────────────────── */
    .hist-entry {
      display: flex;
      align-items: flex-start;
      gap: 0;
      position: relative;
      animation: rowEnter 240ms ease-out both;
      margin-bottom: 16px;
    }

    /* ── Node dot ────────────────────────────────────────────── */
    .hist-node {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 18px;
      margin-left: -33px;
      margin-right: 19px;
      border: 3px solid #fff;
    }
    .hist-node--info    { background: var(--color-info, #3B82F6);        box-shadow: 0 0 0 2px rgba(59,130,246,0.3); }
    .hist-node--warning { background: var(--color-warning, #F59E0B);     box-shadow: 0 0 0 2px rgba(245,158,11,0.3); }
    .hist-node--success { background: var(--color-success, #10B981);     box-shadow: 0 0 0 2px rgba(16,185,129,0.3); }
    .hist-node--neutral { background: var(--color-text-muted, #9CA3AF);  box-shadow: 0 0 0 2px rgba(156,163,175,0.3); }

    /* ── Entry card ──────────────────────────────────────────── */
    .hist-card {
      flex: 1;
      background: var(--color-surface, #fff);
      border-radius: 12px;
      border: 1px solid var(--color-border, #E5E7EB);
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .hist-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .hist-card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hist-card-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .hist-card-secondary {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text-muted, #6B7280);
      margin-top: 6px;
    }

    /* ── Date label ──────────────────────────────────────────── */
    .hist-date {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      color: var(--color-text-muted, #6B7280);
    }

    /* ── Source badge ────────────────────────────────────────── */
    .hist-badge {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: 9999px;
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
    }
    .hist-badge--info    { background: var(--color-info-subtle, #E0F2FE);    color: var(--color-info-text, #0369A1); }
    .hist-badge--warning { background: var(--color-warning-subtle, #FEF3C7); color: var(--color-warning-text, #92400E); }
    .hist-badge--success { background: var(--color-success-subtle, #D1FAE5); color: var(--color-success-text, #065F46); }
    .hist-badge--neutral { background: var(--color-neutral-subtle, #F3F4F6); color: var(--color-neutral-text, #374151); }

    /* ── Vehicle chip ────────────────────────────────────────── */
    .hist-veh-chip {
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-primary, #1D4ED8);
      background: rgba(29,78,216,0.08);
      padding: 2px 8px;
      border-radius: 6px;
    }

    /* ── KM / Hours chip ─────────────────────────────────────── */
    .hist-km-chip {
      font-family: 'Open Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-primary, #1D4ED8);
      background: rgba(29,78,216,0.08);
      padding: 3px 10px;
      border-radius: 8px;
    }
    .hist-km-chip--hours {
      color: #0F766E;
      background: rgba(15,118,110,0.08);
    }
  `],
})
export class HistoriqueComponent {
  private releveService = inject(ReleveCompteurService);

  releves = signal<ReleveCompteur[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  vehicles = signal<{ id: number; code: string }[]>([]);
  sourceFilter = signal<SourceFilter>('all');
  selectedVehiculeId = signal<string>('');

  filteredReleves = computed(() => {
    const f = this.sourceFilter();
    if (f === 'all') return this.releves();
    return this.releves().filter((r) => r.source === f);
  });

  yearGroups = computed(() => {
    const map = new Map<string, ReleveCompteur[]>();
    for (const r of this.filteredReleves()) {
      const year = new Date(r.dateReleve).getFullYear().toString();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(r);
    }
    return [...map.entries()]
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, releves]) => ({ year, releves }));
  });

  constructor() {
    this.loadReleves();
  }

  loadReleves(vehiculeId?: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.releveService.list({ vehiculeId, page: 0, size: 500 }).subscribe({
      next: (page) => {
        this.releves.set(page.content);
        const seen = new Map<number, string>();
        for (const r of page.content) seen.set(r.vehicule.id, r.vehicule.code);
        this.vehicles.set([...seen.entries()].map(([id, code]) => ({ id, code })));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('loadReleves failed', err);
        this.loadError.set('Erreur lors du chargement des relevés.');
        this.loading.set(false);
      },
    });
  }

  onVehicleFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedVehiculeId.set(value);
    this.sourceFilter.set('all');
    this.loadReleves(value ? Number(value) : undefined);
  }

  onSourceFilter(value: SourceFilter): void {
    this.sourceFilter.set(value);
    this.selectedVehiculeId.set('');
  }

  getSourceVariant(source: string): string {
    switch (source) {
      case 'manual': return 'info';
      case 'excel_import': return 'warning';
      case 'intervention': return 'success';
      default: return 'neutral';
    }
  }

  getSourceLabel(source: string): string {
    switch (source) {
      case 'manual': return 'Manuel';
      case 'excel_import': return 'Import';
      case 'intervention': return 'Intervention';
      default: return source;
    }
  }

  getSourceTypeLabel(source: string): string {
    switch (source) {
      case 'manual': return 'Relevé kilométrique manuel';
      case 'excel_import': return 'Relevé importé via Excel';
      case 'intervention': return 'Relevé lié à une intervention';
      default: return 'Relevé kilométrique';
    }
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year  = d.getFullYear();
    const h     = String(d.getHours()).padStart(2, '0');
    const m     = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${h}:${m}`;
  }
}