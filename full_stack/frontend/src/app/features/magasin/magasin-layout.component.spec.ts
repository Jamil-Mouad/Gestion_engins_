import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { MagasinLayoutComponent } from './magasin-layout.component';
import { AuthService } from '../../core/auth/auth.service';

function authSpyWithRole(role: 'MAGASIN' | 'ADMIN') {
  const _user = signal({
    id: 1,
    email: 'u@intersig.ma',
    prenom: 'U',
    nom: 'Ser',
    role,
    dashboardConfig: null,
    actif: true,
  });
  return jasmine.createSpyObj('AuthService', ['logout'], {
    user: _user.asReadonly(),
    isAuthenticated: signal(true),
  });
}

describe('MagasinLayoutComponent', () => {
  async function setup(role: 'MAGASIN' | 'ADMIN') {
    await TestBed.configureTestingModule({
      imports: [MagasinLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpyWithRole(role) },
        provideRouter([]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(MagasinLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('hides the magasin nav strip for MAGASIN users (links live in the top bar)', async () => {
    const fixture = await setup('MAGASIN');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-magasin-nav')).toBeNull();
  });

  it('shows the magasin nav strip under the top bar for ADMIN users', async () => {
    const fixture = await setup('ADMIN');
    const nav = (fixture.nativeElement as HTMLElement).querySelector('app-magasin-nav');
    expect(nav).not.toBeNull();
    expect(nav?.textContent).toContain('Tableau de bord');
    expect(nav?.textContent).toContain('Configuration');
  });
});
