import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Category } from '../../interfaces/category';

@Injectable({ providedIn: 'root' })
export class CategoryService {


  constructor(private http: HttpClient) {}



  list() {
    return this.http.get<Category[]>(`/categories`);
  }

  getOne(id: string) {
    return this.http.get<Category>(`/categories/${id}`);
  }

  create(fd: FormData) {
    return this.http.post<Category>(`/categories`, fd);
  }

  update(id: string, fd: FormData) {
    return this.http.put<Category>(`/categories/${id}`, fd);
  }

  toggle(id: string, active: boolean) {
    return this.http.patch<Category>(`/categories/${id}/toggle`, { isActive: active });
  }
  replace(id: string, fd: FormData) {
    return this.http.put<Category>(`/categories/${id}/replace`, fd);
  }
  remove(id: string) {
    return this.http.delete(`/categories/${id}`);
  }
}
