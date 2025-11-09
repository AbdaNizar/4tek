// src/app/services/search/search.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {SearchHit} from '../../interfaces/SearchHit';
import {Product} from '../../interfaces/product';



@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);
  private base = '/search';

  suggest(q: string, limit = 8): Observable<SearchHit[]> {
    const params = new HttpParams().set('q', q).set('limit', limit);
    return this.http.get<SearchHit[]>(`${this.base}/suggest`, { params });
  }
  search(q: string, page = 1, limit = 24): Observable<{items: Product[]; total: number; page: number; limit: number}> {
    const params = new HttpParams()
      .set('q', q)
      .set('page', page)
      .set('limit', limit);
    return this.http.get<{items: Product[]; total: number; page: number; limit: number}>(this.base, { params });
  }
}
