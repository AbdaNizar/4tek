// src/app/pages/admin/admin-category-detail/admin-category-detail.component.ts
import {Component, OnInit, inject, signal, computed} from '@angular/core';
import {CommonModule, NgIf, NgFor} from '@angular/common';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {CategoryService} from '../../../services/category/category.service';
import {Category} from '../../../interfaces/category';
import {getUrl} from '../../../shared/constant/function';

@Component({
  standalone: true,
  selector: 'app-admin-category-detail',
  imports: [CommonModule, NgIf, NgFor],
  templateUrl: './admin-category-detail.component.html',
  styleUrls: ['./admin-category-detail.component.css']
})
export class AdminCategoryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(CategoryService);

  loading = signal(true);
  cat = signal<Category | null>(null);

  // images calculées
  cover = computed(() => {
    const c = this.cat();
    if (!c) return null;
    return c.imageUrl || c.banners?.[0] || c.bannerUrl || c.iconUrl || '/assets/placeholder.jpg';
  });

  allBanners = computed(() => {
    const c = this.cat();
    if (!c) return [];
    const merged = [
      ...(c.banners || []),
      ...(c.bannerUrl ? [c.bannerUrl] : [])
    ];
    // déduplique
    return Array.from(new Set(merged.filter(Boolean)));
  });
  descExpanded = false;
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.fetch(id);
  }

  async fetch(id: string) {
    this.loading.set(true);
    try {
      const data = await this.api.getOne(id).toPromise();
      this.cat.set(data || null);
    } finally {
      this.loading.set(false);
    }
  }

  back() {
    this.router.navigate(['/admin/categories']);
  }

// admin-category-detail.component.ts

  toggleDesc(){ this.descExpanded = !this.descExpanded; }


  protected readonly getUrl = getUrl;
}
