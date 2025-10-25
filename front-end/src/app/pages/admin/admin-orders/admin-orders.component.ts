import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService} from '../../../services/order/order.service';
import { FormsModule } from '@angular/forms';
import {Order, OrderStatus} from '../../../interfaces/OrderItem';

@Component({
  standalone: true,
  selector: 'app-admin-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css']
})
export class AdminOrdersComponent implements OnInit {
  private api = inject(OrderService);

  items = signal<Order[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  q = signal('');
  status = signal<OrderStatus | ''>('');
  loading = signal(false);

  // modal
  modalOpen = signal(false);
  selected = signal<Order | null>(null);
  noteDraft = signal('');

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const res = await this.api.adminList({
      page: this.page(),
      pageSize: this.pageSize(),
      q: this.q(),
      status: this.status() || undefined
    }).toPromise();
    this.items.set(res?.items ?? []);
    this.total.set(res?.total ?? 0);
    this.loading.set(false);
  }

  pages() { return Math.max(1, Math.ceil(this.total() / this.pageSize())); }
  setPage(p: number) { this.page.set(Math.min(Math.max(1, p), this.pages())); this.load(); }

  search(v: string) { this.q.set(v); this.page.set(1); this.load(); }
  filterStatus(v: string) { this.status.set((v || '') as any); this.page.set(1); this.load(); }

  async open(o: Order) {
    const fresh = await this.api.adminGet(o._id).toPromise();
    this.selected.set(fresh!);
    this.noteDraft.set(fresh?.note || '');
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }
  close() { this.modalOpen.set(false); document.body.style.overflow = ''; }

  async setStatus(s: OrderStatus) {
    const o = this.selected(); if (!o) return;
    const updated = await this.api.adminUpdateStatus(o._id, s).toPromise();
    this.selected.set(updated!);
    await this.load();
  }
  async saveNote() {
    const o = this.selected(); if (!o) return;
    const updated = await this.api.adminUpdateNote(o._id, this.noteDraft()).toPromise();
    this.selected.set(updated!);
    await this.load();
  }
}
