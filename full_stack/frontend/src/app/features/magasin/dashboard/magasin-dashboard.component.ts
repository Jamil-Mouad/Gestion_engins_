import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { GridsterConfig, DisplayGrid, GridType, CompactType, Gridster, GridsterItem } from 'angular-gridster2';
import { LucideAngularModule } from 'lucide-angular';
import {
  KpiCardComponent, KpiBarChartComponent, KpiDonutChartComponent,
  SkeletonComponent, EmptyStateComponent,
} from '../../../shared/ui';
import { BarChartItem } from '../../../shared/ui/charts/kpi-bar-chart.component';
import { DonutSlice } from '../../../shared/ui/charts/kpi-donut-chart.component';
import { DashboardConfig, DashboardWidgetConfig } from '../../../shared/models/dashboard.model';
import { ManageWidgetsModalComponent } from '../../dashboard/manage-widgets-modal.component';
import { MagasinApiService } from '../services/magasin-api.service';
import { DashboardKpi } from '../models/magasin.model';
import { downloadBlobAs } from '../../../shared/utils/download-blob';
import { TankCylinderComponent } from './tank-cylinder.component';
import { SortieFormModalComponent } from '../sorties/sortie-form-modal.component';
import { ArrivageFormModalComponent } from '../arrivages/arrivage-form-modal.component';
import { JaugeageFormModalComponent } from '../jaugeages/jaugeage-form-modal.component';

const TYPE_LABELS: Record<string, string> = {
  camion: 'Camions',
  camion_tracteur: 'Tracteurs',
  semi_remorque: 'Semi-remorques',
  engin: 'Engins',
  tiers: 'Tiers',
};

const TYPE_COLORS: Record<string, string> = {
  camion: '#F7941D',
  camion_tracteur: '#3B82F6',
  semi_remorque: '#8B5CF6',
  engin: '#10B981',
  tiers: '#9CA3AF',
};

const LS_KEY = 'magasin.dashboard.layout';
const ROW_HEIGHT = 110;
const GRID_MARGIN = 12;

const DEFAULT_CONFIG: DashboardConfig = [
  { id: 'stock-actuel', x: 0, y: 0, cols: 2, rows: 1, visible: true },
  { id: 'autonomie', x: 2, y: 0, cols: 1, rows: 1, visible: true },
  { id: 'conso-mois', x: 3, y: 0, cols: 1, rows: 1, visible: true },
  { id: 'dernier-arrivage', x: 4, y: 0, cols: 1, rows: 1, visible: true },
  { id: 'arrivages-annee', x: 5, y: 0, cols: 1, rows: 1, visible: true },
  { id: 'citerne', x: 0, y: 1, cols: 3, rows: 4, visible: true },
  { id: 'conso-12-mois', x: 3, y: 1, cols: 3, rows: 4, visible: true },
  { id: 'top-consommateurs', x: 0, y: 5, cols: 3, rows: 4, visible: true },
  { id: 'repartition-type', x: 3, y: 5, cols: 3, rows: 4, visible: true },
  { id: 'valeur-conso', x: 0, y: 9, cols: 2, rows: 1, visible: false },
  { id: 'ecart-jaugeage', x: 2, y: 9, cols: 2, rows: 1, visible: false },
  { id: 'bilan-annee', x: 4, y: 9, cols: 2, rows: 2, visible: false },
];

const ALL_WIDGET_IDS = DEFAULT_CONFIG.map(w => w.id);

const WIDGET_GROUPS = [
  { label: 'KPIs', ids: ['stock-actuel', 'autonomie', 'conso-mois', 'dernier-arrivage', 'arrivages-annee', 'valeur-conso'] },
  { label: 'Citerne', ids: ['citerne', 'ecart-jaugeage'] },
  { label: 'Analyse', ids: ['conso-12-mois', 'top-consommateurs', 'repartition-type', 'bilan-annee'] },
];

