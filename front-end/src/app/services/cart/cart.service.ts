// src/app/services/cart/cart.service.ts
import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { debounceTime, exhaustMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { CartItem } from '../../interfaces/cartItem';

type CartDTO = { items: CartItem[] };

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private API = `${environment.apiBaseUrl}/v1/cart`;

  // ⚠️ Ne pas hydrater depuis localStorage si déjà connecté
  items = signal<CartItem[]>([]);

  private sync$ = new Subject<void>();
  private mergedAfterLogin = false;
  private prevUserId: string | null = null;

  constructor() {
    // Hydrate au démarrage selon l'état d'auth
    if (this.auth.isLoggedIn()) {
      // source de vérité = serveur
      this.loadFromServerOnce();
    } else {
      // invité → lire localStorage
      this.items.set(this.readGuest());
    }

    // Persister dans localStorage uniquement si invité
    effect(() => {
      if (!this.auth.isLoggedIn()) {
        localStorage.setItem('cart_items', JSON.stringify(this.items()));
      }
    });

    // Sync serveur (uniquement connecté)
    this.sync$
      .pipe(
        debounceTime(300),
        exhaustMap(() => {
          if (!this.auth.isLoggedIn()) return of(null);
          const payload: CartDTO = { items: this.items() };
          return this.http.put<CartDTO>(this.API, payload).pipe(catchError(() => of(null)));
        })
      )
      .subscribe();

    // Réagir aux changements d'auth (Signal)
    effect(() => {
      const u = this.auth.user();
      console.log(this.auth.user())
      const uid = u?.id || null;

      // Transition vers un nouvel utilisateur connecté
      if (u && uid !== this.prevUserId) {
        this.prevUserId = uid;

        // Ne merge que s'il existe réellement un panier invité
        if (!this.mergedAfterLogin && this.hasGuestCart()) {
          this.mergedAfterLogin = true;
          this.mergeGuestIntoServer().then(() => this.loadFromServerOnce());
        } else {
          // Pas de panier invité -> juste charger depuis serveur
          this.loadFromServerOnce();
        }
      }

      // Déconnexion → autoriser un futur merge et relire local
      if (!u) {
        this.prevUserId = null;
        this.mergedAfterLogin = false;
        // re-hydrate invité
        this.items.set(this.readGuest());
      }
    });
  }

  totalCount() { return this.items().reduce((s, x) => s + x.qty, 0); }
  subtotal()   { return this.items().reduce((s, x) => s + x.qty * x.price, 0); }

  async loadFromServerOnce() {
    if (!this.auth.isLoggedIn()) return;
    try {
      const res = await this.http.get<CartDTO>(this.API).toPromise();
      if (res?.items) this.items.set(res.items);
    } catch {}
  }

  private queueSync() {
    if (!this.auth.isLoggedIn()) return;
    this.sync$.next();
  }

  add(item: CartItem) {
    const arr = [...this.items()];
    const idx = arr.findIndex(x => x.product === item.product);
    if (idx >= 0) arr[idx] = { ...arr[idx], qty: arr[idx].qty + (item.qty || 1) };
    else arr.push({ ...item, qty: item.qty || 1 });
    this.items.set(arr);
    this.queueSync();
  }

  setQty(i: number, qty: number) {
    const arr = [...this.items()];
    arr[i] = { ...arr[i], qty: Math.max(1, +qty || 1) };
    this.items.set(arr);
    this.queueSync();
  }

  inc(i: number) {
    const arr = [...this.items()];
    arr[i] = { ...arr[i], qty: arr[i].qty + 1 };
    this.items.set(arr);
    this.queueSync();
  }

  dec(i: number) {
    const arr = [...this.items()];
    arr[i] = { ...arr[i], qty: Math.max(1, arr[i].qty - 1) };
    this.items.set(arr);
    this.queueSync();
  }

  remove(i: number) {
    const arr = [...this.items()];
    arr.splice(i, 1);
    this.items.set(arr);
    this.queueSync();
  }

  clear() {
    this.items.set([]);
    this.queueSync();
    if (!this.auth.isLoggedIn()) {
      localStorage.removeItem('cart_items');
    }
  }

  private async mergeGuestIntoServer() {
    try {
      // 1) Panier invité (local)
      const guest = this.readGuest();
      if (!guest.length) return;

      // 2) Panier serveur actuel (source de vérité côté compte)
      let serverItems: CartItem[] = [];
      try {
        const current = await this.http.get<{ items: CartItem[] }>(this.API).toPromise();
        serverItems = current?.items || [];
      } catch {
        serverItems = [];
      }

      // 3) Fusion SANS addition : le guest ÉCRASE la quantité serveur pour le même produit
      const byId = new Map<string, CartItem>();
      // a) commencer avec le serveur
      for (const it of serverItems) byId.set(it.product, { ...it });
      // b) puis écraser par le guest (remplace la qty pour les mêmes produits)
      for (const it of guest) byId.set(it.product, { ...it, qty: Math.max(1, it.qty || 1) });

      const merged = Array.from(byId.values());

      // 4) Écrire le résultat final côté serveur (PUT = overwrite)
      const res = await this.http.put<{ items: CartItem[] }>(this.API, { items: merged }).toPromise();

      // 5) Mettre à jour le signal et vider le local guest pour éviter des re-fusions
      if (res?.items) this.items.set(res.items);
      localStorage.removeItem('cart_items');
    } catch {
      // en cas d'erreur, ne rien casser
    }
  }


  private readGuest(): CartItem[] {
    try {
      return JSON.parse(localStorage.getItem('cart_items') || '[]') as CartItem[];
    } catch {
      return [];
    }
  }

  private hasGuestCart(): boolean {
    try {
      const arr = JSON.parse(localStorage.getItem('cart_items') || '[]');
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  }
}
