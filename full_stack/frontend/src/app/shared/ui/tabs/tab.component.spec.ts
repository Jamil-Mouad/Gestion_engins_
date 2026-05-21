import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabComponent } from './tab.component';

describe('TabComponent', () => {
  let fixture: ComponentFixture<TabComponent>;
  let component: TabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabComponent] }).compileComponents();
    fixture = TestBed.createComponent(TabComponent);
    component = fixture.componentInstance;
    component.label = 'Vue générale';
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display label', () => {
    expect(fixture.nativeElement.textContent).toContain('Vue générale');
  });

  it('should apply inactive class by default', () => {
    const btn = fixture.nativeElement.querySelector('.tab');
    expect(btn.classList.contains('tab--inactive')).toBeTrue();
  });

  it('should apply active class when active=true', () => {
    component.active = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.tab');
    expect(btn.classList.contains('tab--active')).toBeTrue();
  });

  it('should show badge when provided', () => {
    component.badge = 5;
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.tab-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('5');
  });

  it('should emit clicked on click', () => {
    const spy = jasmine.createSpy('clicked');
    component.clicked.subscribe(spy);
    fixture.nativeElement.querySelector('button').click();
    expect(spy).toHaveBeenCalled();
  });
});