const WIDGET_LABELS: Record<string, string> = {
  'stock-actuel': 'Stock actuel',
  'autonomie': 'Autonomie estimée',
  'conso-mois': 'Conso. du mois',
  'dernier-arrivage': 'Dernier arrivage',
  'arrivages-annee': 'Arrivages de l’année',
  'valeur-conso': 'Valeur consommée (mois)',
  'citerne': 'Citerne',
  'ecart-jaugeage': 'Écart de jaugeage',
  'conso-12-mois': 'Consommation — 12 mois',
  'top-consommateurs': 'Top consommateurs',
  'repartition-type': 'Répartition par type',
  'bilan-annee': 'Bilan année — arrivages vs sorties',
};

@Component({
  selector: 'app-magasin-dashboard',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule, LucideAngularModule,
    Gridster, GridsterItem, ManageWidgetsModalComponent,
    KpiCardComponent, KpiBarChartComponent, KpiDonutChartComponent,
    SkeletonComponent, EmptyStateComponent,
    TankCylinderComponent,
    SortieFormModalComponent, ArrivageFormModalComponent, JaugeageFormModalComponent,
  ],
  template: `
    <div class="magasin-page" style="animation: screenEnter 400ms ease both">
      <header class="page-head">
        <div class="page-head__left">
          <h1 class="page-title">Gasoil</h1>
          <input type="month" class="month-input" [ngModel]="month()" (ngModelChange)="onMonthChange($event)" />
        </div>
        <div class="page-head__actions">
          <button class="btn-secondary" type="button" (click)="showManageWidgets.set(true)">
            <lucide-icon name="layout-grid" [size]="15" /> Gérer les widgets
          </button>
          <button class="btn-secondary" type="button" [disabled]="exporting()" (click)="exportExcel()">
            <lucide-icon name="download" [size]="15" /> {{ exporting() ? 'Export…' : 'Export Excel' }}
          </button>
          <button class="btn-secondary" type="button" (click)="showJaugeageForm.set(true)">
            <lucide-icon name="ruler" [size]="15" /> Jaugeage du jour
          </button>
          <button class="btn-secondary" type="button" (click)="showArrivageForm.set(true)">
            <lucide-icon name="truck" [size]="15" /> Arrivage
          </button>
          <button class="btn-primary" type="button" (click)="showSortieForm.set(true)">+ Sortie carburant</button>
        </div>
      </header>

      <div class="magasin-content">
        @if (loading()) {
          <app-skeleton [rows]="4" height="120px" />
        } @else if (!kpi()) {
          <app-empty-state icon="fuel" message="Impossible de charger les indicateurs du magasin." />
        } @else if (kpi(); as k) {
          <div class="dashboard-grid" [style.height.px]="gridHeight()">
            <gridster [options]="options">
              @for (item of visibleItems(); track item.id) {
                <gridster-item [item]="item">
                  @switch (item.id) {
                    @case ('stock-actuel') {
                      <app-kpi-card
                        [compact]="true"
                        label="Stock actuel"
                        [value]="(k.stockActuelLitres | number:'1.0-0') + ' L'"
                        [variation]="(k.stockActuelTonnes | number:'1.2-2') + ' t' + (k.pctRemplissage !== null ? ' · ' + (k.pctRemplissage | number:'1.0-1') + ' %' : '')"
                        varType="neutral" />
                    }
                    @case ('autonomie') {
                      <app-kpi-card
                        [compact]="true"
                        label="Autonomie estimée"
                        [value]="k.autonomieJours !== null ? (k.autonomieJours | number:'1.0-0') + ' j' : '—'"
                        [variation]="(k.consoMoyenneJourLitres | number:'1.0-0') + ' L/jour (30 j)'"
                        [varType]="autonomieVarType()" />
                    }
                    @case ('conso-mois') {
                      <app-kpi-card
                        [compact]="true"
                        label="Conso. du mois"
                        [value]="(k.consoMoisLitres | number:'1.0-0') + ' L'"
                        [variation]="k.consoMoisValeurHt !== null ? ((k.consoMoisValeurHt | number:'1.0-0') + ' DH HT') : undefined"
                        varType="neutral" />
                    }
                    @case ('dernier-arrivage') {
                      <app-kpi-card
                        [compact]="true"
                        label="Dernier arrivage"
                        [value]="k.dernierArrivage ? (k.dernierArrivage.quantiteLitres | number:'1.0-0') + ' L' : '—'"
                        [variation]="k.dernierArrivage ? ((k.dernierArrivage.date | date:'dd/MM/yyyy') ?? undefined) : undefined"
                        varType="neutral" />
                    }
                    @case ('arrivages-annee') {
                      <app-kpi-card
                        [compact]="true"
                        label="Arrivages {{ currentYear }}"
                        [value]="(k.arrivagesAnneeLitres | number:'1.0-0') + ' L'" />
                    }
                    @case ('valeur-conso') {
                      <app-kpi-card
                        [compact]="true"
                        label="Valeur consommée (mois)"
                        [value]="k.consoMoisValeurHt !== null ? (k.consoMoisValeurHt | number:'1.0-0') + ' DH HT' : '—'"
                        [variation]="(k.consoMoyenneJourLitres | number:'1.0-0') + ' L/jour en moyenne'"
                        varType="neutral" />
                    }
                    @case ('citerne') {
                      <div class="card card--tank">
                        <div class="card-title">Citerne</div>
                        <div class="tank-flex">
                          <app-tank-cylinder
                            [litres]="k.stockActuelLitres"
                            [capacite]="k.capaciteLitres"
                            [densite]="k.densiteKgParLitre"
                            [hauteurCm]="k.dernierJaugeage?.hauteurCm ?? null" />
                          <div class="tank-info">
                            @if (k.dernierJaugeage; as j) {
                              <div class="ti-block">
                                <span class="ti-label">Dernier jaugeage</span>
                                <span class="ti-value">{{ j.date | date:'dd/MM/yyyy' }}</span>
                                <span class="ti-sub">{{ j.hauteurCm | number:'1.0-1' }} cm → {{ j.litresMesures | number:'1.0-0' }} L</span>
                              </div>
                              <div class="ti-block">
                                <span class="ti-label">Écart vs théorique</span>
                                <span class="ecart-badge ecart-badge--{{ ecartLevel() }}">
                                  {{ j.ecartLitres > 0 ? '+' : '' }}{{ j.ecartLitres | number:'1.0-0' }} L
                                  @if (j.ecartPct !== null) {
                                    ({{ j.ecartPct > 0 ? '+' : '' }}{{ j.ecartPct | number:'1.0-1' }} %)
                                  }
                                </span>
                              </div>
                            } @else {
                              <div class="ti-block">
                                <span class="ti-label">Dernier jaugeage</span>
                                <span class="ti-sub">Aucun jaugeage saisi — utilisez « Jaugeage du jour »</span>
                              </div>
                            }
                            <div class="ti-block">
                              <span class="ti-label">Capacité</span>
                              <span class="ti-value">{{ k.capaciteLitres | number:'1.0-0' }} L</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                    @case ('ecart-jaugeage') {
                      <div class="card">
                        <div class="card-title">Écart de jaugeage</div>
                        @if (k.dernierJaugeage; as j) {
                          <span class="ecart-badge ecart-badge--{{ ecartLevel() }} ecart-badge--big">
                            {{ j.ecartLitres > 0 ? '+' : '' }}{{ j.ecartLitres | number:'1.0-0' }} L
                            @if (j.ecartPct !== null) {
                              ({{ j.ecartPct > 0 ? '+' : '' }}{{ j.ecartPct | number:'1.0-1' }} %)
                            }
                          </span>
                          <div class="ti-sub" style="margin-top:8px">vs théorique — jaugé le {{ j.date | date:'dd/MM/yyyy' }}</div>
                        } @else {
                          <div class="ti-sub">Aucun jaugeage saisi.</div>
                        }
                      </div>
                    }
                    @case ('conso-12-mois') {
                      <div class="card">
                        <div class="card-title">Consommation — 12 derniers mois</div>
                        @if (consoSeries().length > 0) {
                          <app-kpi-bar-chart [data]="consoSeries()" />
                        } @else {
                          <app-empty-state icon="bar-chart-3" message="Aucune sortie enregistrée." />
                        }
                      </div>
                    }
                    @case ('top-consommateurs') {
                      <div class="card">
                        <div class="card-title">Top consommateurs — {{ monthLabel() }}</div>
                        @if (topConsumers().length > 0) {
                          <app-kpi-bar-chart [data]="topConsumers()" />
                        } @else {
                          <app-empty-state icon="truck" message="Aucune sortie ce mois-ci." />
                        }
                      </div>
                    }
                    @case ('repartition-type') {
                      <div class="card">
                        <div class="card-title">Répartition par type — {{ monthLabel() }}</div>
                        @if (repartition().length > 0) {
                          <div class="donut-center">
                            <app-kpi-donut-chart
                              [data]="repartition()"
                              [centerLabel]="(k.consoMoisLitres | number:'1.0-0') ?? ''"
                              centerSub="litres" />
                          </div>
                        } @else {
                          <app-empty-state icon="disc" message="Aucune donnée pour ce mois." />
                        }
                      </div>
                    }
                    @case ('bilan-annee') {
                      <div class="card">
                        <div class="card-title">Bilan {{ currentYear }} — arrivages vs sorties</div>
                        <div class="bilan">
                          <div class="bilan-row">
                            <span class="bilan-label">Arrivages</span>
                            <div class="bilan-bar"><div class="bilan-fill bilan-fill--in" [style.width.%]="bilanPct(k.arrivagesAnneeLitres)"></div></div>
                            <span class="bilan-val">{{ k.arrivagesAnneeLitres | number:'1.0-0' }} L</span>
                          </div>
                          <div class="bilan-row">
                            <span class="bilan-label">Sorties</span>
                            <div class="bilan-bar"><div class="bilan-fill bilan-fill--out" [style.width.%]="bilanPct(sortiesAnnee())"></div></div>
                            <span class="bilan-val">{{ sortiesAnnee() | number:'1.0-0' }} L</span>
                          </div>
                          <div class="bilan-net" [class.bilan-net--neg]="bilanNet() < 0">
                            Net : {{ bilanNet() > 0 ? '+' : '' }}{{ bilanNet() | number:'1.0-0' }} L
                          </div>
                        </div>
                      </div>
                    }
                  }
                </gridster-item>
              }
            </gridster>
          </div>
        }
      </div>

      @if (showManageWidgets()) {
        <app-manage-widgets-modal
          [allWidgets]="allWidgets"
          [currentConfig]="widgetConfigs()"
          [widgetGroups]="widgetGroups"
          [widgetLabels]="widgetLabels"
          (configChanged)="onWidgetsChanged($event)"
          (close)="showManageWidgets.set(false)" />
      }
      @if (showSortieForm()) {
        <app-sortie-form-modal (saved)="onMutated(); showSortieForm.set(false)" (cancelled)="showSortieForm.set(false)" />
      }
      @if (showArrivageForm()) {
        <app-arrivage-form-modal (saved)="onMutated(); showArrivageForm.set(false)" (cancelled)="showArrivageForm.set(false)" />
      }
      @if (showJaugeageForm()) {
        <app-jaugeage-form-modal (saved)="onMutated(); showJaugeageForm.set(false)" (cancelled)="showJaugeageForm.set(false)" />
      }
    </div>
  `,
  styles: [`
    @keyframes screenEnter { from { opacity: 0; } to { opacity: 1; } }
    .magasin-page { background: #F5F5F5; min-height: calc(100vh - 88px); }
    .page-head {
      background: white;
      border-bottom: 1px solid var(--color-border);
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .page-head__left { display: flex; align-items: center; gap: 16px; }
    .page-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 26px;
      font-weight: 700;
      color: var(--color-text, #111827);
      margin: 0;
    }
    .month-input {
      height: 36px;
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 8px;
      padding: 0 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--color-text, #111827);
    }
    .page-head__actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-primary {
      height: 36px; padding: 0 16px; border-radius: 8px; border: none;
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--color-primary, #F7941D); color: #fff;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: filter 150ms; white-space: nowrap;
    }
    .btn-primary:hover { filter: brightness(0.95); }
    .btn-secondary {
      height: 36px; padding: 0 14px; border-radius: 8px;
      display: inline-flex; align-items: center; gap: 6px;
      border: 1px solid var(--color-border, #E5E7EB);
      background: white;
      font-family: 'Open Sans', sans-serif; font-size: 13px; font-weight: 600;
      color: var(--color-text-secondary, #374151);
      cursor: pointer; transition: background 150ms; white-space: nowrap;
    }
    .btn-secondary:hover { background: #F9FAFB; }
    .magasin-content { padding: 20px 32px 40px; }
    .dashboard-grid { min-height: 300px; }
    gridster { background: transparent; }
    gridster-item { border-radius: 12px; background: transparent; }
    .card {
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #E5E7EB);
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      height: 100%;
      box-sizing: border-box;
      overflow: auto;
    }
    app-kpi-card { height: 100%; display: block; }
    .card-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #111827);
      margin-bottom: 16px;
    }
    .tank-flex { display: flex; gap: 28px; align-items: center; }
    .tank-info { display: flex; flex-direction: column; gap: 18px; }
    .ti-block { display: flex; flex-direction: column; gap: 4px; }
    .ti-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: var(--color-text-muted, #9CA3AF);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .ti-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text, #111827);
    }
    .ti-sub { font-family: 'Open Sans', sans-serif; font-size: 12px; color: #6B7280; }
    .ecart-badge {
      display: inline-flex;
      align-items: center;
      align-self: flex-start;
      padding: 4px 12px;
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
    }
    .ecart-badge--big { font-size: 18px; padding: 8px 18px; }
    .ecart-badge--ok { background: #D1FAE5; color: #065F46; }
    .ecart-badge--warn { background: #FEF3C7; color: #92400E; }
    .ecart-badge--alert { background: #FEE2E2; color: #991B1B; }
    .donut-center { display: flex; justify-content: center; padding: 8px 0; }
    .bilan { display: flex; flex-direction: column; gap: 12px; }
    .bilan-row { display: flex; align-items: center; gap: 10px; }
    .bilan-label {
      font-family: 'Open Sans', sans-serif; font-size: 12px; font-weight: 600;
      color: var(--color-text-muted, #6B7280); width: 70px; flex-shrink: 0;
    }
    .bilan-bar { flex: 1; height: 14px; background: #F0F0F0; border-radius: 7px; overflow: hidden; }
    .bilan-fill { height: 100%; border-radius: 7px; transition: width 400ms ease; }
    .bilan-fill--in { background: #10B981; }
    .bilan-fill--out { background: var(--color-primary, #F7941D); }
    .bilan-val {
      font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700;
      color: var(--color-text, #111827); width: 90px; text-align: right; flex-shrink: 0;
    }
    .bilan-net {
      font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700;
      color: #065F46; margin-top: 4px;
    }
    .bilan-net--neg { color: #991B1B; }
  `],
})
export class MagasinDashboardComponent implements OnDestroy {
  private api = inject(MagasinApiService);
  private destroy$ = new Subject<void>();
  private layoutChange$ = new Subject<void>();

