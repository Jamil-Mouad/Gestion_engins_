import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { ComposantService } from './composant.service';
import { ComposantNode, ComposantCategorie } from '../../shared/models/composant.model';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import {
  PageHeaderComponent,
  FilterChipComponent,
  DataTableHeaderComponent,
  DataTableRowComponent,
} from '../../shared/ui';

type PartieFilter = 'all' | ComposantCategorie;

const PARTIE_LABELS: Record<string, string> = {
  moteur: 'Moteur',
  pneumatique: 'Pneumatique',
  freinage: 'Freinage',
  hydraulique: 'Hydraulique',
  electrique: 'Électrique',
  transmission: 'Transmission',
  autre: 'Autre',
};

@Component({
  selector: 'app-composants',
  standalone: true,
  imports: [
    LucideAngularModule,
    SkeletonComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    FilterChipComponent,
    DataTableHeaderComponent,
    DataTableRowComponent,
  ],
  template: `
    <div class="comp-page" style="animation: screenEnter 400ms ease both">

      <!-- Page header -->
      <app-page-header title="Composants" [count]="tree().length">
        <button class="btn-primary" type="button">
          + Nouveau composant
        </button>
      </app-page-header>

      <div class="comp-content">

        <!-- Search + filter card -->
        <div class="filter-card">
          <div class="search-wrap">
            <lucide-icon name="search" class="search-icon" [size]="15" />
            <input
              class="search-input"
              placeholder="Rechercher par nom, référence…"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)" />
          </div>
          <span class="filter-label">Partie :</span>
          <app-filter-chip
            label="Toutes"
            [active]="partieFilter() === 'all'"
            (clicked)="partieFilter.set('all')" />
          @for (f of partieFilters; track f.value) {
            <app-filter-chip
              [label]="f.label"
              [active]="partieFilter() === f.value"
              (clicked)="partieFilter.set(partieFilter() === f.value ? 'all' : f.value)" />
          }
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <app-data-table-header [cols]="tableCols" />

          @if (loading()) {
            <app-skeleton [rows]="6" height="52px" />
          } @else if (filteredNodes().length === 0) {
            <app-empty-state icon="⚙️" message="Aucun composant trouvé — essayez de modifier vos filtres." />
          } @else {
            @for (node of filteredNodes(); track node.id; let i = $index) {
              <app-data-table-row [idx]="i" [clickable]="node.children.length > 0" (rowClicked)="toggle(node.id)">
                <!-- Désignation -->
                <div class="dtr-cell" style="flex:2.5">
                  <span class="comp-designation">{{ node.designation }}</span>
                </div>
                <!-- Partie badge -->
                <div class="dtr-cell" style="flex:1">
                  @if (node.categorie) {
                    <span class="partie-badge partie-badge--{{ node.categorie }}">
                      {{ partieLabel(node.categorie) }}
                    </span>
                  } @else {
                    <span class="partie-badge partie-badge--autre">—</span>
                  }
                </div>
                <!-- Niveau -->
                <div class="dtr-cell" style="flex:0.7">
                  <span class="niveau-chip">Niv. {{ node.niveau }}</span>
                </div>
                <!-- Actions -->
                <div class="dtr-cell dtr-cell--actions" style="flex:0.4">
                  <lucide-icon name="more-horizontal" [size]="16" class="action-icon" />
                </div>
              </app-data-table-row>

              <!-- Inline children when expanded -->
              @if (expanded().has(node.id) && node.children.length > 0) {
                @for (child of node.children; track child.id; let ci = $index) {
                  <app-data-table-row [idx]="i * 10 + ci" [clickable]="child.children.length > 0" (rowClicked)="toggle(child.id)">
                    <div class="dtr-cell" style="flex:2.5; padding-left:40px">
                      <span class="comp-designation comp-designation--child">{{ child.designation }}</span>
                    </div>
                    <div class="dtr-cell" style="flex:1">
                      @if (child.categorie) {
                        <span class="partie-badge partie-badge--{{ child.categorie }}">
                          {{ partieLabel(child.categorie) }}
                        </span>
                      }
                    </div>
                    <div class="dtr-cell" style="flex:0.7">
                      <span class="niveau-chip niveau-chip--child">Niv. {{ child.niveau }}</span>
                    </div>
                    <div class="dtr-cell dtr-cell--actions" style="flex:0.4">
                      <lucide-icon name="more-horizontal" [size]="16" class="action-icon" />
                    </div>
                  </app-data-table-row>

                  @if (expanded().has(child.id) && child.children.length > 0) {
                    @for (leaf of child.children; track leaf.id; let li = $index) {
                      <app-data-table-row [idx]="i * 100 + ci * 10 + li">
                        <div class="dtr-cell" style="flex:2.5; padding-left:72px">
                          <span class="comp-designation comp-designation--leaf">{{ leaf.designation }}</span>
                        </div>
                        <div class="dtr-cell" style="flex:1">
                          @if (leaf.categorie) {
                            <span class="partie-badge partie-badge--{{ leaf.categorie }}">
                              {{ partieLabel(leaf.categorie) }}
                            </span>
                          }
                        </div>
                        <div class="dtr-cell" style="flex:0.7">
                          <span class="niveau-chip niveau-chip--leaf">Niv. {{ leaf.niveau }}</span>
                        </div>
                        <div class="dtr-cell dtr-cell--actions" style="flex:0.4"></div>
                      </app-data-table-row>
                    }
                  }
                }
              }
            }
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .comp-page { background: #F9FAFB; min-height: 100vh; }
    .comp-content { padding: 20px 32px 32px; }

    /* Filter card */
    .filter-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
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
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      color: #9CA3AF;
      pointer-events: none;
    }
    .search-input {
      height: 36px;
      padding: 0 12px 0 32px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: #374151;
      width: 300px;
      outline: none;
      transition: border-color 150ms;
    }
    .search-input:focus { border-color: var(--color-primary, #1A56DB); }

    /* Table container */
    .table-wrap {
      background: white;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      overflow: hidden;
    }

    /* Shared cell layout override */
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
    .dtr-cell--actions {
      justify-content: center;
    }
    .action-icon { color: #9CA3AF; cursor: pointer; }
    .action-icon:hover { color: #374151; }

    /* Designation */
    .comp-designation {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: #111827;
    }
    .comp-designation--child {
      font-weight: 400;
      color: #374151;
    }
    .comp-designation--leaf {
      font-weight: 400;
      color: #6B7280;
      font-size: 12px;
    }
    .comp-chevron {
      font-size: 11px;
      color: #9CA3AF;
      margin-right: 6px;
      width: 14px;
    }

    /* Partie badges */
    .partie-badge {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      font-family: 'Open Sans', sans-serif;
      white-space: nowrap;
    }
    .partie-badge--moteur      { background: #EFF6FF; color: #1D4ED8; }
    .partie-badge--pneumatique { background: #FFF7ED; color: #C2410C; }
    .partie-badge--freinage    { background: #FEF2F2; color: #B91C1C; }
    .partie-badge--hydraulique { background: #F0FDFA; color: #0F766E; }
    .partie-badge--electrique  { background: #FEFCE8; color: #A16207; }
    .partie-badge--transmission{ background: #FAF5FF; color: #7E22CE; }
    .partie-badge--autre       { background: #F3F4F6; color: #6B7280; }

    /* Niveau chip */
    .niveau-chip {
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: #F3F4F6;
      color: #374151;
      font-weight: 500;
    }
    .niveau-chip--child { background: #E5E7EB; color: #6B7280; }
    .niveau-chip--leaf  { background: #F9FAFB; color: #9CA3AF; }

    /* Button */
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
    .btn-primary:hover { background: #1648c7; }
  `],
})
export class ComposantsComponent {
  private composantService = inject(ComposantService);
  private destroyRef = inject(DestroyRef);

