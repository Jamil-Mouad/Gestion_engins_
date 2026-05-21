import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ImportPreview, ImportType, ImportsHistorique } from '../../shared/models/import.model';
import { Page } from '../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly API = '/api/v1/import';
  private http = inject(HttpClient);

  uploadExcel(file: File, type: ImportType): Observable<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<ImportPreview>(`${this.API}/excel`, formData);
  }

  getHistorique(params?: { page?: number; size?: number }): Observable<Page<ImportsHistorique>> {
    let httpParams = new HttpParams();
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    return this.http.get<Page<ImportsHistorique>>(`${this.API}/historique`, { params: httpParams });
  }
}