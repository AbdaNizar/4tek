import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);

  consumption(params: { userId?: string; from?: string; to?: string }) {
    return this.http.get<{items:any[]}>('/admin/reports/profit/consumption', { params: params as any, withCredentials: true });
  }
  profitByOrder(params: { from?: string; to?: string }) {
    return this.http.get<{items:any[]}>('/admin/reports/profit/by-order', { params: params as any, withCredentials: true });
  }
  profitSummary(params: { from?: string; to?: string }) {
    return this.http.get<{ordersCount:number;revenue:number;cost:number;margin:number}>('/admin/reports/profit/summary', { params: params as any, withCredentials: true });
  }

  // util
  async toCsv(rows: any[], headers?: string[]): Promise<string> {
    if (!rows?.length) return '';
    const cols = headers || Object.keys(rows[0]);
    const esc = (v:any)=> `"${String(v ?? '').replace(/"/g,'""')}"`;
    const lines = [
      cols.map(esc).join(','),
      ...rows.map(r => cols.map(c => esc(r[c])).join(','))
    ];
    return lines.join('\n');
  }
}
