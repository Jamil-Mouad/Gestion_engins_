import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ReleveCompteur } from '../../shared/models/releve-compteur.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class ReleveCompteurService {
  private readonly API = '/api/v1/releves-compteur';
  private http = inject(HttpClient);

  list(params?: { vehiculeId?: number; page?: number; size?: number }): Observable<Page<ReleveCompteur>> {
    let httpParams = new HttpParams();
    if (params?.vehiculeId) httpParams = httpParams.set('vehicule_id', params.vehiculeId.toString());
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    return this.http.get<Page<ReleveCompteur>>(this.API, { params: httpParams });
  }

  create(form: Partial<ReleveCompteur>): Observable<ReleveCompteur> {
    return this.http.post<ReleveCompteur>(this.API, form);
  }
}