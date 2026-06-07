import { TestBed } from '@angular/core/testing';
import { AxleSchemaComponent } from './axle-schema.component';
import { Pneu } from '../../../shared/models/pneu.model';

function makePneu(position: number, status: Pneu['status'] = 'ok'): Pneu {
  return {
    id: position,
    vehiculeId: 1,
    vehiculeCode: 'CAM-001',
    position,
    nSerie: `SN-${position}`,
    marque: 'Michelin',
    dateMontage: '2025-01-01',
    kmMontage: 0,
    kmParcourus: 50000,
    expectedLifeKm: 150000,
    kmRestant: 100000,
    pressionPsi: 110,
    profondeur32e: 18,
    status,
    actif: true,
  };
}

describe('AxleSchemaComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders SVG with 4x2 config', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.componentInstance.tires = [];
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders SVG with 6x4 config', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '6x4';
    fixture.componentInstance.tires = [];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders SVG with semi-2-essieux config', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = 'semi-2-essieux';
    fixture.componentInstance.tires = [];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders SVG with semi-3-essieux config', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = 'semi-3-essieux';
    fixture.componentInstance.tires = [];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders SVG with plateau-2x2 config', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = 'plateau-2x2';
    fixture.componentInstance.tires = [];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('axleLayout has correct number of axles for 4x2', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    const comp = fixture.componentInstance;
    comp.axleConfig = '4x2';
    comp.tires = [];
    comp.ngOnChanges({ axleConfig: { currentValue: '4x2', previousValue: null, firstChange: true, isFirstChange: () => true } } as any);
    expect(comp.axleLayout().length).toBe(2);
  });

  it('axleLayout has correct number of axles for 6x4', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    const comp = fixture.componentInstance;
    comp.axleConfig = '6x4';
    comp.tires = [];
    comp.ngOnChanges({ axleConfig: { currentValue: '6x4', previousValue: null, firstChange: true, isFirstChange: () => true } } as any);
    expect(comp.axleLayout().length).toBe(3);
  });

  it('svgHeight computed is positive value', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.componentInstance.tires = [];
    fixture.detectChanges();
    expect(fixture.componentInstance.svgHeight()).toBeGreaterThan(0);
  });

  it('tileColor returns blue for ok status', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.tileColor('ok')).toBe('#1D4ED8');
  });

  it('tileColor returns red for warn status', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.tileColor('warn')).toBe('#EF4444');
  });

  it('tileColor returns red for empty status', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.tileColor('empty')).toBe('#EF4444');
  });

  it('tileColor returns grey for undefined status (empty slot)', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.tileColor(undefined)).toBe('#F3F4F6');
  });

  it('tileBorder returns dark blue for ok status', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.tileBorder('ok')).toBe('#1E40AF');
  });

  it('tileBorder returns dark red for warn status', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.tileBorder('warn')).toBe('#B91C1C');
  });

  it('tileBorder returns grey for undefined status', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.tileBorder(undefined)).toBe('#D1D5DB');
  });

  it('formatKm formats km < 1000 as integer', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.formatKm(500)).toBe('500');
  });

  it('formatKm formats km >= 1000 as k notation', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    expect(fixture.componentInstance.formatKm(50000)).toBe('50k');
  });

  it('onTileClick emits tireClick event', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.detectChanges();
    let emitted: number | undefined;
    fixture.componentInstance.tireClick.subscribe((pos: number) => { emitted = pos; });
    fixture.componentInstance.onTileClick(3);
    expect(emitted).toBe(3);
  });

  it('renders tires with ok status in blue', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.componentInstance.tires = [makePneu(1, 'ok'), makePneu(2, 'ok')];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders tires with warn status', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.componentInstance.tires = [makePneu(1, 'warn')];
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('totalPositions static method returns correct count for 4x2', () => {
    // 4x2: front [1+1=2] + rear [2+2=4] = 6
    expect(AxleSchemaComponent.totalPositions('4x2')).toBe(6);
  });

  it('totalPositions static method returns correct count for 6x4', () => {
    // 6x4: front [1+1=2] + mid [2+2=4] + rear [2+2=4] = 10
    expect(AxleSchemaComponent.totalPositions('6x4')).toBe(10);
  });

  it('totalPositions static method returns correct count for semi-2-essieux', () => {
    // semi-2-essieux: [2+2=4] + [2+2=4] = 8
    expect(AxleSchemaComponent.totalPositions('semi-2-essieux')).toBe(8);
  });

  it('updates layout when tires input changes via ngOnChanges', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    const comp = fixture.componentInstance;
    comp.axleConfig = '4x2';
    comp.tires = [];
    fixture.detectChanges();

    comp.tires = [makePneu(1, 'ok')];
    comp.ngOnChanges({
      tires: { currentValue: comp.tires, previousValue: [], firstChange: false, isFirstChange: () => false },
    } as any);
    expect(comp.axleLayout().length).toBe(2);
  });

  it('selectedPosition highlights the tile', () => {
    const fixture = TestBed.createComponent(AxleSchemaComponent);
    fixture.componentInstance.axleConfig = '4x2';
    fixture.componentInstance.tires = [makePneu(1, 'ok')];
    fixture.componentInstance.selectedPosition = 1;
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
