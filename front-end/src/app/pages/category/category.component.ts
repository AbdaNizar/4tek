import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf, SlicePipe } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../services/category/category.service';
import { Category } from '../../interfaces/category';
import { SubCategory} from '../../interfaces/SubCategory';
import { SubcategoryService } from '../../services/subcategory/subcategory.service';
import { getUrl } from '../../shared/constant/function';

@Component({
  standalone: true,
  selector: 'app-category',
  imports: [NgFor, RouterLink, SlicePipe, NgIf],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit {
  private api = inject(CategoryService);
  private subsApi = inject(SubcategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);

  // route param
  selectedCatId = signal<string | null>(null);

  // data
  raw = signal<Category[]>([]);
  cat = signal<Category | null>(null);
  subs = signal<SubCategory[]>([]);

  // only active categories
  list = computed(() => this.raw().filter(c => c.isActive));
  expandedCategories = signal<Set<string>>(new Set());


  async ngOnInit() {
    // listen route changes
    this.route.paramMap.subscribe(async pm => {
      const id = pm.get('id');
      this.selectedCatId.set(id);
      if (id) {
        await this.fetchOneAndSubs(id);
      } else {
        await this.fetchCategories();
      }
    });
  }

  private async fetchCategories() {
    this.loading.set(true);
    try {
      const data = await this.api.list().toPromise();
      this.raw.set(data || []);
      this.cat.set(null);
      this.subs.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchOneAndSubs(id: string) {
    this.loading.set(true);
    try {
      const [c, s] = await Promise.all([
        this.api.getOne(id).toPromise(),
        this.subsApi.listByCategory(id).toPromise()
      ]);
      this.cat.set(c || null);
      this.subs.set((s || []).filter(x => x.isActive));
    } finally {
      this.loading.set(false);
    }
  }

  // Méthode pour vérifier si une catégorie est expandée
  isCategoryExpanded(categoryId: string): boolean {
    return this.expandedCategories().has(categoryId);
  }

  // Méthode pour basculer l'état d'expansion
  toggleCategory(categoryId: string): void {
    const current = new Set(this.expandedCategories());
    if (current.has(categoryId)) {
      current.delete(categoryId);
    } else {
      current.add(categoryId);
    }
    this.expandedCategories.set(current);
  }

  // Méthode pour obtenir le texte du bouton
  getToggleText(categoryId: string): string {
    return this.isCategoryExpanded(categoryId) ? 'Réduire ↑' : 'Afficher la suite ↓';
  }

  protected readonly getUrl = getUrl;
}
