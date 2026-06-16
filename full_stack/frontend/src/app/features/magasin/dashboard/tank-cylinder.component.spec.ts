import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TankCylinderComponent } from './tank-cylinder.component';

describe('TankCylinderComponent', () => {
  let fixture: ComponentFixture<TankCylinderComponent>;
  let component: TankCylinderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TankCylinderComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TankCylinderComponent);
    component = fixture.componentInstance;
  });

  function setInputs(litres: number, capacite: number, densite = 0.845): void {
    fixture.componentRef.setInput('litres', litres);
    fixture.componentRef.setInput('capacite', capacite);
    fixture.componentRef.setInput('densite', densite);
    fixture.detectChanges();
  }

  it('computes fill percentage from litres / capacite', () => {
    setInputs(10000, 20000);
    expect(component.pct()).toBe(50);
  });

  it('clamps percentage to [0, 100]', () => {
    setInputs(25000, 20000);
    expect(component.pct()).toBe(100);
    setInputs(-50, 20000);
    expect(component.pct()).toBe(0);
  });

  it('returns 0% when capacity is missing', () => {
    setInputs(5000, 0);
    expect(component.pct()).toBe(0);
  });

  it('converts litres to tonnes via density', () => {
    setInputs(10000, 20000, 0.845);
    expect(component.tonnes()).toBeCloseTo(8.45, 3);
  });

  it('shows the tooltip with liters and tonnage on hover', () => {
    setInputs(10000, 20000);
    component.hovered.set(true);
    fixture.detectChanges();
    const tooltip: HTMLElement = fixture.nativeElement.querySelector('.tank-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('L');
    expect(tooltip.textContent).toContain('t');
  });
});
