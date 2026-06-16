import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiAreaChartComponent } from './kpi-area-chart.component';

describe('KpiAreaChartComponent', () => {
  let fixture: ComponentFixture<KpiAreaChartComponent>;
  let component: KpiAreaChartComponent;

  const mockData = [88, 90, 87, 92, 95, 93, 91, 94, 96, 89, 92, 95];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpiAreaChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(KpiAreaChartComponent);
    component = fixture.componentInstance;
    component.data = mockData;
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should render an SVG element', () => {
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
  });

  it('should render dots for each data point', () => {
    const dots = fixture.nativeElement.querySelectorAll('circle');
    expect(dots.length).toBe(mockData.length);
  });

  it('should render the objective dashed line', () => {
    const lines = fixture.nativeElement.querySelectorAll('line[stroke-dasharray]');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('should render X axis month labels', () => {
    expect(fixture.nativeElement.textContent).toContain('Jan');
    expect(fixture.nativeElement.textContent).toContain('Déc');
  });

  it('should render Y axis percentage ticks', () => {
    expect(fixture.nativeElement.textContent).toContain('88%');
    expect(fixture.nativeElement.textContent).toContain('96%');
  });

  it('should compute linePath for data', () => {
    expect(component.linePath()).toContain('M');
    expect(component.linePath()).toContain('L');
  });
});
