import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableHeaderComponent } from './data-table-header.component';

describe('DataTableHeaderComponent', () => {
  let fixture: ComponentFixture<DataTableHeaderComponent>;
  let component: DataTableHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableHeaderComponent] }).compileComponents();
    fixture = TestBed.createComponent(DataTableHeaderComponent);
    component = fixture.componentInstance;
    component.cols = [
      { label: 'Immatriculation', flex: 2 },
      { label: 'Marque' },
      { label: 'Statut', minWidth: 100 },
    ];
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should render all column headers', () => {
    const cells = fixture.nativeElement.querySelectorAll('.dth-cell');
    expect(cells.length).toBe(3);
  });

  it('should display column labels', () => {
    expect(fixture.nativeElement.textContent).toContain('Immatriculation');
    expect(fixture.nativeElement.textContent).toContain('Marque');
    expect(fixture.nativeElement.textContent).toContain('Statut');
  });
});
