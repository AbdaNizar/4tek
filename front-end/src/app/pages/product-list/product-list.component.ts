import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Options } from '@angular-slider/ngx-slider';
import { ActivatedRoute } from '@angular/router';

import { ProductControlsComponent } from './product-controls/product-controls.component';
import { ProductFiltersComponent } from './product-filters/product-filters.component';
import { ProductGridComponent } from './product-grid/product-grid.component';
import { SortKey } from '../../interfaces/sortKey';
import { ProductService } from '../../services/product/product.service';
import { Product } from '../../interfaces/product';
import { Brand } from '../../interfaces/brand';

@Component({
  standalone: true,
  selector: 'app-product-list',
  imports: [NgIf, ReactiveFormsModule, ProductControlsComponent, ProductFiltersComponent, ProductGridComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private productsApi = inject(ProductService);

  view = signal<'grid'|'list'>('grid');
  featuredOnly = signal(false);
  sortBy = signal<SortKey>('priceAsc');
  loading = signal(true);

  minValue = signal(0);
  maxValue = signal(10000);
  sliderOptions: Options = { floor: 0, ceil: 10000, step: 50, translate: (v: number) => `${v} DT` };

  f = this.fb.group({
    brand: this.fb.control<string | null>(null),    // text search (optional)
    brandId: this.fb.control<string | null>(null),  // selected brand _id
  });

  /** Only the brands actually present in the loaded products */
  brandFacets = signal<Brand[]>([]);

  products = signal<Product[]>([]);
  private allProducts: Product[] = [];

  ngOnInit() {
    this.route.paramMap.subscribe(async map => {
      const subId = map.get('id');
      if (!subId) {
        this.allProducts = [];
        this.products.set([]);
        this.brandFacets.set([]);
        this.loading.set(false);
        return;
      }
      await this.fetchForSubcategory(subId);
    });

    this.f.valueChanges.subscribe(() => this.applyFilters());
  }

  private async fetchForSubcategory(subId: string) {
    this.loading.set(true);
    try {
      const data = await this.productsApi.listBySubcategory(subId).toPromise();
      this.allProducts = (data?.items || []);
      this.products.set(this.allProducts);

      if (this.allProducts.length) {
        const prices = this.allProducts.map(p => p.price ?? 0);
        const floor = Math.floor(Math.min(...prices));
        const ceil  = Math.ceil(Math.max(...prices));
        this.minValue.set(floor);
        this.maxValue.set(ceil);
        this.sliderOptions = { ...this.sliderOptions, floor, ceil };
      }

      // Build brand facets from loaded products only
      this.buildBrandFacets(this.allProducts);

      this.applyFilters();
    } finally {
      this.loading.set(false);
    }
  }

  /** Normalize brand from p.brand OR p.brands into your Brand shape */
  private getBrandInfo(p: any): Brand | null {
    const raw = p?.brands ?? p?.brand ?? null;
    if (!raw) return null;

    // raw can be a string id or a Brand-like object
    if (typeof raw === 'string') {
      const name = raw;
      return { _id: raw, name, slug: this.slugify(name) };
    }
    console.log('row',raw)
    const _id  = raw._id ?? raw.id ?? (raw.slug ?? raw.name ?? '').toString();
    const name = (raw.name ?? raw.label ?? _id ?? '').toString();
    const slug = (raw.slug ?? this.slugify(name));
    const iconUrl = raw.iconUrl ?? raw.icon ?? raw.imageUrl ?? undefined;

    if (!_id || !name) return null;
    return { _id, name, slug, iconUrl };
  }

  private slugify(s: string): string {
    return (s || '')
      .toString()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Build available brands (with counts) from products */
  private buildBrandFacets(rows: Product[]) {
    type BAcc = Brand & { count: number };
    const map = new Map<string, BAcc>();

    for (const p of rows) {
      const b = this.getBrandInfo(p);
      if (!b) continue;

      const key = b._id; // stable key is the brand _id
      const ex = map.get(key);
      if (ex) ex.count += 1;
      else map.set(key, { ...b, count: 1 });
    }

    const facets: Brand[] = Array.from(map.values())
      .sort((a,b) => (b.count - a.count) || a.name.localeCompare(b.name))
      .map(({count, ...rest}) => ({ ...rest, count })); // keep count in Brand

    this.brandFacets.set(facets);

    // If a selected brand is no longer present, clear selection
    const currentId = this.f.controls.brandId.value;
    if (currentId && !facets.some(f => f._id === currentId)) {
      this.f.patchValue({ brandId: null }, { emitEvent: false });
    }
  }

  onSortChange(v: SortKey) { this.sortBy.set(v); this.applyFilters(); }

  applyFilters() {
    let arr = [...this.allProducts];

    const { brandId, brand } = (this.f?.value || {}) as { brandId?: string | null; brand?: string | null; };
    const min = this.minValue();
    const max = this.maxValue();

    const getBrandId = (p: any): string | null => {
      const info = this.getBrandInfo(p);
      return info?._id ?? null;
    };
    const getBrandName = (p: any): string => {
      const info = this.getBrandInfo(p);
      return info?.name || '';
    };

    if (brandId) arr = arr.filter(p => getBrandId(p) === brandId);
    if (brand && brand.trim()) {
      const q = brand.trim().toLowerCase();
      arr = arr.filter(p => getBrandName(p).toLowerCase().includes(q));
    }

    arr = arr.filter(p => (p.price ?? 0) >= min && (p.price ?? 0) <= max);

    if (this.featuredOnly()) arr = arr.filter(p => (p as any).isFeatured === true);

    switch (this.sortBy()) {
      case 'priceAsc':  arr.sort((a,b)=> (a.price??0) - (b.price??0)); break;
      case 'priceDesc': arr.sort((a,b)=> (b.price??0) - (a.price??0)); break;
      case 'newest':arr = arr.filter(p => (p as any).isNew === true) ;
      /* if you have createdAt, sort here; otherwise keep as is */
        break;
    }

    this.products.set(arr);

    // If you want the brand list to react to current filtered set:
    // this.buildBrandFacets(arr);
  }
}
