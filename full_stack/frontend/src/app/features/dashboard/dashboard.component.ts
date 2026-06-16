import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridsterConfig, DisplayGrid, GridType, CompactType, Gridster, GridsterItem } from 'angular-gridster2';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { DashboardService } from './dashboard.service';
import { KpiSnapshot, DashboardConfig, DashboardWidgetConfig } from '../../shared/models/dashboard.model';
import { FleetOverviewWidgetComponent } from './widgets/fleet-overview/fleet-overview-widget.component';
import { CostMonthWidgetComponent } from './widgets/cost-month/cost-month-widget.component';
import { InterventionsOuvertesWidgetComponent } from './widgets/interventions-ouvertes/interventions-ouvertes-widget.component';
import { AlertesPneusWidgetComponent } from './widgets/alertes-pneus/alertes-pneus-widget.component';
import { CostChartWidgetComponent } from './widgets/cost-chart/cost-chart-widget.component';
import { InterventionDonutWidgetComponent } from './widgets/intervention-donut/intervention-donut-widget.component';
import { NotificationsRecapWidgetComponent } from './widgets/notifications-recap/notifications-recap-widget.component';
import { VidangesRetardWidgetComponent } from './widgets/vidanges-retard/vidanges-retard-widget.component';
import { ManageWidgetsModalComponent } from './manage-widgets-modal.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

const DEFAULT_CONFIG: DashboardConfig = [
  { id: 'fleet-overview', x: 0, y: 0, cols: 2, rows: 1, visible: true },
  { id: 'cost-month', x: 2, y: 0, cols: 2, rows: 1, visible: true },
  { id: 'interventions-ouvertes', x: 0, y: 1, cols: 2, rows: 1, visible: true },
  { id: 'alertes-pneus', x: 2, y: 1, cols: 2, rows: 1, visible: true },
];

const ALL_WIDGET_IDS = [
  'fleet-overview', 'cost-month', 'interventions-ouvertes', 'alertes-pneus',
  'cost-chart', 'intervention-donut', 'notifications-recap', 'vidanges-retard',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, Gridster, GridsterItem, SkeletonComponent,
    FleetOverviewWidgetComponent, CostMonthWidgetComponent, InterventionsOuvertesWidgetComponent,
    AlertesPneusWidgetComponent, CostChartWidgetComponent, InterventionDonutWidgetComponent,
    NotificationsRecapWidgetComponent, VidangesRetardWidgetComponent,
    ManageWidgetsModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styles: [`
    .dashboard-page {
      background: var(--color-surface-2, #F5F5F5);
      min-height: calc(100vh - 88px);
    }
    .dashboard-header {
      background: white;
      border-bottom: 1px solid var(--color-border);
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .dashboard-header__title {
      font-family: 'Montserrat', sans-serif;
      font-size: 26px;
      font-weight: 700;
      color: var(--color-text-primary, #111827);
      margin: 0;
    }
    .dashboard-header__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .compact-toggle {
      height: 36px;
      padding: 0 14px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: white;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-secondary, #374151);
      cursor: pointer;
      transition: all 150ms;
    }
    .compact-toggle--active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
      color: var(--color-primary-text);
    }
    .manage-widgets-btn {
      height: 36px;
      padding: 0 14px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: white;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-secondary, #374151);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 2px rgba(17,24,39,.06);
      transition: all 150ms;
    }
    .manage-widgets-btn:hover {
      background: var(--color-surface-2);
    }
    .dashboard-content {
      padding: 24px 32px 40px;
    }
  `],
})
export class DashboardComponent implements OnDestroy {
  private dashboardService = inject(DashboardService);
  private destroy$ = new Subject<void>();
  private layoutChange$ = new Subject<void>();

  kpis = signal<KpiSnapshot | null>(null);
  loading = signal(true);
  compactMode = signal(false);
  showManageWidgets = signal(false);
  widgetConfigs = signal<DashboardConfig>([]);

  allWidgets = ALL_WIDGET_IDS;

  options: GridsterConfig = {
    draggable: { enabled: true },
    resizable: { enabled: true },
    pushItems: true,
    compactType: CompactType.None,
    gridType: GridType.Fit,
    displayGrid: DisplayGrid.None,
    margin: 12,
    minCols: 4,
    maxCols: 4,
    minRows: 4,
    itemChangeCallback: () => this.layoutChange$.next(),
    itemResizeCallback: () => this.layoutChange$.next(),
  };

  visibleItems = computed(() => this.widgetConfigs().filter((w: DashboardWidgetConfig) => w.visible));

  constructor() {
    this.loadKpis();
    this.loadConfig();
    this.layoutChange$.pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => this.onSaveConfig());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadKpis(): void {
    this.dashboardService.getKpis()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: KpiSnapshot) => {
          this.kpis.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  loadConfig(): void {
    this.dashboardService.getDashboardConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config: DashboardConfig | null) => {
          if (!config || !Array.isArray(config) || config.length === 0) {
            this.widgetConfigs.set(structuredClone(DEFAULT_CONFIG));
          } else {
            this.widgetConfigs.set(config);
          }
        },
        error: () => {
          this.widgetConfigs.set(structuredClone(DEFAULT_CONFIG));
        },
      });
  }

  onSaveConfig(): void {
    this.dashboardService.saveDashboardConfig(this.widgetConfigs())
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  toggleCompactMode(): void {
    this.compactMode.update(v => !v);
    this.onSaveConfig();
  }

  onWidgetsChanged(config: DashboardConfig): void {
    this.widgetConfigs.set(config);
    this.showManageWidgets.set(false);
    this.onSaveConfig();
  }
}