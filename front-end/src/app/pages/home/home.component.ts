// src/app/pages/home/home.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { BannerComponent } from './banner/banner.component';
import { HomeAdvantagesComponent } from './home-advantages/home-advantages.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { SectionSeparatorComponent } from './section-separator/section-separator.component';
import { CategoryService } from '../../services/category/category.service';
import { SubcategoryService } from '../../services/subcategory/subcategory.service'; // ← NEW
import { ProductService } from '../../services/product/product.service';
import { Category } from '../../interfaces/category';
import { SubCategory } from '../../interfaces/SubCategory'; // ← NEW
import { Product } from '../../interfaces/product';
import { Slide } from '../../models/slide';
import { getUrl } from '../../shared/constant/function';
import { ProductCardComponent } from '../product-list/product-card/product-card.component';
import { NgForOf, NgIf } from '@angular/common';
import { ProductCarouselComponent } from '../../shared/product-carousel/product-carousel.component';
import { PopularCatsCarouselComponent } from '../../shared/popular-cats-carousel/popular-cats-carousel.component';
import { BrandService } from '../../services/brand/brand.service';
import { Brand } from '../../interfaces/brand';
import { BrandStripComponent } from './brand-strip/brand-strip.component';
import { NewsletterComponent } from './newsletter/newsletter.component';

type PopularCat = { slug: string; _id: string; name: string; imageUrl: string };

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [
    BannerComponent,
    HomeAdvantagesComponent,
    ContactUsComponent,
    SectionSeparatorComponent,
    ProductCardComponent,
    NgForOf,
    ProductCarouselComponent,
    PopularCatsCarouselComponent,
    BrandStripComponent,
    NgIf,
    NewsletterComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private apiCat   = inject(CategoryService);
  private apiSub   = inject(SubcategoryService); // ← NEW
  private apiPro   = inject(ProductService);
  private brandApi = inject(BrandService);

  categories   = signal<Category[]>([]);
  slides       = signal<Slide[]>([]);
  popularCats  = signal<PopularCat[]>([]);
  products     = signal<Product[]>([]);
  bestDeals    = signal<Product[]>([]);
  newArrivals  = signal<Product[]>([]);
  brands       = signal<Brand[]>([]);

  async ngOnInit() {
    // === Categories actives (avec visuels) ===
    const cats: Category[] = await this.apiCat.list().toPromise().then(r => r || []);
    const activeCats = cats.filter(c => c.isActive);
    this.categories.set(activeCats);

    // === Banners depuis les SOUS-CATÉGORIES des catégories actives ===
    const subsArrays = await Promise.all(
      activeCats.map(c => this.apiSub.listByCategory(c._id).toPromise().catch(() => [] as SubCategory[]))
    );
    const allSubs: SubCategory[] = subsArrays.flat().filter(s => s?.isActive);
    this.slides.set(this.buildSlidesFromSubcategories(allSubs)); // ← switch vers subs

    // === Populaires (on peut rester sur les catégories) ===
    this.popularCats.set(this.buildPopularCats(activeCats, 12));

    // === Produits ===
    const all = await this.apiPro.list().toPromise().then((r: any) => r || { items: [], total: 0 });
    const items: Product[] = Array.isArray(all?.items) ? all.items : [];
    this.products.set(items.slice(0, 12));
    this.bestDeals.set(this.getBestDeals(items, 8));
    this.newArrivals.set(this.getNewDeals(items, 8));

    // === Marques ===
    this.brandApi.list(true).subscribe(list => this.brands.set(list || []));
  }

  /** Slides depuis sous-catégories (banners > imageUrl > iconUrl) */
  private buildSlidesFromSubcategories(subs: SubCategory[]): Slide[] {
    const aligns: Slide['align'][] = ['left', 'center', 'right'];
    const slides: Slide[] = [];

    subs.forEach((s, i) => {
      const title    = s.name;
      const subtitle = s.description || '';
      const link     = ['/categories/sub-categories', s._id]; // route subcategory page

      // On priorise les bannières si présentes
      if (Array.isArray(s.banners) && s.banners.length) {
        s.banners.forEach((bUrl, j) => {
          slides.push({
            id: `${s._id}-b${j}`,
            imageUrl: getUrl(bUrl),
            title,
            subtitle,
            ctaLabel: 'Voir la sous-catégorie',
            ctaLink: link,
            align: aligns[(i + j) % aligns.length]
          });
        });
      } else {
        slides.push({
          id: `${s._id}-cover`,
          imageUrl: this.coverOfSub(s),
          title,
          subtitle,
          ctaLabel: 'Voir la sous-catégorie',
          ctaLink: link,
          align: aligns[i % aligns.length]
        });
      }
    });

    return slides;
  }

  /** Image “cover” d’une sous-catégorie */
  private coverOfSub(s: SubCategory): string {
    if (s.imageUrl)  return getUrl(s.imageUrl);
    if (s.iconUrl)   return getUrl(s.iconUrl);
    if (Array.isArray(s.banners) && s.banners[0]) return getUrl(s.banners[0]);
    return '/assets/placeholder.jpg';
  }

  /** Best deals par % de remise */
  private getBestDeals(list: Product[], limit = 8): Product[] {
    return list
      .filter(p => typeof p.price === 'number' && typeof p.oldPrice === 'number' && (p.oldPrice! > p.price!))
      .map(p => ({
        ...p,
        _discountPct: Math.round(((p.oldPrice! - p.price!) / p.oldPrice!) * 100)
      }))
      .sort((a, b) => (b._discountPct as number) - (a._discountPct as number))
      .slice(0, limit);
  }

  /** Nouveautés (flag isNew) */
  private getNewDeals(list: Product[], limit = 8): Product[] {
    return list.filter(p => p.isNew).slice(0, limit);
  }

  /** Catégories populaires pour le carrousel existant */
  private buildPopularCats(cats: Category[], limit = 12): PopularCat[] {
    let list = cats.filter(c => c.isActive && (c.imageUrl || c.banners?.length || c.iconUrl));

    list = [...list].sort((a: any, b: any) => {
      if (typeof a.popularity === 'number' && typeof b.popularity === 'number') return b.popularity - a.popularity;
      if (typeof a.productsCount === 'number' && typeof b.productsCount === 'number') return b.productsCount - a.productsCount;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return list.slice(0, limit).map(c => ({
      slug: c.slug,
      _id: c._id,
      name: c.name,
      imageUrl: this.coverOfCat(c),
    }));
  }

  /** Fallback cover pour catégorie (toujours utilisé côté “popular cats”) */
  private coverOfCat(c: Category): string {
    if (c.imageUrl) return getUrl(c.imageUrl);
    if (Array.isArray(c.banners) && c.banners[0]) return getUrl(c.banners[0]);
    if (c.iconUrl) return getUrl(c.iconUrl);
    return '/assets/placeholder.jpg';
  }
}
