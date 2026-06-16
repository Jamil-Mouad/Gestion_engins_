import { TestBed } from '@angular/core/testing';
import { LucideAngularModule, RefreshCw } from 'lucide-angular';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LucideAngularModule.pick({ RefreshCw })],
    });
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('px() returns 32 for md size (default)', () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.px()).toBe(32);
  });

  it('px() returns 20 for sm size', () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    // Set size signal input via TestBed
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(fixture.componentInstance.px()).toBe(20);
  });

  it('px() returns 48 for lg size', () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    expect(fixture.componentInstance.px()).toBe(48);
  });

  it('renders lucide-icon element', () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('lucide-icon');
    expect(icon).toBeTruthy();
  });
});
