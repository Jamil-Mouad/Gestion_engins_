import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FabComponent } from './fab.component';
import { LucideAngularModule, Plus } from 'lucide-angular';

describe('FabComponent', () => {
  let fixture: ComponentFixture<FabComponent>;
  let component: FabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FabComponent, LucideAngularModule.pick({ Plus })],
    }).compileComponents();
    fixture = TestBed.createComponent(FabComponent);
    component = fixture.componentInstance;
    component.label = 'Ajouter';
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display the label', () => {
    expect(fixture.nativeElement.querySelector('.fab-label')?.textContent?.trim()).toBe('Ajouter');
  });

  it('should emit clicked on click', () => {
    const spy = jasmine.createSpy('clicked');
    component.clicked.subscribe(spy);
    fixture.nativeElement.querySelector('button').click();
    expect(spy).toHaveBeenCalled();
  });

  it('should apply hovered class on mouseenter', () => {
    const btn: HTMLElement = fixture.nativeElement.querySelector('.fab');
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(btn.classList.contains('fab--hovered')).toBeTrue();
  });

  it('should remove hovered class on mouseleave', () => {
    const btn: HTMLElement = fixture.nativeElement.querySelector('.fab');
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    btn.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(btn.classList.contains('fab--hovered')).toBeFalse();
  });
});