  readonly currentYear = new Date().getFullYear();
  readonly allWidgets = ALL_WIDGET_IDS;
  readonly widgetGroups = WIDGET_GROUPS;
  readonly widgetLabels = WIDGET_LABELS;

  kpi = signal<DashboardKpi | null>(null);
  loading = signal(true);
  exporting = signal(false);
  month = signal(new Date().toISOString().slice(0, 7));
  showSortieForm = signal(false);
  showArrivageForm = signal(false);
  showJaugeageForm = signal(false);
  showManageWidgets = signal(false);
  widgetConfigs = signal<DashboardConfig>([]);
  gridHeight = signal(0);

  options: GridsterConfig = {
    draggable: { enabled: true },
    resizable: { enabled: true },
    pushItems: true,
    compactType: CompactType.None,
    gridType: GridType.VerticalFixed,
    fixedRowHeight: 110,
    displayGrid: DisplayGrid.None,
    margin: GRID_MARGIN,
    minCols: 6,
    maxCols: 6,
    itemChangeCallback: () => { this.layoutChange$.next(); this.recomputeGridHeight(); },
    itemResizeCallback: () => { this.layoutChange$.next(); this.recomputeGridHeight(); },
  };

  visibleItems = computed(() => this.widgetConfigs().filter((w: DashboardWidgetConfig) => w.visible));

