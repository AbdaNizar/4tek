import {Injectable, inject} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Brand} from '../../interfaces/brand';


@Injectable({providedIn: 'root'})
export class BrandService {
  private http = inject(HttpClient);
  private base = '/brands';

  list(activeOnly?: boolean): Observable<Brand[]> {
    let params = new HttpParams();
    if (activeOnly === true) params = params.set('activeOnly', 'true');
    return this.http.get<Brand[]>(this.base, {params});
  }

  get(id: string) {
    return this.http.get<Brand>(`${this.base}/${id}`);
  }

  create(fd: FormData) {
    return this.http.post<Brand>(this.base, fd);
  }

  update(id: string, payload: Partial<Brand>) {
    return this.http.put<Brand>(`${this.base}/${id}`, payload);
  }

  toggle(id: string, active: boolean) {
    return this.http.patch<Brand>(`${this.base}/${id}/toggle`, { isActive: active });
  }

  replace(id: string, fd: FormData) {
    return this.http.post<Brand>(`${this.base}/${id}/replace`, fd);
  }

  remove(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
