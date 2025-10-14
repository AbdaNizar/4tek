import { Injectable, signal, effect } from '@angular/core';
import {CartItem} from '../../interfaces/cartItem';



@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly STORAGE_KEY = 'cart_items';

  items = signal<CartItem[]>(this.load());

  constructor() {
    // 🔥 observe les changements de items
    effect(() => {
      const data = this.items();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    });
  }

  /* --------- CRUD --------- */
  add(item: CartItem) {
    const arr = [...this.items()];
    const existing = arr.find(it => it.id === item.id);
    if (existing) {
      existing.qty += item.qty;
    } else {
      arr.push(item);
    }
    this.items.set(arr);
  }

  remove(i: number) {
    const arr = [...this.items()];
    arr.splice(i, 1);
    this.items.set(arr);
  }

  clear() {
    this.items.set([]);
  }

  inc(i: number) {
    const arr = [...this.items()];
    arr[i].qty++;
    this.items.set(arr);
  }

  dec(i: number) {
    const arr = [...this.items()];
    arr[i].qty = Math.max(1, arr[i].qty - 1);
    this.items.set(arr);
  }

  setQty(i: number, qty: number) {
    const arr = [...this.items()];
    arr[i].qty = Math.max(1, qty);
    this.items.set(arr);
  }

  totalCount() {
    return this.items().reduce((n, it) => n + it.qty, 0);
  }

  subtotal() {
    return this.items().reduce((s, it) => s + it.qty * it.price, 0);
  }

  /* --------- LocalStorage --------- */
  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
