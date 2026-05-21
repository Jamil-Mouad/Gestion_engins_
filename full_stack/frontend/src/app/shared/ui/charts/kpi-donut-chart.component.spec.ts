import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiDonutChartComponent } from './kpi-donut-chart.component';

describe('KpiDonutChartComponent', () => {
  let fixture: ComponentFixture<KpiDonutChartComponent>;
  let component: KpiDonutChartComponent;

  const mockData = [
    { label: 'Carburant', value: 45000, color: '#F7941D' },
    { label: 'Maintenance', value: 22000, color: '#F59E0B' },
    { label: 'Pièces', value: 18000, color: '#0EA5E9' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpiDonutChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(KpiDonutChartComponent);
    component = fixture.componentInstance;
    component.data = mockData;
    component.centerLabel = '85K';
    component.centerSub = 'MAD total';
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should render an SVG element', () => {
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
  });

  it('should render one path per data slice', () => {
    const paths = fixture.nativeElement.querySelectorAll('path');
    expect(paths.length).toBe(mockData.length);
  });

  it('should display center label', () => {
    expect(fixture.nativeElement.textContent).toContain('85K');
  });

  it('should display center sub-label', () => {
    expect(fixture.nativeElement.textContent).toContain('MAD total');
  });

  it('should compute slices with paths', () => {
    const slices = component.slices();
    expect(slices.length).toBe(3);
    slices.forEach(s => expect(s.path.length).toBeGreaterThan(0));
  });

  it('should handle empty data without error', () => {
    component.data = [];
    fixture.detectChanges();
    expect(component.slices().length).toBe(0);
  });
});
