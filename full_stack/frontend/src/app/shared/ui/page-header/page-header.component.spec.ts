import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;
  let component: PageHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PageHeaderComponent] }).compileComponents();
    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
    component.title = 'Véhicules';
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display the title', () => {
    const h1 = fixture.nativeElement.querySelector('.page-header-title');
    expect(h1?.textContent?.trim()).toBe('Véhicules');
  });

  it('should not display count when not provided', () => {
    const count = fixture.nativeElement.querySelector('.page-header-count');
    expect(count).toBeNull();
  });

  it('should display count when provided', () => {
    component.count = 42;
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector('.page-header-count');
    expect(count?.textContent?.trim()).toBe('(42)');
  });
});
