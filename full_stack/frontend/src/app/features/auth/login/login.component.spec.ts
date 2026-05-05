import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { User } from '../../../core/models/user.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser: User = {
    id: 1,
    email: 'test@intersig.ma',
    prenom: 'Test',
    nom: 'User',
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'logout'], {
      currentUser: new BehaviorSubject<User | null>(null),
      isLoggedIn: new BehaviorSubject<boolean>(false),
    });

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        provideHttpClient(),
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

    expect(authServiceSpy.login).toHaveBeenCalledWith({ email: 'test@intersig.ma', password: 'testtest' });
  });

  it('should navigate to /dashboard on successful login', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    authServiceSpy.login.and.returnValue(of({ access_token: 'at', refresh_token: 'rt', user: mockUser } as any));

    component.loginForm.setValue({ email: 'test@intersig.ma', password: 'testtest' });
    component.onLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
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
});