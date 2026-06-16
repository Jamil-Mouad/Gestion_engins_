import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);
    (authServiceSpy as any).user = signal(null);
    (authServiceSpy as any).isAuthenticated = computed(() => false);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when email or password is empty', () => {
    component.registerForm.setValue({
      prenom: '',
      nom: '',
      email: '',
      password: '',
    });
    expect(component.registerForm.invalid).toBeTrue();
  });

  it('form should be invalid with invalid email', () => {
    component.registerForm.setValue({
      prenom: 'Test',
      nom: 'User',
      email: 'notanemail',
      password: 'testtest',
    });
    expect(component.registerForm.invalid).toBeTrue();
  });

  it('form should be invalid with short password', () => {
    component.registerForm.setValue({
      prenom: 'Test',
      nom: 'User',
      email: 'test@intersig.ma',
      password: 'short',
    });
    expect(component.registerForm.invalid).toBeTrue();
  });

  it('form should be valid with correct data', () => {
    component.registerForm.setValue({
      prenom: 'Test',
      nom: 'User',
      email: 'test@intersig.ma',
      password: 'testtest',
    });
    expect(component.registerForm.valid).toBeTrue();
  });

  it('should call authService.register with correct DTO on valid submit', () => {
    const authResponse = {
      access_token: 'jwt-token',
      refresh_token: 'refresh-token',
      user: { id: 1, email: 'test@intersig.ma', prenom: 'Test', nom: 'User', role: 'USER' as const, dashboardConfig: null, actif: true },
    };
    authServiceSpy.register.and.returnValue(of(authResponse));

    component.registerForm.setValue({
      prenom: 'Test',
      nom: 'User',
      email: 'test@intersig.ma',
      password: 'testtest',
    });

    component.onSubmit();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      prenom: 'Test',
      nom: 'User',
      email: 'test@intersig.ma',
      password: 'testtest',
    });
  });

  it('should display error message on 409 conflict', () => {
    const errorResponse = new HttpErrorResponse({
      status: 409,
      error: { error: 'Un compte existe déjà avec cet email.', code: 'EMAIL_ALREADY_EXISTS' },
    });
    authServiceSpy.register.and.returnValue(throwError(() => errorResponse));

    component.registerForm.setValue({
      prenom: 'Test',
      nom: 'User',
      email: 'duplicate@intersig.ma',
      password: 'testtest',
    });

    component.onSubmit();

    expect(component.errorMessage()).toBe('Un compte existe déjà avec cet email.');
  });

  it('should not call register when form is invalid', () => {
    component.registerForm.setValue({
      prenom: '',
      nom: 'User',
      email: 'test@intersig.ma',
      password: 'testtest',
    });

    component.onSubmit();

    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('renders split-screen layout with glass card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Créer un compte');
    expect(compiled.textContent).toContain('FleetTracker');
  });

  it('form shows validation errors in French on submit', () => {
    component.registerForm.setValue({ prenom: '', nom: '', email: '', password: '' });
    component.onSubmit();
    expect(component.registerForm.invalid).toBeTrue();
    expect(component.errorMessage()).toContain('remplir');
  });

  it('should navigate to /vehicules on successful registration', () => {
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    authServiceSpy.register.and.returnValue(of({ access_token: 'at', refresh_token: 'rt', user: { id: 1, email: 'test@intersig.ma', prenom: 'Test', nom: 'User', role: 'USER' as const, dashboardConfig: null, actif: true } }));
    component.registerForm.setValue({ prenom: 'Test', nom: 'User', email: 'test@intersig.ma', password: 'testtest' });
    component.onSubmit();
    expect(navSpy).toHaveBeenCalledWith(['/vehicules']);
  });

  it('should display 422 error message', () => {
    authServiceSpy.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    component.registerForm.setValue({ prenom: 'Test', nom: 'User', email: 'test@intersig.ma', password: 'testtest' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('Données invalides. Vérifiez les champs.');
  });

  it('should display generic error on 500', () => {
    authServiceSpy.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.registerForm.setValue({ prenom: 'Test', nom: 'User', email: 'test@intersig.ma', password: 'testtest' });
    component.onSubmit();
    expect(component.errorMessage()).toBe('Erreur lors de la création du compte.');
  });
});