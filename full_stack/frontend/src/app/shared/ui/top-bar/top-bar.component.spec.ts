import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { TopBarComponent } from './top-bar.component';
import { AuthService } from '../../../core/auth/auth.service';
import { Notification } from '../../../shared/models/notification.model';

describe('TopBarComponent', () => {
  let component: TopBarComponent;
  let fixture: ComponentFixture<TopBarComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const _user = signal({
      id: 1,
      email: 'admin@intersig.ma',
      prenom: 'Admin',
      nom: 'User',
      role: 'ADMIN' as const,
      dashboardConfig: null,
      actif: true,
    });

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'clearTokens', 'hasExpiredToken'], {
      user: _user.asReadonly(),
      isAuthenticated: signal(true),
    });

    authServiceSpy.logout.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [TopBarComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders logo image and FleetTracker wordmark', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logoImg = compiled.querySelector('.top-bar__logo-img') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.alt).toBe('INTERSIG');
    expect(compiled.textContent).toContain('FleetTracker');
  });

  it('shows bell icon with unread count badge', () => {
    component.unreadCount.set(5);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('5');
  });

  it('user menu shows "Déconnexion" option', () => {
    component.userMenuOpen.set(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Déconnexion');
  });

  it('logout() calls AuthService.logout()', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('logout() redirects to /login', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    component.logout();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});