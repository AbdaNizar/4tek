import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {Rating, ProductRatingsResponse, RatingStatus} from '../../interfaces/rating';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private http = inject(HttpClient);
  private base = `${environment.api_Url}/ratings`;

  listForProduct(productId: string): Observable<ProductRatingsResponse> {
    return this.http.get<ProductRatingsResponse>(`${this.base}/product/${productId}`);
  }

  getMine(productId: string): Observable<Rating | null> {
    return this.http.get<Rating | null>(`${this.base}/my/${productId}`);
  }

  createOrUpsert(payload: Pick<Rating,'productId'|'stars'|'comment'>): Observable<Rating> {
    return this.http.post<Rating>(this.base, payload);
  }


  list(params: {status?: string; q?: string; page?: number; pageSize?: number}) {
    const query = new URLSearchParams();
    if (params.status)   query.set('status', params.status);
    if (params.q)        query.set('q', params.q);
    if (params.page)     query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return this.http.get<{ items: Rating[]; total: number; page: number; pageSize: number }>(
      `/ratings/admin?${query.toString()}`
    );
  }

  setStatus(id: string, status: RatingStatus | 'pending') {
    return this.http.patch<Rating>(`/ratings/admin/${id}/status`, { status });
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean }>(`/ratings/admin/${id}`);
  }
}
