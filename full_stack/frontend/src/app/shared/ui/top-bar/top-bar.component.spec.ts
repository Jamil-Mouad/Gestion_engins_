import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';

import { TopBarComponent } from './top-bar.component';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/notifications/notification.service';

describe('TopBarComponent', () => {
  let component: TopBarComponent;
  let fixture: ComponentFixture<TopBarComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

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

    const _unreadCount = signal(0);
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['getRecentUnread'], {
      unreadCount: _unreadCount,
    });
    notificationServiceSpy.getRecentUnread.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [TopBarComponent, LucideAngularModule.pick({ ChevronDown })],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders without error', () => {
    expect(component).toBeTruthy();
  });

  it('renders logo with INTERSIG brand text and FleetTracker product text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const logoImg = compiled.querySelector('.logo-img') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.alt).toBe('INTERSIG');
    expect(compiled.querySelector('.logo-brand')?.textContent?.trim()).toBe('INTERSIG');
    expect(compiled.querySelector('.logo-product')?.textContent?.trim()).toBe('FleetTracker');
  });

  it('nav contains all main items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Véhicules');
    expect(text).toContain('Interventions');
    expect(text).toContain('Composants');
    expect(text).toContain('Demandes');
    expect(text).toContain('Chat AI');
    expect(text).toContain('Import');
    expect(text).not.toContain('Journées');
  });

  it('Demandes item is a direct link to /demandes-achat', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const demandesLink = compiled.querySelector('a[routerLink="/demandes-achat"]') ??
      Array.from(compiled.querySelectorAll('.nav-item-wrap a')).find(a => a.textContent?.includes('Demandes'));
    expect(demandesLink).toBeTruthy();
    expect(demandesLink?.textContent).toContain('Demandes');
  });

  it('user avatar is rendered', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const avatar = compiled.querySelector('.user-avatar');
    expect(avatar).toBeTruthy();
    expect(avatar?.textContent?.trim()).toBe('AU');
  });

  it('shows bell icon with unread count badge', () => {
    component.unreadCount.set(5);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('5');
  });

  it('user menu shows "Déconnexion" option when open', () => {
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

  it('initials computed from user prenom and nom', () => {
    expect(component.initials()).toBe('AU');
  });
});

describe('TopBarComponent — MAGASIN role', () => {
  let fixture: ComponentFixture<TopBarComponent>;

  beforeEach(async () => {
    const _user = signal({
      id: 2,
      email: 'magasin@intersig.ma',
      prenom: 'Magasin',
      nom: 'Dev',
      role: 'MAGASIN' as const,
      dashboardConfig: null,
      actif: true,
    });

    const authSpy = jasmine.createSpyObj('AuthService', ['logout', 'clearTokens', 'hasExpiredToken'], {
      user: _user.asReadonly(),
      isAuthenticated: signal(true),
    });
    authSpy.logout.and.returnValue(of(void 0));

    const _unreadCount = signal(0);
    const notifSpy = jasmine.createSpyObj('NotificationService', ['getRecentUnread'], {
      unreadCount: _unreadCount,
    });
    notifSpy.getRecentUnread.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [TopBarComponent, LucideAngularModule.pick({ ChevronDown })],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    fixture.detectChanges();
  });

  it('shows the magasin section links inline in the top bar', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tableau de bord');
    expect(text).toContain('Sorties');
    expect(text).toContain('Arrivages');
    expect(text).toContain('Jaugeages');
    expect(text).toContain('Configuration');
  });

  it('hides the fleet links and the single Magasin tab', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Véhicules');
    expect(text).not.toContain('Interventions');
    expect(text).not.toContain('Chat AI');
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.nav-label'),
      el => el.textContent?.trim());
    expect(labels).not.toContain('Magasin');
  });

  it('links point at the magasin routes', () => {
    const hrefs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.nav-link'),
      el => el.getAttribute('href'));
    expect(hrefs).toContain('/magasin');
    expect(hrefs).toContain('/magasin/sorties');
    expect(hrefs).toContain('/magasin/configuration');
  });
});
