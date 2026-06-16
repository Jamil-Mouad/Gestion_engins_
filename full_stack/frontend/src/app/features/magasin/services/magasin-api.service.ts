import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Page } from '../../../shared/models/pagination.model';
import {
  Arrivage, ArrivagePayload, BaremeRow, Citerne, Conversion, DashboardKpi,
  ImportGasoilReport, Jaugeage, LastTotaliseur, Sortie, SortiePayload,
  VehiculeKpi, VehiculeSuggest,
} from '../models/magasin.model';

@Injectable({ providedIn: 'root' })
export class MagasinApiService {
  private readonly API = '/api/v1/magasin';
  private http = inject(HttpClient);

  // ── Citerne & barème ──────────────────────────────────────────────────────
  getCiterne(): Observable<Citerne> {
    return this.http.get<Citerne>(`${this.API}/citerne`);
  }

  updateCiterne(payload: Omit<Citerne, 'id'>): Observable<Citerne> {
    return this.http.put<Citerne>(`${this.API}/citerne`, payload);
  }

  getBareme(): Observable<BaremeRow[]> {
    return this.http.get<BaremeRow[]>(`${this.API}/citerne/bareme`);
  }

  replaceBareme(rows: { hauteurCm: number; litres: number }[]): Observable<BaremeRow[]> {
    return this.http.put<BaremeRow[]>(`${this.API}/citerne/bareme`, { rows });
  }

  convert(hauteurCm: number): Observable<Conversion> {
    const params = new HttpParams().set('hauteurCm', hauteurCm.toString());
    return this.http.get<Conversion>(`${this.API}/citerne/conversion`, { params });
  }

  // ── Arrivages ─────────────────────────────────────────────────────────────
  listArrivages(opts?: { dateMin?: string; dateMax?: string; page?: number; size?: number }): Observable<Page<Arrivage>> {
    return this.http.get<Page<Arrivage>>(`${this.API}/arrivages`, { params: this.toParams(opts) });
  }

  createArrivage(payload: ArrivagePayload): Observable<Arrivage> {
    return this.http.post<Arrivage>(`${this.API}/arrivages`, payload);
  }

  updateArrivage(id: number, payload: ArrivagePayload): Observable<Arrivage> {
    return this.http.put<Arrivage>(`${this.API}/arrivages/${id}`, payload);
  }

  deleteArrivage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/arrivages/${id}`);
  }

  // ── Sorties ───────────────────────────────────────────────────────────────
  listSorties(opts?: {
    dateMin?: string; dateMax?: string; vehiculeCode?: string; search?: string;
    page?: number; size?: number;
  }): Observable<Page<Sortie>> {
    return this.http.get<Page<Sortie>>(`${this.API}/sorties`, { params: this.toParams(opts) });
  }

  lastTotaliseur(): Observable<LastTotaliseur> {
    return this.http.get<LastTotaliseur>(`${this.API}/sorties/last-totaliseur`);
  }

  createSortie(payload: SortiePayload): Observable<Sortie> {
    return this.http.post<Sortie>(`${this.API}/sorties`, payload);
  }

  updateSortie(id: number, payload: SortiePayload): Observable<Sortie> {
    return this.http.put<Sortie>(`${this.API}/sorties/${id}`, payload);
  }

  deleteSortie(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/sorties/${id}`);
  }

  suggestVehicules(q: string): Observable<VehiculeSuggest[]> {
    return this.http.get<VehiculeSuggest[]>(`${this.API}/vehicules/suggest`, { params: new HttpParams().set('q', q) });
  }

  suggestDestinations(q: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.API}/destinations/suggest`, { params: new HttpParams().set('q', q) });
  }

  // ── Jaugeages ─────────────────────────────────────────────────────────────
  listJaugeages(opts?: { page?: number; size?: number }): Observable<Page<Jaugeage>> {
    return this.http.get<Page<Jaugeage>>(`${this.API}/jaugeages`, { params: this.toParams(opts) });
  }

  createJaugeage(payload: { dateJaugeage: string; hauteurCm: number }): Observable<Jaugeage> {
    return this.http.post<Jaugeage>(`${this.API}/jaugeages`, payload);
  }

  deleteJaugeage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/jaugeages/${id}`);
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  exportExcel(opts: { entites: string[]; dateMin?: string; dateMax?: string; month?: string; columns?: string[] }): Observable<Blob> {
    let params = new HttpParams().set('entites', opts.entites.join(','));
    if (opts.dateMin) params = params.set('dateMin', opts.dateMin);
    if (opts.dateMax) params = params.set('dateMax', opts.dateMax);
    if (opts.month) params = params.set('month', opts.month);
    for (const col of opts.columns ?? []) {
      params = params.append('columns', col);
    }
    return this.http.get(`${this.API}/export/excel`, { params, responseType: 'blob' });
  }

  // ── Import historique ─────────────────────────────────────────────────────
  importGasoil(file: File): Observable<ImportGasoilReport> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportGasoilReport>(`${this.API}/import/gasoil`, form);
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  dashboardKpis(month?: string): Observable<DashboardKpi> {
    return this.http.get<DashboardKpi>(`${this.API}/kpis/dashboard`, { params: this.toParams({ month }) });
  }

  vehiculeKpis(code: string, type?: string, month?: string): Observable<VehiculeKpi> {
    return this.http.get<VehiculeKpi>(`${this.API}/kpis/vehicule`, { params: this.toParams({ code, type, month }) });
  }

  private toParams(opts?: Record<string, string | number | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(opts ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    }
    return params;
  }
}
