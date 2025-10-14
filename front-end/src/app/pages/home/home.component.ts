// src/app/pages/home/home.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';
import { BannerComponent } from './banner/banner.component';
import { HomeAdvantagesComponent } from './home-advantages/home-advantages.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { SectionSeparatorComponent } from './section-separator/section-separator.component';

import { CategoryService } from '../../services/category/category.service';
import { Category } from '../../interfaces/category';
import { Slide } from '../../models/slide';
import { getUrl } from '../../shared/constant/function';
import {HeaderNavDesktopComponent} from '../layout/header/header-nav-desktop/header-nav-desktop.component';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [
    BannerComponent,
    HomeAdvantagesComponent, ContactUsComponent, SectionSeparatorComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private api = inject(CategoryService);

  categories = signal<Category[]>([]);
  slides = signal<Slide[]>([]);

  async ngOnInit() {
    const cats = await this.api.list().toPromise().then(r => r || []);
    // keep only active categories that have visual media
    const active = cats.filter(c => c.isActive && (c.banners?.length || c.imageUrl || c.iconUrl));

    this.categories.set(active);
    this.slides.set(this.buildSlidesFromCategories(active));
  }

  /** Turn categories into slides:
   *  - prefer banners (one slide per banner)
   *  - else use imageUrl
   *  - fallback iconUrl (not ideal for a big hero but works)
   */
  private buildSlidesFromCategories(cats: Category[]): Slide[] {
    const aligns: Slide['align'][] = ['left', 'center', 'right'];
    const slides: Slide[] = [];

    cats.forEach((c, i) => {
      const link = ['/categories', c._id];      // or ['/categories', c.slug] if you route by slug
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
      } else if (c.imageUrl) {
        slides.push({
          id: `${c._id}-img`,
          imageUrl: getUrl(c.imageUrl),
          title,
          subtitle,
          ctaLabel: 'Voir la catégorie',
          ctaLink: link,
          align: aligns[i % aligns.length]
        });
      } else if (c.iconUrl) {
        slides.push({
          id: `${c._id}-icon`,
          imageUrl: getUrl(c.iconUrl),
          title,
          subtitle,
          ctaLabel: 'Voir la catégorie',
          ctaLink: link,
          align: aligns[i % aligns.length]
        });
      }
    });

    // Optional: de-dup by id or limit count if you want
    return slides;
  }
}
