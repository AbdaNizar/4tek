import {Component, HostListener, inject, OnInit, signal} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {getUrl} from '../../../../shared/constant/function';
import {NgForOf, NgIf} from '@angular/common';
import {CategoryService} from '../../../../services/category/category.service';
import {SubcategoryService} from '../../../../services/subcategory/subcategory.service';
import {ProductService} from '../../../../services/product/product.service';
import {SubCategory} from '../../../../interfaces/SubCategory';
import {ParentCategoryRef} from '../../../../interfaces/ParentCategoryRef';
import {Product} from '../../../../interfaces/product';
import {Category} from '../../../../interfaces/category';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify-email';
type ID = string;





@Component({
  standalone: true,
  selector: 'app-header-nav-desktop',
  imports: [RouterLink, NgForOf, NgIf],
  templateUrl: './header-nav-desktop.component.html',
  styleUrls: ['./header-nav-desktop.component.css']
})
export class HeaderNavDesktopComponent implements OnInit {
  private catsApi = inject(CategoryService);
  private subsApi = inject(SubcategoryService);
  private prodApi = inject(ProductService);
  private router: Router
  loading = signal(true);
  open = signal(false);
  categories = signal<Category[]>([]);


  // hover state
  activeCatId = signal<ID | null>(null);
  activeSubId = signal<ID | null>(null);

  // caches
  subCache = new Map<ID, SubCategory[]>();
  prodCache = new Map<ID, Product[]>([]); // key = subId

  async ngOnInit() {
    try {
      this.loading.set(true);
      const data = await this.catsApi.list().toPromise();
      this.categories.set((data || []).filter(c => c.isActive));
    } finally {
      this.loading.set(false);
    }
  }


  getSubName(subId: string): string {
    const sub = this.subsOf(this.activeCatId()!).find(s => s._id === subId);
    return sub?.name || '';
  }

  getOtherSubs(catId: string, currentSubId: string): any[] {
    return this.subsOf(catId).filter(s => s._id !== currentSubId);
  }

  clearActive() {
    this.activeCatId.set(null);
    this.activeSubId.set(null);
  }


  async onEnterCat(cat: Category) {
    this.activeSubId.set(null);       // reset
    this.activeCatId.set(cat._id);

    if (!this.subCache.has(cat._id)) {
      try {
        const subs = await this.subsApi.listByCategory(cat._id).toPromise();
        this.subCache.set(cat._id, subs || []);
        console.log('subs',subs)

      } catch {
        this.subCache.set(cat._id, []);
      }
    }

    // S’il n’y a AUCUNE sous-catégorie, on ferme le panneau
    if (!this.subsOf(cat._id).length) {
      this.activeCatId.set(null);
    }
  }

  async onEnterSub(sub: SubCategory) {
    this.activeSubId.set(sub._id);

    if (!this.prodCache.has(sub._id)) {
      try {
        const prods = await this.prodApi.listBySubcategory(sub._id).toPromise();
        this.prodCache.set(sub._id, prods?.items || []);

      } catch {
        this.prodCache.set(sub._id, []);
      }
    }
  }

  subsOf(catId: ID) {
    return this.subCache.get(catId) || [];
  }

  prodsOf(subCategory: ID) {
    return this.prodCache.get(subCategory) || [];
  }

  // mobile toggle
  toggle() {
    this.open.update(v => !v);
  }

  close() {
    this.open.set(false);
    this.activeCatId.set(null);
    this.activeSubId.set(null);
  }

  protected readonly getUrl = getUrl;


  // inside the nav desktop component
  @HostListener('window:scroll')
  onWinScroll() {
    this.activeCatId.set(null);
    this.activeSubId.set(null);
  }
  hoverOutTimer: any = null;

  onPanelEnter() {
    if (this.hoverOutTimer) {
      clearTimeout(this.hoverOutTimer);
      this.hoverOutTimer = null;
    }
  }

  onPanelLeave() {
    // laisse 120 ms pour que le click parte avant de fermer le panel
    this.hoverOutTimer = setTimeout(() => {
      this.activeCatId.set(null);
      this.activeSubId.set(null);
    }, 120);
  }

  goTo(ev: MouseEvent, commands: any[]) {

    console.log('hereeeee' ,commands)
    ev.preventDefault();
    ev.stopPropagation();
    this.router.navigate(commands);
  }

}
