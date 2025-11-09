import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

import { CategoryService } from '../../../../services/category/category.service';
import { SubcategoryService } from '../../../../services/subcategory/subcategory.service';
import { Category } from '../../../../interfaces/category';
import { SubCategory } from '../../../../interfaces/SubCategory';
import { getUrl } from '../../../../shared/constant/function';

type ID = string;

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

  private catsApi = inject(CategoryService);
  private subsApi = inject(SubcategoryService);
  private router = inject(Router);

  categories = signal<Category[]>([]);
  openCatId: ID | null = null;

  // cache sous-catégories par catégorie
  private subsCache = new Map<ID, SubCategory[]>();

  protected readonly getUrl = getUrl;

  async ngOnInit() {
    try {
      const rows = await this.catsApi.list().toPromise();
      this.categories.set((rows || []).filter(c => c.isActive));
    } catch { /* noop */ }
  }

  async toggleCategory(catId: ID) {
    const opening = this.openCatId !== catId;
    this.openCatId = opening ? catId : null;

    if (opening && !this.subsCache.has(catId)) {
      try {
        const subs = await this.subsApi.listByCategory(catId).toPromise();
        this.subsCache.set(catId, (subs || []).filter(s => s.isActive));
        // Optional: close if there are actually no subs
        if (this.openCatId === catId && (this.subsCache.get(catId) || []).length === 0) {
          this.openCatId = null;
        }
      } catch {
        this.subsCache.set(catId, []);
        if (this.openCatId === catId) this.openCatId = null;
      }
    }
  }


  // header-nav-mobile.component.ts
  hasSubs(catId: ID | null): boolean {
    if (!catId) return false;
    if (!this.subsCache.has(catId)) return true;
    return (this.subsCache.get(catId) || []).length > 0;
  }

  subsOf(catId: ID): SubCategory[] {
    return this.subsCache.get(catId) || [];
  }

  // icônes (comme desktop)
  catIcon(c: any): string {
    return getUrl(c?.iconUrl || c?.imageUrl || (c?.banners?.[0] ?? '')) || '/assets/placeholder.jpg';
  }
  subIcon(s: any): string {
    return getUrl(s?.iconUrl || s?.imageUrl || s?.banner || s?.icon || '') || '/assets/placeholder.jpg';
  }
}
