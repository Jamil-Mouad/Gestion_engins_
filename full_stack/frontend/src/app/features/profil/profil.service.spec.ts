import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProfilService } from './profil.service';
import { User } from '../../shared/models/user.model';

describe('ProfilService', () => {
  let service: ProfilService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 1,
    prenom: 'Ahmed',
    nom: 'Benali',
    email: 'ahmed@intersig.ma',
    role: 'ADMIN',
    dashboardConfig: null,
    actif: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfilService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(ProfilService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMe() calls GET /api/v1/users/me', () => {
    service.getMe().subscribe((user) => {
      expect(user.prenom).toBe('Ahmed');
    });

    const req = httpMock.expectOne('/api/v1/users/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('updateMe() calls PATCH /api/v1/users/me', () => {
    const update = { prenom: 'Ahmed', nom: 'Benali', email: 'ahmed@intersig.ma' };
    service.updateMe(update).subscribe((user) => {
      expect(user.prenom).toBe('Ahmed');
    });

    const req = httpMock.expectOne('/api/v1/users/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(update);
    req.flush(mockUser);
  });

  it('getMe() handles 500 error', () => {
    let errored = false;
    service.getMe().subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(500); } });
    httpMock.expectOne('/api/v1/users/me').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(errored).toBeTrue();
  });

  it('updateMe() handles 400 error', () => {
    let errored = false;
    service.updateMe({ email: 'bad' }).subscribe({ next: () => fail(), error: (err) => { errored = true; expect(err.status).toBe(400); } });
    httpMock.expectOne('/api/v1/users/me').flush('bad', { status: 400, statusText: 'Bad Request' });
    expect(errored).toBeTrue();
  });
});