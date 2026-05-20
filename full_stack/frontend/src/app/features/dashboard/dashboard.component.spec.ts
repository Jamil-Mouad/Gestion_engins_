import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './dashboard.service';
import { KpiSnapshot, DashboardConfig } from '../../shared/models/dashboard.model';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  const mockKpi: KpiSnapshot = {
    totalVehicules: 50,
    enService: 42,
    enAtelier: 3,
    enMaintenance: 2,
    horsService: 3,
    coutInterventionsMois: 24750,
    coutMainOeuvre: 8200,
    coutPieces: 14500,
    coutSousTraitance: 2050,
    interventionsOuvertes: 7,
    vidangesEnRetard: 4,
    pneusWarnEmpty: 6,
    demandesEnAttente: 2,
  };

  const defaultConfig: DashboardConfig = [
    { id: 'fleet-overview', x: 0, y: 0, cols: 2, rows: 1, visible: true },
    { id: 'cost-month', x: 2, y: 0, cols: 2, rows: 1, visible: true },
    { id: 'interventions-ouvertes', x: 0, y: 1, cols: 2, rows: 1, visible: true },
    { id: 'alertes-pneus', x: 2, y: 1, cols: 2, rows: 1, visible: true },
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('DashboardService', [
      'getKpis', 'getDashboardConfig', 'saveDashboardConfig',
      'getCostHistory', 'getInterventionsByStatus',
    ]);
    spy.getKpis.and.returnValue(of(mockKpi));
    spy.getDashboardConfig.and.returnValue(of(defaultConfig));
    spy.saveDashboardConfig.and.returnValue(of(defaultConfig));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: spy },
      ],
    }).compileComponents();

    dashboardService = spy;
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('renders gridster grid', () => {
    fixture.detectChanges();
    const gridsterEl = fixture.nativeElement.querySelector('gridster');
    expect(gridsterEl).toBeTruthy();
  });

  it('shows 8 widget slots', () => {
    fixture.detectChanges();
    expect(component.allWidgets.length).toBe(8);
  });

  it('falls back to default 4-widget layout when config is null or malformed', () => {
    dashboardService.getDashboardConfig.and.returnValue(of(null as any));
    component.loadConfig();
    expect(component.widgetConfigs().length).toBe(4);
    expect(component.widgetConfigs()[0].id).toBe('fleet-overview');
  });

  it('compact mode toggle updates DashboardConfig.compactMode', () => {
    expect(component.compactMode()).toBe(false);
    component.toggleCompactMode();
    expect(component.compactMode()).toBe(true);
    expect(dashboardService.saveDashboardConfig).toHaveBeenCalled();
  });

  it('should debounce save on item change', fakeAsync(() => {
    fixture.detectChanges();
    dashboardService.saveDashboardConfig.calls.reset();
    // trigger layoutChange$ via itemChangeCallback
    component.options.itemChangeCallback!({} as any, {} as any);
    tick(999); // not yet
    expect(dashboardService.saveDashboardConfig).not.toHaveBeenCalled();
    tick(1); // now
    expect(dashboardService.saveDashboardConfig).toHaveBeenCalled();
  }));
});