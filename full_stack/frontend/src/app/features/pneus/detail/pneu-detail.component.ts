import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
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
import { EditPneuModalComponent } from '../edit-pneu-modal.component';
import { ImageLightboxComponent } from '../../../shared/ui/image-lightbox/image-lightbox.component';
import { downloadBlobAs } from '../../../shared/utils/download-blob';
import { take } from 'rxjs/operators';

type TabId = 'overview' | 'inspections';

@Component({
  selector: 'app-pneu-detail',
  standalone: true,
  imports: [
    DecimalPipe,
    LucideAngularModule,
    BreadcrumbComponent, TabGroupComponent,
    CardComponent, KpiCardComponent,
    SkeletonComponent, EmptyStateComponent, SevBadgeComponent,
    PneuDetailsTabComponent, EditPneuModalComponent,
    ImageLightboxComponent,
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
            <!-- Tire icon / photo (real photo opens the lightbox) -->
            <div class="pneu-detail__icon">
              @if (pneu()!.photoUrl) {
                <app-image-lightbox [src]="pneu()!.photoUrl" [fill]="true" />
              } @else {
                <img src="assets/tire-default.svg"
                     [alt]="pneu()!.nSerie ?? 'pneu'"
                     class="pneu-detail__icon-img" />
              }
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
                <span>Position {{ pneu()!.position }} · {{ pneu()!.vehiculeCode ?? pneu()!.vehicule?.code ?? '—' }}</span>
                <span class="pneu-detail__km-bold">{{ pneu()!.kmParcourus | number }} km parcourus</span>
                @if (pneu()!.kmRestant != null) {
                  <span class="pneu-detail__km-restant">{{ pneu()!.kmRestant! | number }} km restants</span>
                }
              </div>
            </div>

            <!-- Actions -->
            <button class="btn-edit" type="button" [disabled]="downloadingFiche()" (click)="downloadFiche()">
              <lucide-icon name="download" [size]="14" />
              {{ downloadingFiche() ? '…' : 'Fiche PDF' }}
            </button>
            <button class="btn-edit" type="button" (click)="showEdit.set(true)">
              <lucide-icon name="edit" [size]="14" />
              Éditer
            </button>
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

          <!-- KPI row (visible on overview) -->
          @if (activeTab() === 'overview') {
            <div class="pneu-detail__kpi-row">
              <app-kpi-card
                label="Pression"
                [value]="pneu()!.pressionPsi != null ? (pneu()!.pressionPsi! + ' PSI') : '—'"
              />
              <app-kpi-card
                label="Profondeur"
                [value]="pneu()!.profondeur32e != null ? (pneu()!.profondeur32e! + '/32in') : '—'"
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

          <!-- Inspections (full form) -->
          @if (activeTab() === 'inspections') {
            <app-pneu-details-tab [pneu]="pneu()!" />
          }

        </div>

        <!-- Edit modal -->
        @if (showEdit()) {
          <app-edit-pneu-modal
            [pneu]="pneu()!"
            (saved)="onPneuEdited($event)"
            (close)="showEdit.set(false)" />
        }

      } @else {
        <app-empty-state message="Pneu introuvable" />
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .pneu-detail-page {
      background: #F5F5F5;
      min-height: calc(100vh - 88px);
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
      width: 100%;
    }

    .pneu-detail__icon {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      background: #F3F4F6;
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .pneu-detail__icon-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 6px;
    }
    .pneu-detail__icon app-image-lightbox { display: block; width: 100%; height: 100%; }

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

    /* ── Edit button ─────────────────────────────────────── */
    .btn-edit {
      height: 36px;
      padding: 0 14px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: white;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      flex-shrink: 0;
    }
    .btn-edit:hover { background: #F9FAFB; }

    /* ── Content ─────────────────────────────────────────── */
    .pneu-detail__content {
      padding: 24px 48px 40px;
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
      grid-template-columns: 3fr 2fr;
      gap: 24px;
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
  private destroyRef = inject(DestroyRef);

  activeTab = signal<TabId>('overview');
  loading = signal(true);
  showEdit = signal(false);
  downloadingFiche = signal(false);

  pneu = signal<Pneu | null>(null);

  downloadFiche(): void {
    const pneu = this.pneu();
    if (!pneu || this.downloadingFiche()) return;
    this.downloadingFiche.set(true);
    this.pneuService.downloadFiche(pneu.id).pipe(take(1)).subscribe({
      next: blob => { downloadBlobAs(blob, `fiche-pneu-${pneu.id}.pdf`); this.downloadingFiche.set(false); },
      error: () => this.downloadingFiche.set(false),
    });
  }

  tabs = [
    { label: "Vue d'ensemble" },
    { label: 'Inspections' },
  ];

  readonly tabIds: TabId[] = ['overview', 'inspections'];

  activeTabIndex = computed(() => this.tabIds.indexOf(this.activeTab()));

  constructor() {
    this.route.paramMap.pipe(
      tap(() => { this.loading.set(true); this.pneu.set(null); }),
      switchMap(pm => {
        const pneuId = Number(pm.get('id'));
        if (isNaN(pneuId) || pneuId <= 0) { this.loading.set(false); return of(null); }
        return this.pneuService.get(pneuId).pipe(
          tap({ next: () => this.loading.set(false), error: () => this.loading.set(false) }),
          catchError(() => { this.loading.set(false); return of(null); }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(data => this.pneu.set(data));
  }

  breadcrumbItems = computed(() => {
    const p = this.pneu();
    return [
      { label: 'Véhicules', route: '/vehicules' },
      ...(p ? [{ label: p.vehiculeCode ?? p.vehicule?.code ?? '—', route: `/vehicules/${p.vehiculeId ?? p.vehicule?.id}` }] : []),
      ...(p ? [{ label: 'Pneus', route: `/vehicules/${p.vehiculeId ?? p.vehicule?.id}`, queryParams: { tab: 'pneus' } as Record<string, string> }] : [{ label: 'Pneus' }]),
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
      { label: 'Référence',        value: p.reference ?? '—' },
      { label: 'Marque',           value: p.marque ?? '—' },
      { label: 'N° Série',         value: p.nSerie ?? '—' },
      { label: 'Position',         value: `Position ${p.position}` },
      { label: 'Véhicule',         value: p.vehiculeCode ?? p.vehicule?.code ?? '—' },
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

  onPneuEdited(updated: Pneu): void {
    this.pneu.set(updated);
    this.showEdit.set(false);
  }
}