  monthLabel = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  autonomieVarType = computed<'positive' | 'negative' | 'warning' | 'neutral'>(() => {
    const a = this.kpi()?.autonomieJours;
    if (a === null || a === undefined) return 'neutral';
    if (a < 7) return 'negative';
    if (a < 15) return 'warning';
    return 'positive';
  });

  ecartLevel = computed<'ok' | 'warn' | 'alert'>(() => {
    const j = this.kpi()?.dernierJaugeage;
    if (!j) return 'ok';
    const pct = j.ecartPct !== null ? Math.abs(j.ecartPct) : null;
    if (pct !== null) {
      if (pct <= 1) return 'ok';
      if (pct <= 3) return 'warn';
      return 'alert';
    }
    const abs = Math.abs(j.ecartLitres);
    if (abs <= 100) return 'ok';
    if (abs <= 400) return 'warn';
    return 'alert';
  });

  consoSeries = computed<BarChartItem[]>(() =>
    (this.kpi()?.consoParMois ?? []).map(m => ({
      label: m.mois,
      value: m.litres,
      display: `${Math.round(m.litres).toLocaleString('fr-FR')} L`,
    })));

  topConsumers = computed<BarChartItem[]>(() =>
    (this.kpi()?.topConsommateurs ?? []).map(t => ({
      label: t.label,
      value: t.litres,
      display: `${Math.round(t.litres).toLocaleString('fr-FR')} L`,
    })));

