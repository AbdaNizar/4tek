import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ContactRequest } from '../../interfaces/contact-request';
import {ContactStatus} from '../../interfaces/ContactStatus';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private API = `${environment.apiBaseUrl}/v1/contact`;

  send(payload: ContactRequest & { website?: string }) {
    return this.http.post<{ ok: boolean; id?: string }>(this.API, payload);
  }
  sendConectedUser(payload: ContactRequest & { website?: string }) {
    return this.http.post<{ ok: boolean; id?: string }>(this.API, payload);
  }

  // --- admin
  list(params?: { page?: number; limit?: number; q?: string; status?: string , }) {
    const query = new URLSearchParams();
    if (params?.page)   query.set('page', String(params.page));
    if (params?.limit)  query.set('limit', String(params.limit));
    if (params?.q)      query.set('q', params.q);
    if (params?.status) query.set('status', params.status);
    return this.http.get<{ items: ContactRequest[]; pages: number }>(
      `${this.API}/admin?${query.toString()}`
    ).toPromise();
  }


  mark(id: string, status: ContactStatus) {
    return this.http.patch(`${this.API}/${id}`, { status }).toPromise();
  }


  getOne(id: string) {
    return this.http.get<ContactRequest>(`${this.API}/admin/${id}`);
  }

  update(id: string, payload: Partial<ContactRequest>) {
    return this.http.patch<ContactRequest>(`${this.API}/admin/${id}`, payload);
  }
}

