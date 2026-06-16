import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ProfilComponent } from './profil.component';
import { User } from '../../shared/models/user.model';

describe('ProfilComponent', () => {
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 1,
    email: 'jean.dupont@mail.com',
    prenom: 'Jean',
    nom: 'Dupont',
    role: 'ADMIN',
    dashboardConfig: null,
    actif: true,
    telephone: '+212 6 00 00 00 00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads user profile on init via GET /api/v1/users/me', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/users/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);

    expect(component.user()?.prenom).toBe('Jean');
    expect(component.loading()).toBe(false);
  });

  it('populates infosForm with user data after loading', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);

    expect(component.infosForm.value.prenom).toBe('Jean');
    expect(component.infosForm.value.nom).toBe('Dupont');
    expect(component.infosForm.value.telephone).toBe('+212 6 00 00 00 00');
  });

  it('renders 2 section titles (Informations personnelles + Sécurité)', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const titles = nativeEl.querySelectorAll('.profil__section-title');
    expect(titles.length).toBe(2);
    expect(titles[0].textContent).toContain('Informations personnelles');
    expect(titles[1].textContent).toContain('Sécurité');
  });

  it('does not render Préférences notifications section', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).not.toContain('Préférences notifications');
  });

  it('shows skeleton while loading', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('app-skeleton')).toBeTruthy();

    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
  });

  it('sets loading to false on error', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;

    const req = httpMock.expectOne('/api/v1/users/me');
    req.error(new ProgressEvent('error'));

    expect(component.loading()).toBe(false);
  });

  it('passwordForm has mismatch validator', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);

    component.passwordForm.patchValue({
      currentPassword: 'oldPass',
      newPassword: 'newPass123',
      confirmPassword: 'differentPass',
    });

    expect(component.passwordForm.errors).toEqual({ mismatch: true });
    expect(component.passwordForm.invalid).toBe(true);
  });

  it('passwordForm is valid when passwords match', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);

    component.passwordForm.patchValue({
      currentPassword: 'oldPass',
      newPassword: 'newPass123',
      confirmPassword: 'newPass123',
    });

    expect(component.passwordForm.errors).toBeNull();
    expect(component.passwordForm.valid).toBe(true);
  });

  it('saveInfos calls PATCH /api/v1/users/me with form values including telephone', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne('/api/v1/users/me');
    initReq.flush(mockUser);

    component.saveInfos();

    const saveReq = httpMock.expectOne((r) => r.url === '/api/v1/users/me' && r.method === 'PATCH');
    expect(saveReq.request.body.prenom).toBe('Jean');
    expect(saveReq.request.body.nom).toBe('Dupont');
    expect(saveReq.request.body.telephone).toBe('+212 6 00 00 00 00');
    saveReq.flush(mockUser);

    expect(component.infosSaved()).toBe(true);
    expect(component.saving()).toBe(false);
  });

  it('saveInfos does not call API when form is invalid', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne('/api/v1/users/me');
    initReq.flush(mockUser);

    component.infosForm.patchValue({ prenom: '', nom: '' });
    component.saveInfos();

    expect(component.saving()).toBe(false);
  });

  it('savePassword calls PATCH /api/v1/users/me/password', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne('/api/v1/users/me');
    initReq.flush(mockUser);

    component.passwordForm.patchValue({
      currentPassword: 'oldPass123',
      newPassword: 'newPass456',
      confirmPassword: 'newPass456',
    });

    component.savePassword();

    const saveReq = httpMock.expectOne('/api/v1/auth/me/password');
    expect(saveReq.request.method).toBe('PUT');
    expect(saveReq.request.body).toEqual({ current_password: 'oldPass123', new_password: 'newPass456' });
    saveReq.flush(null);

    expect(component.passwordSaved()).toBe(true);
    expect(component.saving()).toBe(false);
  });

  it('savePassword handles error', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne('/api/v1/users/me');
    initReq.flush(mockUser);

    component.passwordForm.patchValue({
      currentPassword: 'oldPass123',
      newPassword: 'newPass456',
      confirmPassword: 'newPass456',
    });

    component.savePassword();

    const saveReq = httpMock.expectOne('/api/v1/auth/me/password');
    saveReq.error(new ProgressEvent('error'));

    expect(component.saving()).toBe(false);
    expect(component.passwordError()).toContain('Erreur');
  });

  it('infosForm requires prenom and nom', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);

    component.infosForm.patchValue({ prenom: '', nom: '' });
    expect(component.infosForm.invalid).toBe(true);

    component.infosForm.patchValue({ prenom: 'A', nom: 'B' });
    expect(component.infosForm.valid).toBe(true);
  });

  it('saveInfos() sets saving to false on HTTP error', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne('/api/v1/users/me');
    initReq.flush(mockUser);

    component.saveInfos();

    const saveReq = httpMock.expectOne((r) => r.url === '/api/v1/users/me' && r.method === 'PATCH');
    saveReq.error(new ProgressEvent('error'));

    expect(component.saving()).toBe(false);
    expect(component.infosSaved()).toBe(false);
  });

  it('renders password mismatch error message', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.passwordForm.patchValue({
      currentPassword: 'oldPass',
      newPassword: 'newPass123',
      confirmPassword: 'differentPass',
    });
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.profil__error')?.textContent).toContain('ne correspondent pas');
  });
});
