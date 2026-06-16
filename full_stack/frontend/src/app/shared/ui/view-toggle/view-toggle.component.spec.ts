import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewToggleComponent } from './view-toggle.component';
import { LucideAngularModule, Table2, LayoutGrid } from 'lucide-angular';

describe('ViewToggleComponent', () => {
  let fixture: ComponentFixture<ViewToggleComponent>;
  let component: ViewToggleComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewToggleComponent, LucideAngularModule.pick({ Table2, LayoutGrid })],
    }).compileComponents();
    fixture = TestBed.createComponent(ViewToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should show "Tableau" button as active by default', () => {
    const btns = fixture.nativeElement.querySelectorAll('.vt-btn');
    expect(btns[0].classList.contains('vt-btn--active')).toBeTrue();
    expect(btns[1].classList.contains('vt-btn--inactive')).toBeTrue();
  });

  it('should show "Cartes" button as active when view=cards', () => {
    fixture.componentRef.setInput('view', 'cards');
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('.vt-btn');
    expect(btns[1].classList.contains('vt-btn--active')).toBeTrue();
  });

  it('should emit "cards" when cartes button is clicked', () => {
    const spy = jasmine.createSpy('viewChange');
    component.viewChange.subscribe(spy);
    const btns = fixture.nativeElement.querySelectorAll('.vt-btn');
    btns[1].click();
    expect(spy).toHaveBeenCalledWith('cards');
  });

  it('should emit "table" when tableau button is clicked', () => {
    fixture.componentRef.setInput('view', 'cards');
    fixture.detectChanges();
    const spy = jasmine.createSpy('viewChange');
    component.viewChange.subscribe(spy);
    const btns = fixture.nativeElement.querySelectorAll('.vt-btn');
    btns[0].click();
    expect(spy).toHaveBeenCalledWith('table');
  });
});
