import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageWidgetsModalComponent } from './manage-widgets-modal.component';
import { DashboardConfig } from '../../shared/models/dashboard.model';

describe('ManageWidgetsModalComponent', () => {
  let component: ManageWidgetsModalComponent;
  let fixture: ComponentFixture<ManageWidgetsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageWidgetsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageWidgetsModalComponent);
    component = fixture.componentInstance;
    component.currentConfig = [
      { id: 'fleet-overview', x: 0, y: 0, cols: 2, rows: 1, visible: true },
      { id: 'cost-month', x: 2, y: 0, cols: 2, rows: 1, visible: false },
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders all widget groups in template', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('KPIs');
    expect(text).toContain('Alertes');
    expect(text).toContain('Activité');
  });

  it('renders all known widget labels', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Disponibilité');
    expect(text).toContain('Coût MAD');
    expect(text).toContain('Coût — 12 mois');
    expect(text).toContain('Interventions par statut');
    expect(text).toContain('Interventions ouvertes');
    expect(text).toContain('Alertes pneus');
    expect(text).toContain('Vidanges en retard');
    expect(text).toContain('Notifications récentes');
  });

  it('isVisible() returns true for visible widget in config', () => {
    expect(component.isVisible('fleet-overview')).toBeTrue();
  });

  it('isVisible() returns false for hidden widget in config', () => {
    expect(component.isVisible('cost-month')).toBeFalse();
  });

  it('isVisible() returns true (default) when widget not in config', () => {
    expect(component.isVisible('unknown-widget')).toBeTrue();
  });

  it('toggleWidget() updates existing entry', () => {
    component.toggleWidget('fleet-overview', false);
    component.onSave();
    // wait — onSave emits; subscribe to configChanged
    let emitted: DashboardConfig | undefined;
    component.configChanged.subscribe((c) => (emitted = c));
    component.onSave();
    expect(emitted).toBeDefined();
    const found = emitted!.find((w) => w.id === 'fleet-overview');
    expect(found?.visible).toBeFalse();
  });

  it('toggleWidget() adds entry when widget not in config', () => {
    component.toggleWidget('new-widget', true);
    let emitted: DashboardConfig | undefined;
    component.configChanged.subscribe((c) => (emitted = c));
    component.onSave();
    expect(emitted).toBeDefined();
    const found = emitted!.find((w) => w.id === 'new-widget');
    expect(found?.visible).toBeTrue();
  });

  it('onSave() emits currentConfig when no toggles made', () => {
    let emitted: DashboardConfig | undefined;
    component.configChanged.subscribe((c) => (emitted = c));
    component.onSave();
    expect(emitted).toEqual(component.currentConfig);
  });

  it('close emits when close event triggered', () => {
    let closed = false;
    component.close.subscribe(() => (closed = true));
    component.close.emit();
    expect(closed).toBeTrue();
  });
});
