import { Component, inject, signal, OnInit, computed } from '@angular/core';
import {NgIf, NgFor, DatePipe, CurrencyPipe, DecimalPipe, KeyValuePipe} from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {Product} from '../../../interfaces/product';
import {ProductService} from '../../../services/product/product.service';
import {getUrl} from '../../../shared/constant/function';




@Component({
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, CurrencyPipe, RouterLink, DecimalPipe, KeyValuePipe],
  selector: 'app-admin-product-detail',
  templateUrl: './admin-product-detail.component.html',
  styleUrl: './admin-product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ProductService);

  loading = signal(true);
  p = signal<Product | null>(null);
  descExpanded = signal(false);

  toggleDesc(){ this.descExpanded.update(v => !v); }

  priceFmt = (v?: number, ccy?: string) => (v ?? 0).toLocaleString(undefined, { style: 'currency', currency: ccy || 'TND' });

  ratingFill = computed(() => {
    const avg = Math.max(0, Math.min(5, this.p()?.ratingAvg ?? 0));
    return `${avg * 20}%`;
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('slug')!;
    this.loading.set(true);
    try{
      const data  = await this.api.getOne(id).toPromise();
      this.p.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly getUrl = getUrl;
}
