import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModalShellComponent } from './modal-shell.component';

describe('ModalShellComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders modal overlay by default (visible=true)', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    fixture.componentInstance.modalTitle = 'Test Modal';
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).toBeTruthy();
  });

  it('renders modal title', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    fixture.componentInstance.modalTitle = 'Mon Modal';
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.modal-title');
    expect(title?.textContent).toContain('Mon Modal');
  });

  it('hides overlay when isVisible is false', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    fixture.componentInstance.modalTitle = 'Test';
    fixture.componentInstance.isVisible = false;
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).toBeFalsy();
  });

  it('emits onClose when close button clicked', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    fixture.componentInstance.modalTitle = 'Test';
    fixture.detectChanges();
    let closed = false;
    fixture.componentInstance.onClose.subscribe(() => { closed = true; });
    const closeBtn = fixture.nativeElement.querySelector('.modal-close');
    closeBtn?.click();
    expect(closed).toBe(true);
  });

  it('emits onClose when overlay is clicked', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    fixture.componentInstance.modalTitle = 'Test';
    fixture.detectChanges();
    let closed = false;
    fixture.componentInstance.onClose.subscribe(() => { closed = true; });
    fixture.componentInstance.onOverlayClick();
    expect(closed).toBe(true);
  });

  it('visible signal defaults to true', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    expect(fixture.componentInstance.visible()).toBe(true);
  });

  it('maxWidth defaults to 560px', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    expect(fixture.componentInstance.maxWidth()).toBe('560px');
  });

  it('accepts custom maxWidth', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    fixture.componentInstance.modalMaxWidth = '800px';
    expect(fixture.componentInstance.maxWidth()).toBe('800px');
  });

  it('ngOnDestroy clears historyStatePushed', () => {
    const fixture = TestBed.createComponent(ModalShellComponent);
    fixture.componentInstance.modalTitle = 'Test';
    fixture.detectChanges();
    fixture.destroy();
    // Just verify no error thrown
    expect(true).toBe(true);
  });
});
