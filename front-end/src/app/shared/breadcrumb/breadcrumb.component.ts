import { Component, inject, OnDestroy, signal } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { CategoryService } from '../../services/category/category.service';
import { SubcategoryService } from '../../services/subcategory/subcategory.service';
import { ProductService } from '../../services/product/product.service';

type Crumb = { label: string; url?: string; isLast?: boolean };

@Component({
  standalone: true,
  selector: 'app-breadcrumb',
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.css']
})
export class BreadcrumbComponent implements OnDestroy {
  private router = inject(Router);
  private root   = inject(ActivatedRoute);
  private cats   = inject(CategoryService, { optional: true });
  private subs   = inject(SubcategoryService, { optional: true });
  private prods  = inject(ProductService,  { optional: true });

  crumbs = signal<Crumb[]>([]);
  private sub?: Subscription;

  private catNameCache = new Map<string, string>();
  private subNameCache = new Map<string, string>();

  constructor() {
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { void this.build(); });
    void this.build();
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  // ---------- helpers ----------
  private deepest(route: ActivatedRoute) {
    let r = route;
    while (r.firstChild) r = r.firstChild;
    return r.snapshot;
  }
  private pretty(s: string) {
    return (s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  }
  private asId(v: any): string | undefined {
    return typeof v === 'string' ? v : v?._id;
  }

  // ---------- API helpers ----------
  private async getCategoryName(id?: string): Promise<string> {
    if (!id) return 'Catégorie';
    if (this.catNameCache.has(id)) return this.catNameCache.get(id)!;

    let name: string | undefined;
    try {
      name = await (async () =>
        (await (this.cats as any)?.getOne?.(id)?.toPromise?.())?.name)();
      if (!name) {
        const rows = await this.cats?.list?.().toPromise?.();
        name = rows?.find((c: any) => this.asId(c?._id) === id)?.name;
      }
    } catch {}
    name ||= 'Catégorie';
    this.catNameCache.set(id, name);
    return name;
  }

  /** Returns sub name + parent category id (from `parent`) */
  private async getSubName(id?: string): Promise<{ name: string; catId?: string }> {
    if (!id) return { name: 'Sous-catégorie' };
    if (this.subNameCache.has(id)) {
      return { name: this.subNameCache.get(id)!, catId: undefined };
    }

    let row: any;
    try { row = await (this.subs as any)?.getOne?.(id)?.toPromise?.(); } catch {}

    const name = row?.name || 'Sous-catégorie';
    const parent = row?.parent; // your API returns { parent: { _id, name } } or id
    const catId = this.asId(parent);

    this.subNameCache.set(id, name);

    if (parent && typeof parent === 'object' && parent.name) {
      const cid = this.asId(parent)!;
      if (!this.catNameCache.has(cid)) this.catNameCache.set(cid, parent.name);
    }
    return { name, catId };
  }

  private async tryGetSubCatParent(subId: string): Promise<string | undefined> {
    try {
      const row =
        await (this.subs as any)?.getOne?.(subId)?.toPromise?.() ??
        await (this.subs as any)?.get?.(subId)?.toPromise?.();
      return this.asId(row?.parent);
    } catch { return undefined; }
  }

  /** Get product meta by slug (raw), including category/subcategory ids */
  private async getProductMeta(slug?: string): Promise<{ name: string; catId?: string; subId?: string }> {
    if (!slug) return { name: 'Produit' };

    let row: any;
    try { row = await (this.prods as any)?.getBySlug?.(slug)?.toPromise?.(); } catch {}
    const name = row?.name || 'Produit';

    // tolerate different shapes: category / cat ; subCategory / subcategory / sub
    let subId = this.asId(row?.subCategory) || this.asId(row?.subcategory) || this.asId(row?.sub);
    let catId = this.asId(row?.category)    || this.asId(row?.cat);

    // if only subId exists, ask sub to learn its parent category
    if (!catId && subId) {
      const { catId: fromSub } = await this.getSubName(subId);
      if (fromSub) catId = fromSub;
    }
    return { name, catId, subId };
  }

  // ---------- BUILD ----------
  private async build(): Promise<void> {
    const url = this.router.url.split('?')[0];
    if (url === '/') { this.crumbs.set([]); return; } // hide on home

    const snap = this.deepest(this.root);
    const d = snap?.data || {};
    const p = snap?.params || {};
    const items: Crumb[] = [{ label: 'Accueil', url: '/' }];

    // PRODUCT: /product/:slug  → Accueil / Cat / Sub / Product
    if (url.startsWith('/product/')) {
      const rawSlug = p['slug'];                          // IMPORTANT: raw slug, not prettified
      const prodRow = d['product'];                       // if a resolver provided it, use it
      const meta = prodRow
        ? {
          name: prodRow?.name || 'Produit',
          catId: this.asId(prodRow?.category),
          subId: this.asId(prodRow?.subCategory)
        }
        : await this.getProductMeta(rawSlug);

      // Resolve names/urls in order
      if (meta.catId) items.push({ label: await this.getCategoryName(meta.catId), url: `/categories/${meta.catId}` });

      if (meta.subId) {
        const subInfo = await this.getSubName(meta.subId);
        items.push({ label: subInfo.name, url: `/categories/sub-categories/${meta.subId}` });
        // If catId was missing but sub had a parent, also show cat before sub:
        if (!meta.catId && subInfo.catId) {
          items.splice(1, 0, { label: await this.getCategoryName(subInfo.catId), url: `/categories/${subInfo.catId}` });
        }
      }

      items.push({ label: meta.name, isLast: true });
      this.crumbs.set(items);
      return;
    }

    // SUBCATEGORY: /categories/sub-categories/:id → Accueil / Cat / Sub
    if (url.startsWith('/categories/sub-categories/')) {
      const subId = p['id'];
      const { name: subName, catId: viaRowCatId } = await this.getSubName(subId);

      let catId =
        this.asId(d['category']) ||
        viaRowCatId ||
        this.asId(d['subCategory']?.parent) ||
        await this.tryGetSubCatParent(subId);

      if (catId) items.push({ label: await this.getCategoryName(catId), url: `/categories/${catId}` });
      items.push({ label: subName, isLast: true });
      this.crumbs.set(items);
      return;
    }

    // CATEGORY: /categories/:id → Accueil / Cat
    if (url.startsWith('/categories/')) {
      const catId = p['id'];
      items.push({ label: await this.getCategoryName(catId), isLast: true });
      this.crumbs.set(items);
      return;
    }

    // OTHER PAGES: Accueil / <Page title or first segment>
    const title = d['breadcrumb'] || d['title'] || this.pretty(url.split('/')[1] || '');
    if (title) {
      items.push({ label: title, isLast: true });
      this.crumbs.set(items);
    } else {
      this.crumbs.set([]);
    }
  }
}
