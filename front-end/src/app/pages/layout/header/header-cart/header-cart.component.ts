import {Component, ElementRef, HostListener, inject, signal} from '@angular/core';
import { NgIf, NgFor, CurrencyPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../services/cart/cart.service';

@Component({
  standalone: true,
  selector: 'app-header-cart',
  imports: [NgIf, NgFor, CurrencyPipe, FormsModule, RouterLink],
  templateUrl: './header-cart.component.html',
  styleUrls: ['./header-cart.component.css']
})
export class HeaderCartComponent {
  private el = inject(ElementRef);
  cartOpen = signal(false);
  isMobile = window.innerWidth <= 768;

  // Shared service
  cart = inject(CartService);
  router = inject(Router);

  constructor() {
    // Seed demo items only once (optional, remove in prod)



  }

  // UI helpers backed by service
  count()      { return this.cart.totalCount(); }
  totalCount() { return this.cart.totalCount(); }
  subtotal()   { return this.cart.subtotal(); }

  incQty(i: number)     { this.cart.inc(i); }
  decQty(i: number)     { this.cart.dec(i); }
  onQtyChange(i: number){ this.cart.setQty(i, this.cart.items()[i].qty); }
  remove(i: number)     { this.cart.remove(i); }
  edit(i: number)       { alert(`Modifier l’article: ${this.cart.items()[i].name}`); }

  toggleCart() { this.cartOpen.update(v => !v); }
  checkout()   { this.router.navigateByUrl('/panier'); this.cartOpen.set(false); }




  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent){
    if (!this.cartOpen()) return;
    const inside = this.el.nativeElement.contains(ev.target as Node);
    if (!inside) this.cartOpen.set(false);
  }

}
