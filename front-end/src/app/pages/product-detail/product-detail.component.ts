// product-detail.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {NgIf, NgFor, CurrencyPipe, KeyValuePipe, SlicePipe} from '@angular/common';
import { ProductService } from '../../services/product/product.service';
import { CartService } from '../../services/cart/cart.service';
import { getUrl } from '../../shared/constant/function';
import { Product} from '../../interfaces/product';
import {FormsModule} from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-product-detail',
  imports: [NgIf, NgFor, FormsModule, CurrencyPipe, KeyValuePipe, SlicePipe],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api   = inject(ProductService);
  private cart  = inject(CartService);

  product = signal<Product | null>(null);
  images  = signal<string[]>([]);
  activeIndex = signal(0);
  qty = signal(1);

  // remise en %
  discount = computed(() => {
    const p = this.product();
    if (!p?.oldPrice || !p.price) return null;
    return Math.round((1 - p.price / p.oldPrice) * 100);
  });

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.getBySlug(slug).subscribe(p => {
      this.product.set(p);
      const cover = p.imageUrl ? [p.imageUrl] : [];
      const gall  = Array.isArray(p.gallery) ? p.gallery : [];
      this.images.set([...cover, ...gall]);
      this.activeIndex.set(0);
    });
  }

  selectImage(i: number) { this.activeIndex.set(i); }
  inc() { this.qty.update(v => Math.min(99, v + 1)); }
  dec() { this.qty.update(v => Math.max(1, v - 1)); }

  addToCart() {
    const p = this.product();
    if (!p) return;
    this.cart.add({
      id: p._id,
      name: p.name,
      price: p.price,
      qty: this.qty(),
      imageUrl: this.images()[0] ? getUrl(this.images()[0]) : undefined
    });
  }

  protected readonly getUrl = getUrl;
  protected readonly Math = Math;
}
