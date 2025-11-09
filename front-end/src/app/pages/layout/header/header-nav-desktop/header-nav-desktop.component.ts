import {Component, OnInit, inject, signal, HostListener} from '@angular/core';
import { Router } from '@angular/router';
import { NgIf, NgForOf } from '@angular/common';

import { CategoryService } from '../../../../services/category/category.service';
import { SubcategoryService } from '../../../../services/subcategory/subcategory.service';
import { Category } from '../../../../interfaces/category';
import { SubCategory } from '../../../../interfaces/SubCategory';
import {getUrl} from '../../../../shared/constant/function';

type ID = string;

@Component({
  standalone: true,
  selector: 'app-header-nav-desktop',
  imports: [NgIf, NgForOf],
  templateUrl: './header-nav-desktop.component.html',
  styleUrls: ['./header-nav-desktop.component.css'],
})
export class HeaderNavDesktopComponent implements OnInit {
  private catsApi = inject(CategoryService);
  private subsApi = inject(SubcategoryService);
  private router = inject(Router);

  loading = signal(true);
  open    = signal(false);

  categories = signal<Category[]>([]);
  activeCatId = signal<ID | null>(null);

  // cache sous-catégories par catégorie
  private subCache = new Map<ID, SubCategory[]>();

  private closeTimer: any = null;

  async ngOnInit() {
    try {
      this.loading.set(true);
      const rows = await this.catsApi.list().toPromise();
      this.categories.set((rows || []).filter(c => c.isActive));
    } finally {
      this.loading.set(false);
    }
  }

  // UI
  toggle() { this.open.update(v => !v); }
  openPanel() {
    this.cancelClose();
    this.open.set(true);
  }
  closePanel() {
    this.open.set(false);
    this.activeCatId.set(null);
  }

  hasSubs(catId: ID | null): boolean {
    if (!catId) return false;
    return (this.subCache.get(catId) || []).length > 0;
  }


  // Catégories / sous-catégories
  async onEnterCat(c: Category) {
    this.activeCatId.set(c._id);
    if (!this.subCache.has(c._id)) {
      try {
        const subs = await this.subsApi.listByCategory(c._id).toPromise();
        this.subCache.set(c._id, (subs || []).filter(s => s.isActive));
      } catch {
        this.subCache.set(c._id, []);
      }
    }
  }
  closeAfter(ms = 160) {
    this.cancelClose();
    this.closeTimer = setTimeout(() => {
      this.open.set(false);
      this.activeCatId.set(null);
    }, ms);
  }
  cancelClose() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
  subsOf(catId: ID) {
    return this.subCache.get(catId) || [];
  }

  catName(catId: ID) {
    return this.categories().find(c => c._id === catId)?.name || '';
  }

  // Navigation
  goCat(c: Category) {
    this.closePanel();
    this.router.navigate(['/categories', c._id]);
  }

  goSub(ev: MouseEvent, s: SubCategory) {
    ev.preventDefault();
    this.closePanel();
    this.router.navigate(['/categories/sub-categories', s._id]);
  }
  catIcon(c: any): string {
    return getUrl(
      c?.iconUrl || c?.imageUrl || (c?.banners?.[0] ?? '')
    ) || '/assets/placeholder.jpg';
  }

  subIcon(s: any): string {
    return getUrl(
      s?.iconUrl || s?.imageUrl || s?.banner || s?.icon || ''
    ) || '/assets/placeholder.jpg';
  }

  // Optional: ESC to close
  @HostListener('document:keydown.escape')
  onEsc(){ this.open.set(false); this.activeCatId.set(null); }
}
