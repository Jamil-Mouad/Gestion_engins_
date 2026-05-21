import { Component, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap, catchError, of } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { PneuService } from '../pneu.service';
import { Pneu } from '../../../shared/models/pneu.model';
import {
  BreadcrumbComponent,
  TabGroupComponent,
  CardComponent,
  KpiCardComponent,
  SkeletonComponent,
  EmptyStateComponent,
  SevBadgeComponent,
} from '../../../shared/ui';
import { PneuDetailsTabComponent } from './tabs/details-tab.component';
import { PneuInspectionsTabComponent } from './tabs/inspections-tab.component';
import { PneuHistoriqueTabComponent } from './tabs/historique-pneu-tab.component';

type TabId = 'overview' | 'activite' | 'inspections' | 'historique';

@Component({
  selector: 'app-pneu-detail',
  standalone: true,
  imports: [
    DecimalPipe,
    LucideAngularModule,
    BreadcrumbComponent, TabGroupComponent,
    CardComponent, KpiCardComponent,
    SkeletonComponent, EmptyStateComponent, SevBadgeComponent,
    PneuDetailsTabComponent, PneuInspectionsTabComponent,
    PneuHistoriqueTabComponent,
  ],
  template: `
    <div class="pneu-detail-page">
      @if (loading()) {
        <div style="padding:32px">
          <app-skeleton [rows]="4" height="32px" />
        </div>
      } @else if (pneu()) {

        <!-- Breadcrumb -->
        <app-breadcrumb [items]="breadcrumbItems()" />

        <!-- Header -->
        <div class="pneu-detail__header">
          <div class="pneu-detail__header-main">
            <!-- Tire icon -->
            <div class="pneu-detail__icon">
              <lucide-icon name="circle" [size]="36" color="#fff" />
            </div>

            <!-- Info block -->
            <div class="pneu-detail__info">
              <div class="pneu-detail__info-title-row">
                <span class="pneu-detail__name">
                  {{ pneu()!.marque ?? 'Pneu' }}
                  @if (pneu()!.nSerie) { · {{ pneu()!.nSerie }} }
                </span>
                <app-sev-badge [type]="sevType()" />
              </div>
              <div class="pneu-detail__info-meta">
                <span>Position {{ pneu()!.position }} · {{ pneu()!.vehicule.code }}</span>
                <span class="pneu-detail__km-bold">{{ pneu()!.kmParcourus | number }} km parcourus</span>
                @if (pneu()!.kmRestant != null) {
                  <span class="pneu-detail__km-restant">{{ pneu()!.kmRestant! | number }} km restants</span>
                }
              </div>
            </div>
          </div>

          <!-- Tab group -->
          <app-tab-group
            [tabs]="tabs"
            [activeIndex]="activeTabIndex()"
            (tabChange)="onTabChange($event)"
          />
        </div>

        <!-- Tab content -->
        <div class="pneu-detail__content">

          <!-- KPI row (visible on overview & activite) -->
          @if (activeTab() === 'overview' || activeTab() === 'activite') {
            <div class="pneu-detail__kpi-row">
              <app-kpi-card
                label="Pression"
                [value]="pneu()!.pressionPsi != null ? (pneu()!.pressionPsi! + ' PSI') : '—'"
                [accent]="true"
              />
              <app-kpi-card
                label="Profondeur"
                [value]="pneu()!.profondeur32e != null ? (pneu()!.profondeur32e! + '/32\"') : '—'"
              />
              <app-kpi-card
                label="Dernier montage"
                [value]="pneu()!.dateMontage ?? '—'"
              />
              <app-kpi-card
                label="KM parcourus"
                [value]="(pneu()!.kmParcourus | number) + ' km'"
              />
            </div>
          }

          <!-- Vue d'ensemble -->
          @if (activeTab() === 'overview') {
            <div class="pneu-detail__grid-2">
              <app-card title="Spécifications">
                <div class="spec-list">
                  @for (row of specRows(); track row.label) {
                    <div class="spec-row">
                      <span class="spec-label">{{ row.label }}</span>
                      <span class="spec-value">{{ row.value }}</span>
                    </div>
                  }
                </div>
              </app-card>

              <app-card title="État actuel">
                <div class="spec-list">
                  @for (row of stateRows(); track row.label) {
                    <div class="spec-row">
                      <span class="spec-label">{{ row.label }}</span>
                      <span class="spec-value spec-value--strong">{{ row.value }}</span>
                    </div>
                  }
                </div>
              </app-card>
            </div>
          }

          <!-- Activité (inspections table) -->
          @if (activeTab() === 'activite') {
            <app-card title="Activité du pneu">
              <app-pneu-inspections-tab [pneuId]="pneu()!.id" />
            </app-card>
          }

          <!-- Inspections (full form) -->
          @if (activeTab() === 'inspections') {
            <app-pneu-details-tab [pneu]="pneu()!" />
          }

          <!-- Historique -->
          @if (activeTab() === 'historique') {
            <app-pneu-historique-tab [pneuId]="pneu()!.id" />
          }

        </div>

      } @else {
        <app-empty-state message="Pneu introuvable" />
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .pneu-detail-page {
      background: #F5F5F5;
      min-height: calc(100vh - 72px);
      animation: screenEnter 400ms ease both;
    }

    /* ── Header ─────────────────────────────────────────── */
    .pneu-detail__header {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 20px 32px 0;
    }

    .pneu-detail__header-main {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-bottom: 16px;
    }

    .pneu-detail__icon {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      background: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pneu-detail__info { flex: 1; }

    .pneu-detail__info-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .pneu-detail__name {
      font-family: 'Montserrat', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text);
    }

    .pneu-detail__info-meta {
      display: flex;
      gap: 20px;
      align-items: center;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .pneu-detail__km-bold {
      font-weight: 600;
      color: var(--color-text);
    }

    .pneu-detail__km-restant {
      font-weight: 600;
      color: var(--color-danger, #EF4444);
    }

    /* ── Content ─────────────────────────────────────────── */
    .pneu-detail__content {
      padding: 24px 32px 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ── KPI row ─────────────────────────────────────────── */
    .pneu-detail__kpi-row {
      display: flex;
      gap: 16px;
    }

    /* ── 2-col grid ──────────────────────────────────────── */
    .pneu-detail__grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    /* ── Spec list ───────────────────────────────────────── */
    .spec-list { display: flex; flex-direction: column; }

    .spec-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid var(--color-border);
    }
    .spec-row:last-child { border-bottom: none; }

    .spec-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .spec-value {
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      color: var(--color-text);
    }

    .spec-value--strong {
      font-weight: 700;
    }
  `],
})
export class PneuDetailComponent {
  private route = inject(ActivatedRoute);
  private pneuService = inject(PneuService);

