import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {SubCategory} from '../../interfaces/SubCategory';
import {Category} from '../../interfaces/category';
import {ParentCategoryRef} from '../../interfaces/ParentCategoryRef';





@Injectable({ providedIn: 'root' })
export class SubcategoryService {

  constructor(private http: HttpClient) {}


  list(): Observable<SubCategory[]> {
    return this.http.get<SubCategory[]>(`/subcategories`);
  }

  getOne(id: string): Observable<SubCategory> {
    return this.http.get<SubCategory>(`/subcategories/${id}`);
  }

  create(fd: FormData): Observable<SubCategory> {
    return this.http.post<SubCategory>(`/subcategories`, fd);
  }

  update(id: string, fd: FormData): Observable<SubCategory> {
    return this.http.put<SubCategory>(`/subcategories/${id}`, fd);
  }

  replaceFiles(id: string, fd: FormData): Observable<SubCategory> {
    return this.http.post<SubCategory>(`/subcategories/${id}/replace`, fd);
  }

  toggle(id: string, isActive: boolean): Observable<SubCategory> {
    return this.http.post<SubCategory>(`/subcategories/${id}/toggle`, { isActive });
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/subcategories/${id}`);
  }

  // parents for the select
  listParents(): Observable<Category[]> {
    return this.http.get<Category[]>(`/categories`);
  }

  listByCategory(categoryId: string): Observable<SubCategory[]> {
    return this.http.get<SubCategory[]>(`/subcategories/by-category/${categoryId}`);
  }


}
