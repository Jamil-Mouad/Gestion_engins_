import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SevBadgeComponent, RequestStatusBadgeComponent, UrgencyBadgeComponent } from './badge.component';

describe('SevBadgeComponent', () => {
  let fixture: ComponentFixture<SevBadgeComponent>;
  let component: SevBadgeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SevBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(SevBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should render without error', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should show "Info" for type=info', () => {
    component.type = 'info';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Info');
  });

  it('should show "Préventive" for type=preventive', () => {
    component.type = 'preventive';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Préventive');
  });

  it('should show "Corrective" for type=corrective', () => {
    component.type = 'corrective';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Corrective');
  });

  it('should show "Dépannage" for type=depannage', () => {
    component.type = 'depannage';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Dépannage');
  });

  it('should show "Contrôle" for type=controle', () => {
    component.type = 'controle';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Contrôle');
  });

  it('should apply correct CSS class for type=critical', () => {
    component.type = 'critical';
    fixture.detectChanges();
    const span: HTMLElement = fixture.nativeElement.querySelector('.sev-badge');
    expect(span.classList.contains('sev-badge--critical')).toBeTrue();
  });
});

describe('RequestStatusBadgeComponent', () => {
  let fixture: ComponentFixture<RequestStatusBadgeComponent>;
  let component: RequestStatusBadgeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RequestStatusBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(RequestStatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should render without error', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should show "Nouvelle" for status=nouvelle', () => {
    component.status = 'nouvelle';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toContain('Nouvelle');
  });

  it('should show "Approuvée" for status=approuvee', () => {
    component.status = 'approuvee';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toContain('Approuvée');
  });

  it('should show "Rejetée" for status=rejetee', () => {
    component.status = 'rejetee';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toContain('Rejetée');
  });

  it('should show "Clôturée" for status=cloturee', () => {
    component.status = 'cloturee';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toContain('Clôturée');
  });

  it('should render the dot element', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rsb-dot')).toBeTruthy();
  });
});

describe('UrgencyBadgeComponent', () => {
  let fixture: ComponentFixture<UrgencyBadgeComponent>;
  let component: UrgencyBadgeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UrgencyBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(UrgencyBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should render without error', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should show "Haute" for level=haute', () => {
    component.level = 'haute';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Haute');
  });

  it('should show "Moyenne" for level=moyenne', () => {
    component.level = 'moyenne';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Moyenne');
  });

  it('should show "Basse" for level=basse', () => {
    component.level = 'basse';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Basse');
  });
});