  repartition = computed<DonutSlice[]>(() =>
    (this.kpi()?.repartitionParType ?? [])
      .filter(r => r.litres > 0)
      .map(r => ({
        label: TYPE_LABELS[r.categorie] ?? r.categorie,
        value: r.litres,
        color: TYPE_COLORS[r.categorie] ?? '#6B7280',
      })));

  sortiesAnnee = computed<number>(() =>
    (this.kpi()?.consoParMois ?? [])
      .filter(m => m.mois.startsWith(String(this.currentYear)))
      .reduce((acc, m) => acc + m.litres, 0));

  bilanNet = computed<number>(() => (this.kpi()?.arrivagesAnneeLitres ?? 0) - this.sortiesAnnee());

  constructor() {
    this.load();
    this.loadConfig();
    this.layoutChange$.pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => this.saveConfig());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  bilanPct(value: number): number {
    const max = Math.max(this.kpi()?.arrivagesAnneeLitres ?? 0, this.sortiesAnnee());
    return max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  }

  onMonthChange(value: string): void {
    if (!value) return;
    this.month.set(value);
    this.load();
  }

  onMutated(): void {
    this.load();
  }

  onWidgetsChanged(config: DashboardConfig): void {
    this.widgetConfigs.set(config);
    this.showManageWidgets.set(false);
    this.recomputeGridHeight();
    this.saveConfig();
  }

