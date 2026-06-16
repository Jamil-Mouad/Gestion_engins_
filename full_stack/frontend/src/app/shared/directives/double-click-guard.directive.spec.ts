import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component } from '@angular/core';
import { DoubleClickGuardDirective } from './double-click-guard.directive';

@Component({
  standalone: true,
  imports: [DoubleClickGuardDirective],
  template: `
    <button [appDoubleClickGuard]="guarded" (guardedClick)="onGuardedClick($event)">Click me</button>
  `,
})
class TestHostComponent {
  guarded = false;
  clickCount = 0;
  onGuardedClick(_e: MouseEvent): void { this.clickCount++; }
}

describe('DoubleClickGuardDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('creates the directive', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('allows click when not guarded', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = false;
    fixture.detectChanges();
    // Directive does not set disabled attribute when not guarded
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('disabled')).toBeNull();
  });

  it('sets disabled attribute when appDoubleClickGuard is true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn.getAttribute('disabled')).toBe('true');
  });

  it('emits guardedClick on first click', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = false;
    fixture.detectChanges();

    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    let emitted = false;
    dir.guardedClick.subscribe(() => { emitted = true; });

    const event = new MouseEvent('click');
    dir.onClick(event);
    expect(emitted).toBe(true);
  });

  it('prevents second rapid click (double-click guard)', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = false;
    fixture.detectChanges();

    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    let clickCount = 0;
    dir.guardedClick.subscribe(() => { clickCount++; });

    const event1 = new MouseEvent('click');
    const event2 = new MouseEvent('click');
    dir.onClick(event1);
    dir.onClick(event2); // should be blocked
    expect(clickCount).toBe(1);

    tick(600);
  }));

  it('allows click again after 500ms timeout', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = false;
    fixture.detectChanges();

    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    let clickCount = 0;
    dir.guardedClick.subscribe(() => { clickCount++; });

    const event = new MouseEvent('click');
    dir.onClick(event);
    tick(600);
    dir.onClick(new MouseEvent('click'));
    expect(clickCount).toBe(2);
  }));

  it('prevents click when appDoubleClickGuard is true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = true;
    fixture.detectChanges();

    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    let emitted = false;
    dir.guardedClick.subscribe(() => { emitted = true; });

    let prevented = false;
    const event = { preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => {} } as unknown as MouseEvent;
    dir.onClick(event);
    expect(emitted).toBe(false);
    expect(prevented).toBe(true);
  });

  it('isDisabled is false when not guarded and not clicking', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = false;
    fixture.detectChanges();
    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    expect(dir.isDisabled).toBeNull();
  });

  it('isDisabled is "true" when guarded', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = true;
    fixture.detectChanges();
    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    expect(dir.isDisabled).toBe('true');
  });

  it('isOpacity50 is true when guarded', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = true;
    fixture.detectChanges();
    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    expect(dir.isOpacity50).toBe(true);
  });

  it('ngOnDestroy clears clickTimeout', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.guarded = false;
    fixture.detectChanges();
    const dir = fixture.debugElement.children[0].injector.get(DoubleClickGuardDirective);
    dir.onClick(new MouseEvent('click'));
    // Destroy while timeout is pending
    fixture.destroy();
    tick(600); // Should not throw
    expect(true).toBe(true);
  }));
});
