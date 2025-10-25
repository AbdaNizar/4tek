// src/app/pages/home/home.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { BannerComponent } from './banner/banner.component';
import { HomeAdvantagesComponent } from './home-advantages/home-advantages.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { SectionSeparatorComponent } from './section-separator/section-separator.component';
import { CategoryService } from '../../services/category/category.service';
import { ProductService } from '../../services/product/product.service';
import { Category } from '../../interfaces/category';
import { Product } from '../../interfaces/product';
import { Slide } from '../../models/slide';
import { getUrl } from '../../shared/constant/function';
import { ProductCardComponent } from '../product-list/product-card/product-card.component';
import { NgForOf } from '@angular/common';
import { ProductCarouselComponent } from '../../shared/product-carousel/product-carousel.component';
import { PopularCatsCarouselComponent } from '../../shared/popular-cats-carousel/popular-cats-carousel.component';

type PopularCat = { slug: string; name: string; imageUrl: string };

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
    PopularCatsCarouselComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private apiCat = inject(CategoryService);
  private apiPro = inject(ProductService);

  categories   = signal<Category[]>([]);
  slides       = signal<Slide[]>([]);
  popularCats  = signal<PopularCat[]>([]);
  products     = signal<Product[]>([]);
  bestDeals    = signal<Product[]>([]);

  async ngOnInit() {
    // === Categories ===
    const cats: Category[] = await this.apiCat.list().toPromise().then(r => r || []);
    const active = cats.filter(c => c.isActive && (c.banners?.length || c.imageUrl || c.iconUrl));
    this.categories.set(active);
    this.slides.set(this.buildSlidesFromCategories(active));
    this.popularCats.set(this.buildPopularCats(cats, 12));
    console.log('popularCats',this.popularCats)
    // === Products ===
    const all = await this.apiPro.list().toPromise().then((r: any) => r || { items: [], total: 0 });
    const items: Product[] = Array.isArray(all?.items) ? all.items : [];
    this.products.set(items.slice(0, 12));
    this.bestDeals.set(this.getBestDeals(items, 8));
  }

  /** Slides from categories */
  private buildSlidesFromCategories(cats: Category[]): Slide[] {
    const aligns: Slide['align'][] = ['left', 'center', 'right'];
    const slides: Slide[] = [];

    cats.forEach((c, i) => {
      const link = ['/categories', c._id];
      const title = c.name;
      const subtitle = c.description || '';

      if (Array.isArray(c.banners) && c.banners.length) {
        c.banners.forEach((bUrl, j) => {
          slides.push({
            id: `${c._id}-b${j}`,
            imageUrl: getUrl(bUrl),
            title,
            subtitle,
            ctaLabel: 'Voir la catégorie',
            ctaLink: link,
            align: aligns[(i + j) % aligns.length]
          });
        });
      } else {
        slides.push({
          id: `${c._id}-cover`,
          imageUrl: this.coverOf(c),
          title,
          subtitle,
          ctaLabel: 'Voir la catégorie',
          ctaLink: link,
          align: aligns[i % aligns.length]
        });
      }
    });

    return slides;
  }

  /** Best deals by discount percentage (oldPrice > price) */
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

  /** Popular categories for the carousel */
  private buildPopularCats(cats: Category[], limit = 12): PopularCat[] {
    let list = cats.filter(c => c.isActive && (c.imageUrl || c.banners?.length || c.iconUrl));

    // Sort by optional fields (popularity/productsCount) or name
    list = [...list].sort((a: any, b: any) => {
      if (typeof a.popularity === 'number' && typeof b.popularity === 'number') {
        return b.popularity - a.popularity;
      }
      if (typeof a.productsCount === 'number' && typeof b.productsCount === 'number') {
        return b.productsCount - a.productsCount;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return list.slice(0, limit).map(c => ({
      slug: c.slug ,
      _id: c._id,
      name: c.name,
      imageUrl: this.coverOf(c)
    }));
  }

  /** Best available cover image for a category */
  private coverOf(c: Category): string {
    if (c.imageUrl) return getUrl(c.imageUrl);
    if (Array.isArray(c.banners) && c.banners[0]) return getUrl(c.banners[0]);
    if (c.iconUrl) return getUrl(c.iconUrl);
    return '/assets/placeholder.jpg';
  }
}
