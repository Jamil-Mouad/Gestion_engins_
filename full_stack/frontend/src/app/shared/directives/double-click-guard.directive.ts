import { Directive, Input, HostBinding, HostListener, Output, EventEmitter, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appDoubleClickGuard]',
  standalone: true,
})
export class DoubleClickGuardDirective implements OnDestroy {
  @Input() appDoubleClickGuard = false;
  @Output() guardedClick = new EventEmitter<MouseEvent>();

  private clicking = false;
  private clickTimeout: ReturnType<typeof setTimeout> | null = null;

  @HostBinding('attr.disabled')
  get isDisabled(): 'true' | null {
    return (this.appDoubleClickGuard || this.clicking) ? 'true' : null;
  }

  @HostBinding('class.opacity-50')
  get isOpacity50(): boolean {
    return this.appDoubleClickGuard || this.clicking;
  }

  @HostBinding('class.cursor-not-allowed')
  get isCursorNotAllowed(): boolean {
    return this.appDoubleClickGuard || this.clicking;
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (this.clicking || this.appDoubleClickGuard) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.clicking = true;
    this.guardedClick.emit(event);
    if (this.clickTimeout) clearTimeout(this.clickTimeout);
    this.clickTimeout = setTimeout(() => { this.clicking = false; }, 500);
  }

  ngOnDestroy(): void {
    if (this.clickTimeout) clearTimeout(this.clickTimeout);
  }
}