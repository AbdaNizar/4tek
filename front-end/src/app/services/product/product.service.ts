import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Product} from '../../interfaces/product';
import {Category} from '../../interfaces/category';


@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  API = 'http://localhost:3000/v1';

  list(params?: any): Observable<{items: Product[], total: number}> {
    return this.http.get<{items: Product[], total: number}>(`${this.API}/products`, { params });
  }
  getOne(id: string){ return this.http.get<Product>(`${this.API}/products/${id}`); }
  create(fd: FormData){ return this.http.post<Product>(`${this.API}/products`, fd); }
  update(id: string, payload: any){ return this.http.patch<Product>(`${this.API}/products/${id}`, payload); }
  toggle(id: string){ return this.http.post<Product>(`${this.API}/products/${id}/toggle`, {}); }
  remove(id: string){ return this.http.delete<{ok:true}>(`${this.API}/products/${id}`); }
  replace(id: string, fd: FormData) {
    return this.http.put<Product>(`${this.API}/products/${id}/replace`, fd);
  }
  listBySubcategory(subId: string, limit = 6): Observable<{items: Product[], total: number}> {
    return this.http.get<{items: Product[], total: number}>(`${this.API}/products?subCat=${subId}&limit=${limit}`);
  }
  getBySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.API}/products/one/slug/${encodeURIComponent(slug)}`);
  }
}