  // ── data signals (kept for backward-compat with spec) ───────────────────────
  tree    = signal<ComposantNode[]>([]);
  loading = signal(true);
  expanded = signal<Set<number>>(new Set());

  // ── UI filter signals ────────────────────────────────────────────────────────
  searchQuery   = signal('');
  partieFilter  = signal<PartieFilter>('all');

  // ── computed ─────────────────────────────────────────────────────────────────
  filteredNodes = computed(() => {
    const q      = this.searchQuery().toLowerCase().trim();
    const partie = this.partieFilter();
    return this.tree().filter(node => {
      const matchQ = !q || node.designation.toLowerCase().includes(q);
      const matchP = partie === 'all' || node.categorie === partie;
      return matchQ && matchP;
    });
  });

  // ── static config ─────────────────────────────────────────────────────────────
  readonly tableCols = [
    { label: 'Désignation',  flex: 2.5 },
    { label: 'Partie',       flex: 1   },
    { label: 'Niveau',       flex: 0.7 },
    { label: 'Actions',      flex: 0.4 },
  ];

  readonly partieFilters: { value: ComposantCategorie; label: string }[] = [
    { value: 'moteur',        label: 'Moteur' },
    { value: 'pneumatique',   label: 'Pneumatique' },
    { value: 'freinage',      label: 'Freinage' },
    { value: 'hydraulique',   label: 'Hydraulique' },
    { value: 'electrique',    label: 'Électrique' },
    { value: 'transmission',  label: 'Transmission' },
  ];

  constructor() {
    this.loadTree();
  }

  loadTree(): void {
    this.loading.set(true);
    this.composantService.tree().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (data) => {
        this.tree.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggle(id: number): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  partieLabel(cat: ComposantCategorie | null): string {
    return cat ? (PARTIE_LABELS[cat] ?? cat) : '—';
  }
}
