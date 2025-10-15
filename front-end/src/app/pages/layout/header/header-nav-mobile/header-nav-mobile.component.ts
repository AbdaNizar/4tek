import {Component, Input, Output, EventEmitter, signal, inject, OnInit} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {RouterLink} from '@angular/router';
import {CategoryService} from '../../../../services/category/category.service';
import {getUrl} from '../../../../shared/constant/function';
import {Category} from '../../../../interfaces/category';
import {ProductService} from '../../../../services/product/product.service';
import {SubcategoryService} from '../../../../services/subcategory/subcategory.service';
import {Product} from '../../../../interfaces/product';
import {SubCategory} from '../../../../interfaces/SubCategory';

@Component({
  selector: 'app-header-nav-mobile',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  templateUrl: './header-nav-mobile.component.html',
  styleUrls: ['./header-nav-mobile.component.css']
})
export class HeaderNavMobileComponent implements OnInit {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  openCatId: string | null = null;
  openSubId: string | null = null;

  private api = inject(CategoryService);
  categories = signal<Category[]>([]);
  private subsApi = inject(SubcategoryService);
  private prodsApi = inject(ProductService);
  subsCache = new Map<string, SubCategory[]>(); // key: categoryId
  prodsCache = new Map<string, Product[]>();
  protected readonly getUrl = getUrl;

  async ngOnInit() {
    try {
      const data = await this.api.list().toPromise();
      this.categories.set((data || []).filter(c => c.isActive));
    } catch (e) {

    }
  }


  async toggleCategory(catId: string) {
    // fermer si on reclique la même
    if (this.openCatId === catId) {
      this.openCatId = null;
      this.openSubId = null;
      return;
    }
    this.openCatId = catId;
    this.openSubId = null;

    // charge les sous-catégories si pas en cache
    if (!this.subsCache.has(catId)) {
      try {
        const subs = await this.subsApi.listByCategory(catId).toPromise();
        this.subsCache.set(catId, subs || []);
      } catch {
        this.subsCache.set(catId, []);
      }
    }
  }

  async toggleSub(subId: string) {
    // fermer si on reclique la même
    if (this.openSubId === subId) {
      this.openSubId = null;
      return;
    }

    this.openSubId = subId;

    // charge produits si pas en cache
    if (!this.prodsCache.has(subId)) {
      try {
        const prods = await this.prodsApi.listBySubcategory(subId).toPromise();
        this.prodsCache.set(subId, prods?.items || []);
      } catch {
        this.prodsCache.set(subId, []);
      }
    }
  }


}
