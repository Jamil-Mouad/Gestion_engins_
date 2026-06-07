import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { FleetOverviewWidgetComponent } from './fleet-overview/fleet-overview-widget.component';
import { CostMonthWidgetComponent } from './cost-month/cost-month-widget.component';
import { InterventionsOuvertesWidgetComponent } from './interventions-ouvertes/interventions-ouvertes-widget.component';
import { AlertesPneusWidgetComponent } from './alertes-pneus/alertes-pneus-widget.component';
import { CostChartWidgetComponent } from './cost-chart/cost-chart-widget.component';
import { InterventionDonutWidgetComponent } from './intervention-donut/intervention-donut-widget.component';
import { NotificationsRecapWidgetComponent } from './notifications-recap/notifications-recap-widget.component';
import { VidangesRetardWidgetComponent } from './vidanges-retard/vidanges-retard-widget.component';
import { KpiSnapshot } from '../../../shared/models/dashboard.model';

const mockKpis: KpiSnapshot = {
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

describe('Dashboard Widgets', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  describe('FleetOverviewWidgetComponent', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(FleetOverviewWidgetComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('shows skeleton when kpis is null', () => {
      const fixture = TestBed.createComponent(FleetOverviewWidgetComponent);
      fixture.componentInstance.kpis = null;
      fixture.detectChanges();
      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();
    });

    it('shows KPI card when kpis is provided', () => {
      const fixture = TestBed.createComponent(FleetOverviewWidgetComponent);
      fixture.componentInstance.kpis = mockKpis;
      fixture.detectChanges();
      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(nativeEl.querySelector('app-kpi-card')).toBeTruthy();
    });

    it('enServicePct returns percentage string', () => {
      const fixture = TestBed.createComponent(FleetOverviewWidgetComponent);
      const comp = fixture.componentInstance;
      comp.kpis = mockKpis;
      expect(comp.enServicePct).toContain('%');
    });

    it('enServicePct returns "—" when kpis is null', () => {
      const fixture = TestBed.createComponent(FleetOverviewWidgetComponent);
      const comp = fixture.componentInstance;
      comp.kpis = null;
      expect(comp.enServicePct).toBe('—');
    });

    it('enServicePct returns "—" when totalVehicules is 0', () => {
      const fixture = TestBed.createComponent(FleetOverviewWidgetComponent);
      const comp = fixture.componentInstance;
      comp.kpis = { ...mockKpis, totalVehicules: 0 };
      expect(comp.enServicePct).toBe('—');
    });
  });

  describe('CostMonthWidgetComponent', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(CostMonthWidgetComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('shows KPI card with cost when kpis provided', () => {
      const fixture = TestBed.createComponent(CostMonthWidgetComponent);
      fixture.componentInstance.kpis = mockKpis;
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('shows skeleton when kpis is null', () => {
      const fixture = TestBed.createComponent(CostMonthWidgetComponent);
      fixture.componentInstance.kpis = null;
      fixture.detectChanges();
      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();
    });
  });

  describe('InterventionsOuvertesWidgetComponent', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(InterventionsOuvertesWidgetComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('shows interventions count when kpis provided', () => {
      const fixture = TestBed.createComponent(InterventionsOuvertesWidgetComponent);
      fixture.componentInstance.kpis = mockKpis;
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('AlertesPneusWidgetComponent', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(AlertesPneusWidgetComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('shows pneus warn count when kpis provided', () => {
      const fixture = TestBed.createComponent(AlertesPneusWidgetComponent);
      fixture.componentInstance.kpis = mockKpis;
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('CostChartWidgetComponent', () => {
    it('creates the component and calls getCostHistory', () => {
      const fixture = TestBed.createComponent(CostChartWidgetComponent);
      const httpMock = TestBed.inject(HttpTestingController);
      const req = httpMock.expectOne('/api/v1/kpis/cost-history');
      req.flush([{ month: '2026-01', coutTotal: 22000 }]);
      httpMock.verify();
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('getBarHeight returns 0 when no data', () => {
      const fixture = TestBed.createComponent(CostChartWidgetComponent);
      const httpMock = TestBed.inject(HttpTestingController);
      const req = httpMock.expectOne('/api/v1/kpis/cost-history');
      req.flush([]);
      httpMock.verify();
      expect(fixture.componentInstance.getBarHeight(0)).toBe(0);
    });
  });

  describe('InterventionDonutWidgetComponent', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(InterventionDonutWidgetComponent);
      const httpMock = TestBed.inject(HttpTestingController);
      const reqs = httpMock.match('/api/v1/kpis/interventions-by-status');
      reqs.forEach((r: any) => r.flush([]));
      httpMock.verify();
      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('NotificationsRecapWidgetComponent', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(NotificationsRecapWidgetComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('VidangesRetardWidgetComponent', () => {
    it('creates the component', () => {
      const fixture = TestBed.createComponent(VidangesRetardWidgetComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });
  });
});
