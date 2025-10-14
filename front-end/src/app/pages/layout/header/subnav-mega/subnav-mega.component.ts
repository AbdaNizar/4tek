import { Component, OnInit, inject, signal } from '@angular/core';
import {CurrencyPipe, NgFor, NgIf} from '@angular/common';
import { RouterLink } from '@angular/router';

import { CategoryService} from '../../../../services/category/category.service';
import { ProductService} from '../../../../services/product/product.service';
import {SubcategoryService} from '../../../../services/subcategory/subcategory.service';
import {getUrl} from '../../../../shared/constant/function';

type ID = string;

interface Category { _id: ID; name: string; iconUrl?: string; imageUrl?: string; banners?: string[]; isActive: boolean; slug: string; }
interface Subcategory { _id: ID; name: string; slug: string; categoryId: ID; }
interface Product { _id: ID; name: string; price?: number; imageUrl?: string; slug: string; }

const fullUrl = (u?: string) => (!u ? '' : u.startsWith('http') ? u : `http://localhost:3001${u}`);

@Component({
  standalone: true,
  selector: 'app-subnav-mega',
  templateUrl: './subnav-mega.component.html',
  styleUrls: ['./subnav-mega.component.css']
})
export class SubnavMegaComponent implements OnInit {
  private catsApi = inject(CategoryService);
  private subsApi = inject(SubcategoryService);
  private prodApi = inject(ProductService);

  loading = signal(true);
  categories = signal<Category[]>([]);
  open = signal(false);

  // hover state
  activeCatId = signal<ID | null>(null);
  activeSubId = signal<ID | null>(null);

  // caches
  subCache = new Map<ID, Subcategory[]>();
  prodCache = new Map<ID, Product[]>(); // key = subId

  async ngOnInit() {
    try {
      this.loading.set(true);
      const data = await this.catsApi.list().toPromise();
      this.categories.set((data || []).filter(c => c.isActive));
    } finally {
      this.loading.set(false);
    }
  }

  // async onEnterCat(cat: Category) {
  //   this.activeCatId.set(cat._id);
  //   if (!this.subCache.has(cat._id)) {
  //     const subs = await this.subsApi.listParents(cat._id).toPromise();
  //     this.subCache.set(cat._id, subs || []);
  //   }
  //   // default: pick first sub to prefill products
  //   const first = this.subCache.get(cat._id)?.[0];
  //   if (first) this.onEnterSub(first);
  // }

  async onEnterSub(sub: Subcategory) {
    this.activeSubId.set(sub._id);
    if (!this.prodCache.has(sub._id)) {
      const prods = await this.prodApi.listBySubcategory(sub._id, 6).toPromise();
      this.prodCache.set(sub._id, prods?.items || []);
    }
  }

  subsOf(catId: ID) { return this.subCache.get(catId) || []; }
  prodsOf(subId: ID) { return this.prodCache.get(subId) || []; }

  // mobile toggle
  toggle(){ this.open.update(v => !v); }
  close(){ this.open.set(false); this.activeCatId.set(null); this.activeSubId.set(null); }

  protected readonly getUrl = getUrl;
}
