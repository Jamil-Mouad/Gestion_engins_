import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableRowComponent } from './data-table-row.component';

describe('DataTableRowComponent', () => {
  let fixture: ComponentFixture<DataTableRowComponent>;
  let component: DataTableRowComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableRowComponent] }).compileComponents();
    fixture = TestBed.createComponent(DataTableRowComponent);
    component = fixture.componentInstance;
    component.cols = [
      { content: 'AB-123-CD', mono: true },
      { content: 'Renault' },
      { content: 'En service', sm: true },
    ];
    component.idx = 2;
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display cell content', () => {
    expect(fixture.nativeElement.textContent).toContain('AB-123-CD');
    expect(fixture.nativeElement.textContent).toContain('Renault');
  });

  it('should apply mono class when col.mono=true', () => {
    const cells = fixture.nativeElement.querySelectorAll('.dtr-cell');
    expect(cells[0].classList.contains('dtr-cell--mono')).toBeTrue();
    expect(cells[1].classList.contains('dtr-cell--mono')).toBeFalse();
  });

  it('should apply alert style when alert=true', () => {
    component.alert = true;
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.dtr-row');
    expect(row.classList.contains('dtr-row--alert')).toBeTrue();
  });

  it('should apply selected style when selected=true', () => {
    component.selected = true;
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.dtr-row');
    expect(row.classList.contains('dtr-row--selected')).toBeTrue();
  });

  it('should emit rowClicked on click when clickable=true', () => {
    component.clickable = true;
    fixture.detectChanges();
    const spy = jasmine.createSpy('rowClicked');
    component.rowClicked.subscribe(spy);
    fixture.nativeElement.querySelector('.dtr-row').click();
    expect(spy).toHaveBeenCalled();
  });
});
