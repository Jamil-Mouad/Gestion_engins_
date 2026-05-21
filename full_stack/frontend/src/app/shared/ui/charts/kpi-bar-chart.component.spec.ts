import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiBarChartComponent } from './kpi-bar-chart.component';

describe('KpiBarChartComponent', () => {
  let fixture: ComponentFixture<KpiBarChartComponent>;
  let component: KpiBarChartComponent;

  const mockData = [
    { label: 'Carburant', value: 45000, display: '45 000 MAD' },
    { label: 'Maintenance', value: 22000, display: '22 000 MAD' },
    { label: 'Pièces', value: 18000, display: '18 000 MAD' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpiBarChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(KpiBarChartComponent);
    component = fixture.componentInstance;
    component.data = mockData;
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should render one row per data item', () => {
    const rows = fixture.nativeElement.querySelectorAll('.bar-row');
    expect(rows.length).toBe(3);
  });

  it('should display labels', () => {
    expect(fixture.nativeElement.textContent).toContain('Carburant');
    expect(fixture.nativeElement.textContent).toContain('Maintenance');
  });

  it('should display display values', () => {
    expect(fixture.nativeElement.textContent).toContain('45 000 MAD');
    expect(fixture.nativeElement.textContent).toContain('22 000 MAD');
  });

  it('should make first bar 100% width (max)', () => {
    expect(component.barWidth(0)).toBe('100%');
  });

  it('should compute proportional width for other bars', () => {
    const w = component.barWidth(1);
    expect(w).not.toBe('100%');
    expect(w).toContain('%');
  });

  it('should apply bar fills in DOM', () => {
    const fills = fixture.nativeElement.querySelectorAll('.bar-fill');
    expect(fills.length).toBe(3);
  });

  it('should handle empty data', () => {
    component.data = [];
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.bar-row');
    expect(rows.length).toBe(0);
  });
});
