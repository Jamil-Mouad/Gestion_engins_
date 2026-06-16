import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { User } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfilService {
  private readonly API = '/api/v1/users/me';
  private http = inject(HttpClient);

  getMe(): Observable<User> {
    return this.http.get<User>(this.API);
  }

  updateMe(form: Partial<User>): Observable<User> {
    return this.http.patch<User>(this.API, form);
  }
}