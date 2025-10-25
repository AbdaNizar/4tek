import { Component, inject, signal } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../../services/cart/cart.service';

@Component({
  standalone: true,
  selector: 'app-header-cart',
  imports: [NgIf, NgFor, FormsModule, CurrencyPipe, RouterLink, NgClass],
  templateUrl: './header-cart.component.html',
  styleUrls: ['./header-cart.component.css']
})
export class HeaderCartComponent {
  cart = inject(CartService);
  cartOpen = signal(false);

  toggleCart() { this.cartOpen.update(v => !v); }

  totalCount() { return this.cart.totalCount(); }
  subtotal() { return this.cart.subtotal(); }

  inc(i: number) { this.cart.inc(i); }
  dec(i: number) { this.cart.dec(i); }
  onQtyChange(i: number) { this.cart.setQty(i, this.cart.items()[i].qty); }
  remove(i: number) { this.cart.remove(i); }

  checkout() { this.cartOpen.set(false); }
}
