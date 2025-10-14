import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {SubCategory} from '../../interfaces/SubCategory';
import {Category} from '../../interfaces/category';
import {ParentCategoryRef} from '../../interfaces/ParentCategoryRef';





@Injectable({ providedIn: 'root' })
export class SubcategoryService {

  constructor(private http: HttpClient) {}
  // change to your real base URL if needed
  private API = 'http://localhost:3000/v1';

  list(): Observable<SubCategory[]> {
    return this.http.get<SubCategory[]>(`${this.API}/subcategories`);
  }

  getOne(id: string): Observable<SubCategory> {
    return this.http.get<SubCategory>(`${this.API}/subcategories/${id}`);
  }

  create(fd: FormData): Observable<SubCategory> {
    return this.http.post<SubCategory>(`${this.API}/subcategories`, fd);
  }

  update(id: string, fd: FormData): Observable<SubCategory> {
    return this.http.put<SubCategory>(`${this.API}/subcategories/${id}`, fd);
  }

  replaceFiles(id: string, fd: FormData): Observable<SubCategory> {
    return this.http.post<SubCategory>(`${this.API}/subcategories/${id}/replace`, fd);
  }

  toggle(id: string, isActive: boolean): Observable<SubCategory> {
    return this.http.post<SubCategory>(`${this.API}/subcategories/${id}/toggle`, { isActive });
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.API}/subcategories/${id}`);
  }

  // parents for the select
  listParents(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.API}/categories`);
  }

  listByCategory(categoryId: string): Observable<SubCategory[]> {
    return this.http.get<SubCategory[]>(`${this.API}/subcategories/by-category/${categoryId}`);
  }


}
