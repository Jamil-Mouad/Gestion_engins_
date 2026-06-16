import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  let fixture: ComponentFixture<KpiCardComponent>;
  let component: KpiCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpiCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(KpiCardComponent);
    component = fixture.componentInstance;
    component.label = 'Disponibilité';
    component.value = '94.2%';
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display the value', () => {
    const el = fixture.nativeElement.querySelector('.kpi-value');
    expect(el?.textContent?.trim()).toBe('94.2%');
  });

  it('should display the label', () => {
    const el = fixture.nativeElement.querySelector('.kpi-label');
    expect(el?.textContent?.trim()).toBe('Disponibilité');
  });

  it('should hide variation when not provided', () => {
    const el = fixture.nativeElement.querySelector('.kpi-variation');
    expect(el).toBeNull();
  });

  it('should show variation when provided', () => {
    component.variation = '+2.3%';
    component.varType = 'positive';
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.kpi-variation');
    expect(el?.textContent?.trim()).toBe('+2.3%');
    expect(el?.style.color).toBeTruthy();
  });

  it('should apply accent border when accent=true', () => {
    component.accent = true;
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.style.getPropertyValue('--kpi-left-border')).toBe('4px solid var(--color-primary)');
  });

  it('should not apply the compact class by default', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList.contains('compact')).toBe(false);
  });

  it('should apply the compact class when compact=true', () => {
    component.compact = true;
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.classList.contains('compact')).toBe(true);
  });
});
