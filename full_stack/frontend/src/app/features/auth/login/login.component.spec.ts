import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { signal } from '@angular/core';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser = {
    id: 1,
    email: 'test@intersig.ma',
    prenom: 'Test',
    nom: 'User',
  };

  beforeEach(async () => {
    const _user = signal<any>(null);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'logout', 'refresh', 'clearTokens', 'getMe', 'hasExpiredToken', 'register'], {
      user: _user.asReadonly(),
      isAuthenticated: signal(false),
    });

    authServiceSpy.register.and.returnValue(of({ id: 1, email: 'test@test.com' } as any));

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid login form when email or password is blank', () => {
    expect(component.loginForm.get('email')!.value).toBe('');
    expect(component.loginForm.get('password')!.value).toBe('');
    expect(component.loginForm.invalid).toBeTrue();
  });

  it('should call authService.login on valid submit', () => {
    authServiceSpy.login.and.returnValue(of({ access_token: 'at', refresh_token: 'rt', user: mockUser } as any));

    component.loginForm.setValue({ email: 'test@intersig.ma', password: 'testtest' });
    component.onLogin();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ email: 'test@intersig.ma', password: 'testtest', remember: false });
  });

  it('should navigate to /vehicules on successful login', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    authServiceSpy.login.and.returnValue(of({ access_token: 'at', refresh_token: 'rt', user: mockUser } as any));

    component.loginForm.setValue({ email: 'test@intersig.ma', password: 'testtest' });
    component.onLogin();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/vehicules');
  });

  it('should display "Email ou mot de passe incorrect." on 401 error', () => {
    authServiceSpy.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Unauthorized })));

    component.loginForm.setValue({ email: 'test@intersig.ma', password: 'wrong' });
    component.onLogin();

    expect(component.errorMessage()).toBe('Email ou mot de passe incorrect.');
  });

  it('should call authService.logout and navigate to /login on logout', async () => {
    authServiceSpy.logout.and.returnValue(of(void 0));

    component.logout();

    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('renders split-screen layout with glass card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[style*="backdrop-filter"]') || compiled.querySelector('.glass-card') || compiled.textContent).toBeTruthy();
    expect(compiled.textContent).toContain('Connexion');
    expect(compiled.textContent).toContain('FleetTracker');
  });

  it('tab switcher toggles between Login and Register forms', () => {
    expect(component.tab()).toBe('connexion');
    component.switchTab('inscription');
    expect(component.tab()).toBe('inscription');
    component.switchTab('connexion');
    expect(component.tab()).toBe('connexion');
  });

  it('form shows validation errors in French on submit', () => {
    component.loginForm.setValue({ email: '', password: '' });
    component.onLogin();
    expect(component.loginForm.invalid).toBeTrue();
  });

  it('registerForm has cgu field and it is required', () => {
    const cgu = component.registerForm.get('cgu');
    expect(cgu).toBeTruthy();
    cgu!.setValue(false);
    expect(cgu!.invalid).toBeTrue();
    cgu!.setValue(true);
    expect(cgu!.valid).toBeTrue();
  });

  it('onRegister should fail when cgu is not accepted', () => {
    component.registerForm.patchValue({
      prenom: 'Karim',
      nom: 'Benhassou',
      email: 'karim@intersig.ma',
      password: 'password123',
      confirm: 'password123',
      cgu: false,
    });
    component.onRegister();
    expect(component.errorMessage()).toBe('Veuillez remplir tous les champs requis.');
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('footer shows INTERSIG brand name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('INTERSIG');
  });

  it('should display "Trop de tentatives" on 429 error', () => {
    authServiceSpy.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.loginForm.setValue({ email: 'test@intersig.ma', password: 'pass' });
    component.onLogin();
    expect(component.errorMessage()).toBe('Trop de tentatives. Réessayez dans quelques secondes.');
  });

  it('should display generic error on 500', () => {
    authServiceSpy.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.loginForm.setValue({ email: 'test@intersig.ma', password: 'pass' });
    component.onLogin();
    expect(component.errorMessage()).toBe('Erreur de connexion. Veuillez réessayer.');
  });

  it('logout() navigates to /login on error', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    authServiceSpy.logout.and.returnValue(throwError(() => new Error('network error')));
    component.logout();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('onRegister() sets passwordMismatch error when passwords differ', () => {
    component.registerForm.patchValue({
      prenom: 'A', nom: 'B', email: 'a@b.c',
      password: 'pass1234', confirm: 'different', cgu: true,
    });
    component.onRegister();
    expect(component.errorMessage()).toBe('Les mots de passe ne correspondent pas.');
  });

  it('onRegister() navigates to /vehicules on success', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    authServiceSpy.register.and.returnValue(of({ access_token: 'at', refresh_token: 'rt', user: { id: 1 } } as any));
    component.registerForm.patchValue({
      prenom: 'A', nom: 'B', email: 'a@b.c',
      password: 'pass1234', confirm: 'pass1234', cgu: true,
    });
    component.onRegister();
    expect(router.navigate).toHaveBeenCalledWith(['/vehicules']);
  });

  it('onRegister() shows 409 error when email already exists', () => {
    authServiceSpy.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.registerForm.patchValue({
      prenom: 'A', nom: 'B', email: 'a@b.c',
      password: 'pass1234', confirm: 'pass1234', cgu: true,
    });
    component.onRegister();
    expect(component.errorMessage()).toBe('Un compte existe déjà avec cet email.');
  });

  it('onRegister() shows 422 error', () => {
    authServiceSpy.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    component.registerForm.patchValue({
      prenom: 'A', nom: 'B', email: 'a@b.c',
      password: 'pass1234', confirm: 'pass1234', cgu: true,
    });
    component.onRegister();
    expect(component.errorMessage()).toBe('Données invalides. Vérifiez les champs.');
  });

  it('onRegister() shows generic error on 500', () => {
    authServiceSpy.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.registerForm.patchValue({
      prenom: 'A', nom: 'B', email: 'a@b.c',
      password: 'pass1234', confirm: 'pass1234', cgu: true,
    });
    component.onRegister();
    expect(component.errorMessage()).toBe('Erreur lors de la création du compte.');
  });
});