import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  function setupState(state: { email?: string; resetToken?: string } | null) {
    history.replaceState(state, '', window.location.href);
  }

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['confirmPasswordReset']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    history.replaceState({}, '', window.location.href);
  });

  function createComp() {
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create when valid state present', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt-xyz' });
    createComp();
    expect(component).toBeTruthy();
  });

  it('navigates back to /forgot-password when no state present', () => {
    setupState({});
    const navSpy = spyOn(router, 'navigate');
    createComp();
    expect(navSpy).toHaveBeenCalledWith(['/forgot-password']);
  });

  it('navigates back to /forgot-password when only email present', () => {
    setupState({ email: 'a@b.c' });
    const navSpy = spyOn(router, 'navigate');
    createComp();
    expect(navSpy).toHaveBeenCalledWith(['/forgot-password']);
  });

  it('shows mismatch error when passwords differ', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt' });
    createComp();
    component.resetForm.setValue({ newPassword: 'password1', confirmPassword: 'password2' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('Les mots de passe ne correspondent pas.');
    expect(authServiceSpy.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('shows required error when fields blank', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt' });
    createComp();
    component.resetForm.setValue({ newPassword: '', confirmPassword: '' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('Veuillez remplir tous les champs requis.');
  });

  it('calls confirmPasswordReset and navigates to /login on success', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt-xyz' });
    createComp();
    authServiceSpy.confirmPasswordReset.and.returnValue(of(void 0));
    const navSpy = spyOn(router, 'navigate');
    component.resetForm.setValue({ newPassword: 'password1', confirmPassword: 'password1' });
    component.onSubmit();
    expect(authServiceSpy.confirmPasswordReset).toHaveBeenCalledWith({
      email: 'a@b.c',
      reset_token: 'rt-xyz',
      new_password: 'password1',
    });
    expect(navSpy).toHaveBeenCalledWith(['/login'], { queryParams: { reset: 'success' } });
  });

  it('shows INVALID_OTP error', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt-xyz' });
    createComp();
    authServiceSpy.confirmPasswordReset.and.returnValue(throwError(() =>
      new HttpErrorResponse({ error: { code: 'INVALID_OTP' }, status: 422 })
    ));
    component.resetForm.setValue({ newPassword: 'password1', confirmPassword: 'password1' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('Lien de réinitialisation invalide. Recommencez la procédure.');
  });

  it('shows OTP_EXPIRED error', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt-xyz' });
    createComp();
    authServiceSpy.confirmPasswordReset.and.returnValue(throwError(() =>
      new HttpErrorResponse({ error: { code: 'OTP_EXPIRED' }, status: 422 })
    ));
    component.resetForm.setValue({ newPassword: 'password1', confirmPassword: 'password1' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('Lien expiré. Recommencez la procédure.');
  });

  it('shows generic error on unknown error code', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt-xyz' });
    createComp();
    authServiceSpy.confirmPasswordReset.and.returnValue(throwError(() =>
      new HttpErrorResponse({ error: { code: 'X' }, status: 500 })
    ));
    component.resetForm.setValue({ newPassword: 'password1', confirmPassword: 'password1' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('Une erreur est survenue. Veuillez réessayer.');
  });

  it('shows/hides password toggles', () => {
    setupState({ email: 'a@b.c', resetToken: 'rt-xyz' });
    createComp();
    expect(component.showNewPassword()).toBeFalse();
    component.showNewPassword.set(true);
    expect(component.showNewPassword()).toBeTrue();
    expect(component.showConfirmPassword()).toBeFalse();
    component.showConfirmPassword.set(true);
    expect(component.showConfirmPassword()).toBeTrue();
  });
});
