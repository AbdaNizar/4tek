// src/app/pages/admin/users/admin-users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {User} from '../auth/auth.service';
import {Order} from '../../interfaces/OrderItem';



@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  list(opts: {
    q?: string;
    active?: string;        // 'true' | 'false'
    verified?: string;      // 'true' | 'false'
    provider?: string;      // 'google' | 'facebook' | 'local'
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(opts || {})) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<{ items: User[]; total: number; page: number; pages: number; limit: number }>(
      `auth/admin/users`, { params }
    );
  }

  detail(id: string) {
    return this.http.get<{ user: User; orders: Order[] }>(`auth/admin/users/${id}`);
  }
}
