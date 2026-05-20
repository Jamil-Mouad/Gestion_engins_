import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

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
    expect(component.infosForm.value.email).toBe('jean.dupont@mail.com');
  });

  it('renders 3 section toggles', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
    fixture.detectChanges();

    const nativeEl = fixture.nativeElement as HTMLElement;
    const toggles = nativeEl.querySelectorAll('.profil__section-toggle');
    expect(toggles.length).toBe(3);
    expect(toggles[0].textContent).toContain('Informations personnelles');
    expect(toggles[1].textContent).toContain('Sécurité');
    expect(toggles[2].textContent).toContain('Préférences notifications');
  });

  it('shows infos section expanded by default', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);

    expect(component.expandedSections().has('infos')).toBe(true);
  });

  it('toggleSection expands and collapses sections', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);

    expect(component.expandedSections().has('infos')).toBe(true);

    component.toggleSection('infos');
    expect(component.expandedSections().has('infos')).toBe(false);

    component.toggleSection('infos');
    expect(component.expandedSections().has('infos')).toBe(true);

    component.toggleSection('securite');
    expect(component.expandedSections().has('securite')).toBe(true);
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

  it('saveInfos calls PATCH /api/v1/users/me with form values', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne('/api/v1/users/me');
    initReq.flush(mockUser);

    component.saveInfos();

    const saveReq = httpMock.expectOne((r) => r.url === '/api/v1/users/me' && r.method === 'PATCH');
    expect(saveReq.request.body).toEqual({ prenom: 'Jean', nom: 'Dupont', email: 'jean.dupont@mail.com' });
    saveReq.flush(mockUser);

    expect(component.infosSaved()).toBe(true);
    expect(component.saving()).toBe(false);
  });

  it('saveInfos does not call API when form is invalid', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const initReq = httpMock.expectOne('/api/v1/users/me');
    initReq.flush(mockUser);

    component.infosForm.patchValue({ prenom: '', nom: '', email: '' });
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

    const saveReq = httpMock.expectOne('/api/v1/users/me/password');
    expect(saveReq.request.method).toBe('PATCH');
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

    const saveReq = httpMock.expectOne('/api/v1/users/me/password');
    saveReq.error(new ProgressEvent('error'));

    expect(component.saving()).toBe(false);
    expect(component.passwordError()).toContain('Erreur');
  });

  it('infosForm is required with email validation', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);

    component.infosForm.patchValue({ prenom: '', nom: '', email: 'invalid' });
    expect(component.infosForm.invalid).toBe(true);

    component.infosForm.patchValue({ prenom: 'A', nom: 'B', email: 'valid@mail.com' });
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

  it('toggleSection() shows preferences panel when expanded', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const component = fixture.componentInstance;
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
    fixture.detectChanges();

    component.toggleSection('preferences');
    expect(component.expandedSections().has('preferences')).toBe(true);
  });

  it('renders password form with mismatch error message', () => {
    const fixture = TestBed.createComponent(ProfilComponent);
    const req = httpMock.expectOne('/api/v1/users/me');
    req.flush(mockUser);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.toggleSection('securite');
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