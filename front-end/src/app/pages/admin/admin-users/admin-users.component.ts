// src/app/pages/admin/users/admin-users.component.ts
import { Component, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService} from '../../../services/admin/admin.service';
import {User} from '../../../services/auth/auth.service';
import {Order} from '../../../interfaces/OrderItem';
import {getUrl} from '../../../shared/constant/function';

@Component({
  standalone: true,
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent {
  private api = inject(AdminService);

  // filters
  q = signal<string>('');
  active = signal<string>('');    // '', 'true', 'false'
  verified = signal<string>('');  // '', 'true', 'false'
  provider = signal<string>('');  // '', 'google', 'facebook', 'local'

  // paging
  page = signal(1);
  pages = signal(1);
  total = signal(0);

  loading = signal(false);
  items = signal<User[]>([]);

  // modal
  modalOpen = signal(false);
  selected = signal<User | null>(null);
  orders = signal<Order[]>([]);
  detailLoading = signal(false);

  // local debounce timer for the search query
  private qDebounceId: any = null;

  constructor() {
    // Effect 1: react to non-query filters & page changes immediately
    effect(() => {
      // read signals to track them as dependencies
      const _p = this.page();
      const _a = this.active();
      const _v = this.verified();
      const _pr = this.provider();
      // whenever any of these change, load list
      this.load();
    });

    // Effect 2: query changes (debounced 300ms) + reset to page 1
    effect(() => {
      const _q = this.q();
      if (this.qDebounceId) clearTimeout(this.qDebounceId);
      this.qDebounceId = setTimeout(() => {
        this.page.set(1);
        this.load();
      }, 300);
    });

    // initial load (optional; effects above will also trigger)
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.api.list({
        q: this.q(),
        active: this.active(),
        verified: this.verified(),
        provider: this.provider(),
        page: this.page(),
        limit: 20,
        sort: '-createdAt'
      }).toPromise();

      this.items.set(res?.items || []);
      this.total.set(res?.total ?? 0);
      this.pages.set(res?.pages ?? 1);
    } finally {
      this.loading.set(false);
    }
  }

  setPage(p: number) {
    const max = this.pages();
    this.page.set(Math.min(Math.max(1, p), max));
  }

  async open(u: User) {
    this.selected.set(u);
    this.orders.set([]);
    this.modalOpen.set(true);
    this.detailLoading.set(true);
    try {
      console.log('ud',u._id)
      const res = await this.api.detail(u._id).toPromise();
      if (res?.user) this.selected.set(res.user);
      this.orders.set(res?.orders || []);
    } finally {
      this.detailLoading.set(false);
    }
  }

  close() { this.modalOpen.set(false); this.selected.set(null); this.orders.set([]); }



  trackById(_: number, it: User) { return it._id; }

  protected readonly getUrl = getUrl;
}
