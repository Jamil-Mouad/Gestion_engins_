import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LucideAngularModule, LayoutGrid, Download, Ruler, Truck } from 'lucide-angular';
import { of } from 'rxjs';

import { MagasinDashboardComponent } from './magasin-dashboard.component';
import { MagasinApiService } from '../services/magasin-api.service';
import { DashboardKpi } from '../models/magasin.model';

const KPI_FIXTURE: DashboardKpi = {
  month: '2026-06',
  stockActuelLitres: 9123,
  stockActuelTonnes: 7.7,
  capaciteLitres: 20000,
  pctRemplissage: 45.6,
  hauteurMaxCm: 260,
  densiteKgParLitre: 0.845,
  dernierJaugeage: {
    date: '2026-06-10',
    hauteurCm: 120,
    litresMesures: 9123,
    litresTheoriques: 9200,
    ecartLitres: -77,
    ecartPct: -0.8,
  },
  consoMoisLitres: 4200,
  consoMoisValeurHt: 46200,
  consoMoyenneJourLitres: 140,
  autonomieJours: 65,
  dernierArrivage: { date: '2026-06-01', quantiteLitres: 8000, fournisseur: 'AFRIQUIA' },
  arrivagesAnneeLitres: 30000,
  topConsommateurs: [{ label: 'CAM-409', vehiculeId: 1, litres: 900, nbSorties: 12 }],
  consoParMois: [{ mois: '2026-05', litres: 4100 }, { mois: '2026-06', litres: 4200 }],
  repartitionParType: [{ categorie: 'camion', litres: 3000 }, { categorie: 'engin', litres: 1200 }],
};

describe('MagasinDashboardComponent', () => {
  let fixture: ComponentFixture<MagasinDashboardComponent>;
  let component: MagasinDashboardComponent;
  let apiSpy: jasmine.SpyObj<MagasinApiService>;

  beforeEach(async () => {
    localStorage.removeItem('magasin.dashboard.layout');

    apiSpy = jasmine.createSpyObj('MagasinApiService', ['dashboardKpis', 'exportExcel']);
    apiSpy.dashboardKpis.and.returnValue(of(KPI_FIXTURE));
    apiSpy.exportExcel.and.returnValue(of(new Blob()));

    await TestBed.configureTestingModule({
      imports: [MagasinDashboardComponent, LucideAngularModule.pick({ LayoutGrid, Download, Ruler, Truck })],
      providers: [
        { provide: MagasinApiService, useValue: apiSpy },
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MagasinDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('magasin.dashboard.layout');
  });

  it('renders the default widgets inside a gridster grid', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('gridster')).not.toBeNull();
    const text = el.textContent ?? '';
    expect(text).toContain('Stock actuel');
    expect(text).toContain('Autonomie estimée');
    expect(text).toContain('Citerne');
    expect(text).toContain('Consommation — 12 derniers mois');
    expect(text).toContain('Top consommateurs');
    expect(text).toContain('Répartition par type');
  });

  it('does not render widgets that are hidden by default', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Bilan');
    expect(text).not.toContain('Valeur consommée');
  });

  it('the Stock actuel card has no orange accent border', () => {
    const kpiCard = (fixture.nativeElement as HTMLElement).querySelector('app-kpi-card') as HTMLElement;
    expect(kpiCard).not.toBeNull();
    expect(kpiCard.style.getPropertyValue('--kpi-left-border')).not.toContain('var(--color-primary)');
  });

  it('persists the layout to localStorage when widgets change', () => {
    const config = component.widgetConfigs().map(w =>
      w.id === 'bilan-annee' ? { ...w, visible: true } : w);
    component.onWidgetsChanged(config);
    const saved = JSON.parse(localStorage.getItem('magasin.dashboard.layout') ?? '[]');
    expect(saved.find((w: { id: string }) => w.id === 'bilan-annee')?.visible).toBeTrue();
  });

  it('restores a saved layout from localStorage', () => {
    localStorage.setItem('magasin.dashboard.layout', JSON.stringify(
      component.widgetConfigs().map(w => ({ ...w, visible: w.id === 'stock-actuel' }))));
    const fixture2 = TestBed.createComponent(MagasinDashboardComponent);
    fixture2.detectChanges();
    expect(fixture2.componentInstance.visibleItems().length).toBe(1);
    expect(fixture2.componentInstance.visibleItems()[0].id).toBe('stock-actuel');
  });

  it('uses lucide icons instead of emojis on the action buttons', () => {
    const head = (fixture.nativeElement as HTMLElement).querySelector('.page-head__actions') as HTMLElement;
    expect(head.textContent).not.toContain('📏');
    expect(head.textContent).not.toContain('🚛');
    expect(head.querySelectorAll('lucide-icon').length).toBeGreaterThanOrEqual(4);
  });
});
