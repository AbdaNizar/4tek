import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {Order} from '../../interfaces/OrderItem';

export type OrderStatus = 'pending'|'confirmed'|'shipped'|'delivered'|'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
}



export interface CreateOrderInput {
  items: OrderItem[];
  currency?: string;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = '/api/orders';

  create(payload: CreateOrderInput): Observable<Order> {
    return this.http.post<Order>(`${this.base}`, payload);
  }

  // customer
  mine(opts: { page?: number; pageSize?: number;  status?: OrderStatus; from?: string; to?: string } = {}) {
    let params = new HttpParams();
    Object.entries(opts).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v)); });
    return this.http.get<{items: Order[]; total: number; page: number; pageSize: number}>(`${this.base}/me`, { params });
  }
  byId(id: string) {
    return this.http.get<Order>(`${this.base}/${id}`);
  }

  // admin
  adminList(opts: { page?: number; pageSize?: number; q?: string; status?: OrderStatus; from?: string; to?: string } = {}) {
    let params = new HttpParams();
    Object.entries(opts).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v)); });
    return this.http.get<{items: Order[]; total: number; page: number; pageSize: number}>(`${this.base}/admin`, { params });
  }
  adminGet(id: string) {
    return this.http.get<Order>(`${this.base}/admin/${id}`);
  }
  adminUpdateStatus(id: string, status: OrderStatus) {
    return this.http.patch<Order>(`${this.base}/admin/${id}/status`, { status });
  }
  adminUpdateNote(id: string, note: string) {
    return this.http.patch<Order>(`${this.base}/admin/${id}/note`, { note });
  }
  adminDelete(id: string) {
    return this.http.delete<{ok: true}>(`${this.base}/admin/${id}`);
  }
  adminStats() {
    return this.http.get<{ byStatus: Record<OrderStatus, number>, totalsByStatus: Record<OrderStatus, number>, overall: { count: number, total: number } }>(`${this.base}/admin/stats`);
  }
}
