import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabGroupComponent } from './tab-group.component';

describe('TabGroupComponent', () => {
  let fixture: ComponentFixture<TabGroupComponent>;
  let component: TabGroupComponent;

  const mockTabs = [
    { label: 'Vue générale' },
    { label: 'Documents', badge: 3 },
    { label: 'Interventions' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabGroupComponent] }).compileComponents();
    fixture = TestBed.createComponent(TabGroupComponent);
    component = fixture.componentInstance;
    component.tabs = mockTabs;
    component.activeIndex = 0;
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should render all tabs', () => {
    const tabs = fixture.nativeElement.querySelectorAll('app-tab');
    expect(tabs.length).toBe(3);
  });

  it('should emit tabChange when a tab is clicked', () => {
    const spy = jasmine.createSpy('tabChange');
    component.tabChange.subscribe(spy);
    const tabs = fixture.nativeElement.querySelectorAll('app-tab button');
    tabs[1].click();
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('should mark correct tab as active', () => {
    component.activeIndex = 1;
    fixture.detectChanges();
    const appTabs = fixture.nativeElement.querySelectorAll('app-tab');
    // The second tab should have active class on its button
    const btn = appTabs[1].querySelector('.tab--active');
    expect(btn).toBeTruthy();
  });
});
