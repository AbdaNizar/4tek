import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Category } from '../../interfaces/category';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private API = `http://localhost:3000/v1`;

  constructor(private http: HttpClient) {}



  list() {
    return this.http.get<Category[]>(`${this.API}/categories`);
  }

  getOne(id: string) {
    return this.http.get<Category>(`${this.API}/categories/${id}`);
  }

  create(fd: FormData) {
    return this.http.post<Category>(`${this.API}/categories`, fd);
  }

  update(id: string, fd: FormData) {
    return this.http.put<Category>(`${this.API}/categories/${id}`, fd);
  }

  toggle(id: string, active: boolean) {
    return this.http.patch<Category>(`${this.API}/categories/${id}/toggle`, { isActive: active });
  }
  replace(id: string, fd: FormData) {
    console.log(fd)
    return this.http.put<Category>(`${this.API}/categories/${id}/replace`, fd);
  }
  remove(id: string) {
    return this.http.delete(`${this.API}/categories/${id}`);
  }
}