  exportExcel(): void {
    this.exporting.set(true);
    this.api.exportExcel({
      entites: ['kpis', 'sorties', 'arrivages', 'jaugeages'],
      month: this.month(),
    }).subscribe({
      next: blob => {
        this.exporting.set(false);
        downloadBlobAs(blob, `magasin-gasoil-${this.month()}.xlsx`);
      },
      error: () => this.exporting.set(false),
    });
  }

  private loadConfig(): void {
    let config: DashboardConfig | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DashboardConfig;
        if (Array.isArray(parsed) && parsed.length > 0
            && parsed.every(w => typeof w?.id === 'string' && ALL_WIDGET_IDS.includes(w.id))) {
          config = parsed;
          // Widgets shipped after the user saved a layout get appended (hidden).
          for (const def of DEFAULT_CONFIG) {
            if (!config.some(w => w.id === def.id)) config.push({ ...def, visible: false });
          }
        }
      }
    } catch { /* corrupt localStorage — fall back to defaults */ }
    this.widgetConfigs.set(config ?? structuredClone(DEFAULT_CONFIG));
    this.recomputeGridHeight();
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.widgetConfigs()));
    } catch { /* quota exceeded — non-fatal */ }
  }

  private recomputeGridHeight(): void {
    const rows = this.widgetConfigs()
      .filter(w => w.visible)
      .reduce((max, w) => Math.max(max, w.y + w.rows), 0);
    this.gridHeight.set(rows * (ROW_HEIGHT + GRID_MARGIN) + GRID_MARGIN);
  }

  private load(): void {
    this.loading.set(true);
    this.api.dashboardKpis(this.month()).subscribe({
      next: k => {
        this.kpi.set(k);
        this.loading.set(false);
      },
      error: () => {
        this.kpi.set(null);
        this.loading.set(false);
      },
    });
  }
}
