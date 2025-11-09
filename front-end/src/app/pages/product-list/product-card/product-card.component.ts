import {Component, inject, Input} from '@angular/core';
import {CurrencyPipe, DecimalPipe, KeyValuePipe, NgIf, SlicePipe} from '@angular/common';
import {getUrl} from '../../../shared/constant/function';
import {Product} from '../../../interfaces/product';
import {RouterLink} from '@angular/router';
import {CartService} from '../../../services/cart/cart.service';
import {ToastService} from '../../../services/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-product-card',
  imports: [NgIf, CurrencyPipe, KeyValuePipe, SlicePipe, RouterLink, DecimalPipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() view: 'grid' | 'list' = 'grid';
  protected readonly getUrl = getUrl;
  protected readonly Math = Math;
  private cart  = inject(CartService);
  private toast = inject(ToastService);

  addToCart() {
    const p = this.product;
    if (!p) return;
    this.cart.add({
      product: p._id,
      name: p.name,
      price: p.price,
      qty: 1,
      imageUrl: getUrl(p.imageUrl)
    });
    this.toast.show('Produit ajouté avec succès.', 'success');
  }
}
