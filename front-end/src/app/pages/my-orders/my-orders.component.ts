import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order/order.service';
import { AuthService } from '../../services/auth/auth.service';
import { Order, OrderStatus } from '../../interfaces/OrderItem';

@Component({
  standalone: true,
  selector: 'app-my-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css']
})
export class MyOrdersComponent {
  private ordersApi = inject(OrderService);
  private auth = inject(AuthService);

  loading  = signal(true);
  items    = signal<Order[]>([]);
  page     = signal(1);
  pages    = signal(1);
  q        = signal('');
  status   = signal<OrderStatus | ''>('');
  pageSize = signal(20);
  total    = signal(0);

  /** commande sélectionnée dans le modal */
  selectedOrder = signal<Order | null>(null);

  /** Séquence d'appel pour ignorer les réponses en retard */
  private reqSeq = 0;

  constructor() {
    effect(() => {
      const user = this.auth.user(); // signal<User|null>

      this.page.set(1);
      this.items.set([]);
      this.total.set(0);

      if (user) {
        this.fetch();
      } else {
        this.loading.set(false);
      }
    }, { allowSignalWrites: true });
  }

  async fetch() {
    const seq = ++this.reqSeq;
    this.loading.set(true);
    this.items.set([]);

    try {
      const res = await this.ordersApi.mine({
        page: this.page(),
        pageSize: this.pageSize(),
        status: this.status() || undefined
      }).toPromise();

      if (seq !== this.reqSeq) return;

      const items = res?.items ?? [];
      const total = res?.total ?? 0;
      const perPage = this.pageSize();

      this.items.set(items);
      this.total.set(total);
      this.pages.set(Math.max(1, Math.ceil(total / perPage)));
    } catch {
      if (seq !== this.reqSeq) return;
      this.items.set([]);
      this.total.set(0);
      this.pages.set(1);
    } finally {
      if (seq === this.reqSeq) this.loading.set(false);
    }
  }

  setPage(p: number) {
    if (p < 1 || (this.pages() && p > this.pages())) return;
    this.page.set(p);
    this.fetch();
  }

  filterStatus(v: string) {
    this.status.set((v || '') as any);
    this.page.set(1);
    this.fetch();
  }

  /** ouvrir le modal de détails */
  openDetails(o: Order) {
    this.selectedOrder.set(o);
  }

  /** fermer le modal */
  closeDetails(e?: MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    this.selectedOrder.set(null);
  }

  trackById = (_: number, o: Order) => o._id;

  // Map statut anglais -> français
  statusLabel(status?: string): string {
    switch ((status || '').toLowerCase()) {
      case 'pending':   return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'paid':      return 'Payée';
      case 'shipped':   return 'Expédiée';
      case 'delivered': return 'Livrée';
      case 'cancelled':
      case 'canceled':  return 'Annulée';
      default:          return status || '—';
    }
  }
}
