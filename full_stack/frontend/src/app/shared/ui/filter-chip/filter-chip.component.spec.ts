import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterChipComponent } from './filter-chip.component';

describe('FilterChipComponent', () => {
  let fixture: ComponentFixture<FilterChipComponent>;
  let component: FilterChipComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FilterChipComponent] }).compileComponents();
    fixture = TestBed.createComponent(FilterChipComponent);
    component = fixture.componentInstance;
    component.label = 'En service';
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display the label', () => {
    expect(fixture.nativeElement.textContent).toContain('En service');
  });

  it('should show inactive styles by default', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.filter-chip');
    expect(btn.classList.contains('filter-chip--inactive')).toBeTrue();
  });

  it('should show active styles when active=true', () => {
    component.active = true;
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.filter-chip');
    expect(btn.classList.contains('filter-chip--active')).toBeTrue();
  });

  it('applies the active class when active', () => {
    component.active = true;
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.filter-chip');
    expect(btn.classList.contains('filter-chip--active')).toBeTrue();
  });

  it('should emit clicked on button click', () => {
    const spy = jasmine.createSpy('clicked');
    component.clicked.subscribe(spy);
    fixture.nativeElement.querySelector('button').click();
    expect(spy).toHaveBeenCalled();
  });
});