  activeTab = signal<TabId>('overview');
  loading = signal(true);

  tabs = [
    { label: "Vue d'ensemble" },
    { label: 'Activité' },
    { label: 'Inspections' },
    { label: 'Historique' },
  ];

  readonly tabIds: TabId[] = ['overview', 'activite', 'inspections', 'historique'];

  activeTabIndex = computed(() => this.tabIds.indexOf(this.activeTab()));

  pneu = toSignal<Pneu | null>(
    (() => {
      const idParam = this.route.snapshot.paramMap.get('id');
      const pneuId = idParam ? Number(idParam) : NaN;
      if (isNaN(pneuId) || pneuId <= 0) { this.loading.set(false); return of(null); }
      return this.pneuService.get(pneuId).pipe(
        tap({ next: () => this.loading.set(false), error: () => this.loading.set(false) }),
        catchError(() => of(null)),
      );
    })(),
    { initialValue: null },
  );

  breadcrumbItems = computed(() => {
    const p = this.pneu();
    return [
      { label: 'Véhicules', route: '/vehicules' },
      ...(p ? [{ label: p.vehicule.code, route: `/vehicules/${p.vehicule.id}` }] : []),
      { label: 'Pneus' },
      ...(p ? [{ label: `P${p.position} — ${p.marque ?? p.nSerie ?? 'Pneu'}` }] : []),
    ];
  });

  sevType = computed<'warning' | 'critical' | 'success'>(() => {
    const s = this.pneu()?.status;
    if (s === 'ok') return 'success';
    if (s === 'warn') return 'warning';
    return 'critical';
  });

  specRows = computed(() => {
    const p = this.pneu();
    if (!p) return [];
    return [
      { label: 'Marque',           value: p.marque ?? '—' },
      { label: 'N° Série',         value: p.nSerie ?? '—' },
      { label: 'Position',         value: `Position ${p.position}` },
      { label: 'Véhicule',         value: p.vehicule.code },
      { label: 'Date montage',     value: p.dateMontage ?? '—' },
      { label: 'KM au montage',    value: p.kmMontage != null ? `${p.kmMontage.toLocaleString()} km` : '—' },
      { label: 'Durée de vie',     value: `${p.expectedLifeKm.toLocaleString()} km` },
    ];
  });

  stateRows = computed(() => {
    const p = this.pneu();
    if (!p) return [];
    return [
      { label: 'KM parcourus',          value: `${p.kmParcourus.toLocaleString()} km` },
      { label: 'KM restants',           value: p.kmRestant != null ? `${p.kmRestant.toLocaleString()} km` : '—' },
      { label: 'Pression dernier relevé', value: p.pressionPsi != null ? `${p.pressionPsi} PSI` : '—' },
      { label: 'Profondeur dernier relevé', value: p.profondeur32e != null ? `${p.profondeur32e}/32"` : '—' },
    ];
  });

  onTabChange(index: number): void {
    this.activeTab.set(this.tabIds[index] ?? 'overview');
  }
}
