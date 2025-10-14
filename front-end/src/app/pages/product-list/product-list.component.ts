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
import { Product} from '../../interfaces/product';


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
    brand: this.fb.control<string | null>(null),
    brandId: this.fb.control<string | null>(null),
  });

  products = signal<Product[]>([]);
  private allProducts: Product[] = [];

  ngOnInit() {
    // when route param changes, (re)load products for that sub-category
    this.route.paramMap.subscribe(async map => {
      const subId = map.get('id');
      if (!subId) {
        this.allProducts = [];
        this.products.set([]);
        this.loading.set(false);
        return;
      }
      await this.fetchForSubcategory(subId);
    });

    // react to filter changes
    this.f.valueChanges.subscribe(() => this.applyFilters());
  }

  private async fetchForSubcategory(subId: string) {
    this.loading.set(true);
    try {
      const data = await this.productsApi.listBySubcategory(subId).toPromise();
      this.allProducts = (data?.items || []);
      // if no products, show nothing
      this.products.set(this.allProducts);
      // reset slider bounds from data if needed
      if (this.allProducts.length) {
        const prices = this.allProducts.map(p => p.price ?? 0);
        const floor = Math.floor(Math.min(...prices));
        const ceil  = Math.ceil(Math.max(...prices));
        this.minValue.set(floor);
        this.maxValue.set(ceil);
        this.sliderOptions = { ...this.sliderOptions, floor, ceil };
      }
      this.applyFilters();
    } finally {
      this.loading.set(false);
    }
  }

  onSortChange(v: SortKey) { this.sortBy.set(v); this.applyFilters(); }

  applyFilters() {
    let arr = [...this.allProducts];

    // Valeurs du formulaire et sliders
    const { brandId, brand } = (this.f?.value || {}) as {
      brandId?: string | null;
      brand?: string | null;
    };
    const min = this.minValue();
    const max = this.maxValue();

    // Helpers pour normaliser la marque dans un produit
    const getBrandId = (p: any): string | null => {
      // p.brand peut être: string id | { _id } | { id } | autre
      if (!p?.brand) return null;
      if (typeof p.brand === 'string') return p.brand;         // id
      if (typeof p.brand === 'object') {
        return p.brand._id || p.brand.id || null;              // objet
      }
      return null;
    };
    const getBrandName = (p: any): string => {
      // p.brand peut être: string name | { name } | { label } | autre
      if (!p?.brand) return '';
      if (typeof p.brand === 'string') return p.brand;         // parfois c'est le nom
      if (typeof p.brand === 'object') {
        return (p.brand.name || p.brand.label || '').toString();
      }
      return '';
    };

    // 1) Filtre par brandId (logo cliqué)
    if (brandId) {
      arr = arr.filter(p => getBrandId(p) === brandId);
    }

    // 2) Filtre texte "brand" (si champ affiché/valeur saisie)
    if (brand && brand.trim()) {
      const q = brand.trim().toLowerCase();
      arr = arr.filter(p => getBrandName(p).toLowerCase().includes(q));
    }

    // 3) Plage de prix
    arr = arr.filter(p => (p.price ?? 0) >= min && (p.price ?? 0) <= max);

    // 4) Featured
    if (this.featuredOnly()) {
      arr = arr.filter(p => (p as any).isFeatured === true);
    }

    // 5) Tri
    switch (this.sortBy()) {
      case 'priceAsc':  arr.sort((a,b)=> (a.price??0) - (b.price??0)); break;
      case 'priceDesc': arr.sort((a,b)=> (b.price??0) - (a.price??0)); break;
      case 'newest':    /* si createdAt dispo, tri ici */ break;
    }

    this.products.set(arr);
  }

}
