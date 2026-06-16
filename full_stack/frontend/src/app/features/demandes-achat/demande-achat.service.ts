import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DemandeAchat, DemandeStatut, DemandeUrgence, NewDemandeForm } from '../../shared/models/demande-achat.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class DemandeAchatService {
  private readonly API = '/api/v1/demandes-achat';
  private http = inject(HttpClient);

  list(params?: { statut?: DemandeStatut; urgence?: DemandeUrgence; q?: string; page?: number; size?: number }): Observable<Page<DemandeAchat>> {
    let httpParams = new HttpParams();
    if (params?.statut) httpParams = httpParams.set('statut', params.statut);
    if (params?.urgence) httpParams = httpParams.set('urgence', params.urgence);
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    return this.http.get<Page<DemandeAchat>>(this.API, { params: httpParams });
  }

  create(form: NewDemandeForm): Observable<DemandeAchat> {
    return this.http.post<DemandeAchat>(this.API, form);
  }

  approuver(id: number): Observable<DemandeAchat> {
    return this.http.patch<DemandeAchat>(`${this.API}/${id}/approuver`, {});
  }

  rejeter(id: number, raison: string): Observable<DemandeAchat> {
    return this.http.patch<DemandeAchat>(`${this.API}/${id}/rejeter`, { raison });
  }

  cloturer(id: number): Observable<DemandeAchat> {
    return this.http.patch<DemandeAchat>(`${this.API}/${id}/cloturer`, {});
  }

  uploadPhoto(file: File): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; filename: string }>('/api/v1/files/demande-photos', formData);
  }
}