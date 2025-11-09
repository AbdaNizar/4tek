import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Product} from '../../interfaces/product';
import {Category} from '../../interfaces/category';


@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);


  list(params?: any): Observable<{items: Product[], total: number}> {
    return this.http.get<{items: Product[], total: number}>(`/products`, { params });
  }
  getOne(id: string){ return this.http.get<Product>(`/products/${id}`); }
  create(fd: FormData){ return this.http.post<Product>(`/products`, fd); }
  update(id: string, payload: any){ return this.http.patch<Product>(`/products/${id}`, payload); }
  toggle(id: string){ return this.http.post<Product>(`/products/${id}/toggle`, {}); }
  toggleToNew(id: string){ return this.http.post<Product>(`/products/${id}/toggle/to/new`, {}); }
  remove(id: string){ return this.http.delete<{ok:true}>(`/products/${id}`); }
  replace(id: string, fd: FormData) {
    return this.http.put<Product>(`/products/${id}/replace`, fd);
  }
  listBySubcategory(subId: string, limit = 12): Observable<{items: Product[], total: number}> {
    return this.http.get<{items: Product[], total: number}>(`/products?subCat=${subId}&limit=${limit}`);
  }
  getBySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`/products/one/slug/${encodeURIComponent(slug)}`);
  }
}
