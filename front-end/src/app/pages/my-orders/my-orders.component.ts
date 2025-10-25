import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService} from '../../services/order/order.service';
import {Order, OrderStatus} from '../../interfaces/OrderItem';
import {FormsModule} from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-my-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css']
})
export class MyOrdersComponent implements OnInit {
  private ordersApi = inject(OrderService);
  loading = signal(true);
  items = signal<Order[]>([]);
  page = signal(1);
  pages = signal(1);
  q = signal('');
  status = signal<OrderStatus | ''>('');
  pageSize = signal(20);
  total = signal(0);

  async ngOnInit() { this.fetch(); }

  async fetch() {



    this.loading.set(true);
    const res = await this.ordersApi.mine({
      page: this.page(),
      pageSize: this.pageSize(),
      status: this.status() || undefined
    }).toPromise();
    this.items.set(res?.items ?? []);
    this.total.set(res?.total ?? 0);
    this.loading.set(false);
  }

  setPage(p:number){ this.page.set(p); this.fetch(); }
  filterStatus(v:string){ this.status.set((v || '') as any); this.page.set(1); this.fetch(); }

  trackById = (_:number, o:Order)=>o._id;
}
