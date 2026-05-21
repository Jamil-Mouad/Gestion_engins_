import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreadcrumbComponent } from './breadcrumb.component';
import { provideRouter } from '@angular/router';
import { LucideAngularModule, ChevronRight } from 'lucide-angular';

describe('BreadcrumbComponent', () => {
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let component: BreadcrumbComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent, LucideAngularModule.pick({ ChevronRight })],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    component.items = [
      { label: 'Véhicules', route: '/vehicules' },
      { label: 'AB-123-CD' },
    ];
    fixture.detectChanges();
  });

  it('should render without error', () => {
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should display all breadcrumb labels', () => {
    expect(fixture.nativeElement.textContent).toContain('Véhicules');
    expect(fixture.nativeElement.textContent).toContain('AB-123-CD');
  });

  it('should mark the last item as current', () => {
    const current = fixture.nativeElement.querySelector('.breadcrumb-item--current');
    expect(current?.textContent?.trim()).toBe('AB-123-CD');
  });

  it('should render separator icons between items', () => {
    // lucide-icon may render additional child elements that inherit the class
    const seps = fixture.nativeElement.querySelectorAll('lucide-icon.breadcrumb-sep, .breadcrumb-sep');
    // At least 1 lucide-icon with breadcrumb-sep class
    const lucideSeps = fixture.nativeElement.querySelectorAll('lucide-icon.breadcrumb-sep');
    expect(lucideSeps.length).toBe(1);
  });

  it('should render a link for items with route', () => {
    const link = fixture.nativeElement.querySelector('a.breadcrumb-item--link');
    expect(link).toBeTruthy();
    expect(link.textContent.trim()).toBe('Véhicules');
  });
});
