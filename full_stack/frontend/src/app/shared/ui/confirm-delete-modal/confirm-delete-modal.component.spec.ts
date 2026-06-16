import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmDeleteModalComponent } from './confirm-delete-modal.component';

describe('ConfirmDeleteModalComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders default delete message', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.confirm-delete__message');
    expect(msg?.textContent).toContain('Êtes-vous sûr');
  });

  it('renders custom confirmMessage when set', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.componentInstance.confirmMessage = 'Voulez-vous supprimer ce véhicule?';
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.confirm-delete__message');
    expect(msg?.textContent).toContain('Voulez-vous supprimer ce véhicule?');
  });

  it('renders itemLabel as entity name', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.componentInstance.itemLabel = 'CAM-001';
    fixture.detectChanges();
    const entity = fixture.nativeElement.querySelector('.confirm-delete__entity');
    expect(entity?.textContent).toContain('CAM-001');
  });

  it('does not render entity element when itemLabel is empty', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.detectChanges();
    const entity = fixture.nativeElement.querySelector('.confirm-delete__entity');
    expect(entity).toBeFalsy();
  });

  it('emits confirm event when confirm button clicked', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.detectChanges();
    let confirmed = false;
    fixture.componentInstance.confirm.subscribe(() => { confirmed = true; });
    const btn = fixture.nativeElement.querySelector('.btn-danger');
    btn?.click();
    expect(confirmed).toBe(true);
  });

  it('emits cancel event when cancel button clicked', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.detectChanges();
    let cancelled = false;
    fixture.componentInstance.cancel.subscribe(() => { cancelled = true; });
    const btn = fixture.nativeElement.querySelector('.btn-cancel');
    btn?.click();
    expect(cancelled).toBe(true);
  });

  it('message() signal defaults to standard delete warning', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    expect(fixture.componentInstance.message()).toContain('Êtes-vous sûr');
  });

  it('entityName() signal defaults to empty string', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    expect(fixture.componentInstance.entityName()).toBe('');
  });

  it('deleting() signal defaults to false', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    expect(fixture.componentInstance.deleting()).toBe(false);
  });

  it('shows "Suppression..." text when isDeleting is true', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.componentInstance.isDeleting = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-danger');
    expect(btn?.textContent?.trim()).toContain('Suppression...');
  });

  it('shows "Supprimer" text when isDeleting is false', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
    fixture.componentInstance.isDeleting = false;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-danger');
    expect(btn?.textContent?.trim()).toContain('Supprimer');
  });
});
