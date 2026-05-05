import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'requestPasswordReset', 'verifyPasswordReset', 'confirmPasswordReset'
    ]);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on step 1', () => {
    expect(component.step()).toBe(1);
  });

  it('should transition to step 2 after successful request', () => {
    authServiceSpy.requestPasswordReset.and.returnValue(of(void 0));

    component.emailForm.setValue({ email: 'test@intersig.ma' });
    component.requestReset();

    expect(authServiceSpy.requestPasswordReset).toHaveBeenCalledWith('test@intersig.ma');
    expect(component.step()).toBe(2);
  });

  it('should transition to step 2 even on request error (no enumeration)', () => {
    authServiceSpy.requestPasswordReset.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    component.emailForm.setValue({ email: 'test@intersig.ma' });
    component.requestReset();

    expect(component.step()).toBe(2);
  });

  it('should show INVALID_OTP error on OTP verify', () => {
    authServiceSpy.verifyPasswordReset.and.returnValue(throwError(() =>
      new HttpErrorResponse({ error: { code: 'INVALID_OTP' }, status: 422 })
    ));

    component.step.set(2);
    component.emailForm.setValue({ email: 'test@intersig.ma' });
    component.otpForm.setValue({ code: '000000' });
    component.verifyOtp();

    expect(component.errorMessage()).toBe('Code incorrect ou déjà utilisé.');
  });

  it('should show OTP_EXPIRED error on OTP verify', () => {
    authServiceSpy.verifyPasswordReset.and.returnValue(throwError(() =>
      new HttpErrorResponse({ error: { code: 'OTP_EXPIRED' }, status: 422 })
    ));

    component.step.set(2);
    component.emailForm.setValue({ email: 'test@intersig.ma' });
    component.otpForm.setValue({ code: '123456' });
    component.verifyOtp();

    expect(component.errorMessage()).toBe('Code expiré. Cliquez sur "Renvoyer le code".');
  });

  it('should go back to step 1', () => {
    component.step.set(2);
    component.errorMessage.set('some error');
    component.goBackToStep1();
    expect(component.step()).toBe(1);
    expect(component.errorMessage()).toBe('');
  });
});
