import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Rating, ProductRatingsResponse } from '../../interfaces/rating';

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
}
