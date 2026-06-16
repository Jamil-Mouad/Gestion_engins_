import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { MagasinConfigComponent } from './magasin-config.component';
import { MagasinApiService } from '../services/magasin-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Citerne } from '../models/magasin.model';

const CITERNE: Citerne = {
  id: 1,
  nom: 'Citerne gasoil',
  capaciteLitres: 20000,
  densiteKgParLitre: 0.845,
  hauteurMaxCm: 260,
  stockInitialLitres: 0,
  stockInitialDate: '2025-01-01',
};

function authSpyWithRole(role: 'MAGASIN' | 'ADMIN') {
  const _user = signal({
    id: 1, email: 'u@intersig.ma', prenom: 'U', nom: 'Ser',
    role, dashboardConfig: null, actif: true,
  });
  return jasmine.createSpyObj('AuthService', ['logout'], {
    user: _user.asReadonly(),
    isAuthenticated: signal(true),
  });
}

describe('MagasinConfigComponent', () => {
  async function setup(role: 'MAGASIN' | 'ADMIN') {
    const apiSpy = jasmine.createSpyObj('MagasinApiService',
      ['getCiterne', 'getBareme', 'updateCiterne', 'replaceBareme', 'importGasoil']);
    apiSpy.getCiterne.and.returnValue(of(CITERNE));
    apiSpy.getBareme.and.returnValue(of([{ hauteurCm: 130, litres: 10000 }]));

    await TestBed.configureTestingModule({
      imports: [MagasinConfigComponent],
      providers: [
        { provide: MagasinApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpyWithRole(role) },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        provideRouter([]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(MagasinConfigComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the renamed import card (no "25") for ADMIN, stacked under the barème', async () => {
    const fixture = await setup('ADMIN');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Import historique — GASOIL');
    expect(text).not.toContain('GASOIL 25');
    const colStack = (fixture.nativeElement as HTMLElement).querySelector('.col-stack');
    expect(colStack?.textContent).toContain('Barème de jaugeage');
    expect(colStack?.textContent).toContain('Import historique');
  });

  it('hides the import card for MAGASIN users but keeps citerne and barème editable', async () => {
    const fixture = await setup('MAGASIN');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Import historique');
    expect(text).toContain('Citerne');
    expect(text).toContain('Barème de jaugeage');
    expect((fixture.nativeElement as HTMLElement).querySelector('form.config-form')).not.toBeNull();
  });
});
