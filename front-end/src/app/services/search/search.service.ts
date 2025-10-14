// src/app/services/search/search.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {SearchHit} from '../../interfaces/SearchHit';



@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);
  private base = '/api/search';

  suggest(q: string, limit = 8): Observable<SearchHit[]> {
    const params = new HttpParams().set('q', q).set('limit', limit);
    return this.http.get<SearchHit[]>(`${this.base}/products`, { params });
  }
}
