// src/app/pages/search-results/search-results.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductGridComponent} from '../product-list/product-grid/product-grid.component';
import { Product } from '../../interfaces/product';
import { SearchService } from '../../services/search/search.service';

@Component({
  standalone: true,
  selector: 'app-search-results',
  imports: [CommonModule, RouterLink, ProductGridComponent],
  template: `
  <section class="srch container">
    <header class="head">
      <h1>Résultats pour “{{ q() }}”</h1>
      <div class="meta" *ngIf="!loading()">
        <span *ngIf="total() > 0">{{ total() }} produit(s) trouvé(s)</span>
        <span *ngIf="total() === 0">Aucun résultat</span>
      </div>
    </header>

    <div class="loading" *ngIf="loading()">Recherche…</div>
    <div class="error" *ngIf="!loading() && error()">{{ error() }}</div>

    <app-product-grid *ngIf="!loading() && !error() && items().length"
      [products]="items()"
      [view]="'grid'">
    </app-product-grid>

    <div class="empty" *ngIf="!loading() && !error() && !items().length">
      Aucun produit ne correspond à votre recherche.
    </div>
  </section>
  `,
  styles: [`
    .container{margin: 0 auto;
      padding: 30px;
      border-radius: 29px;}
    .head{display:flex; align-items:end; justify-content:space-between; gap:12px; margin-bottom:12px;}
    h1{margin:0; font-size: clamp(20px, 3.5vw, 28px);}
    .meta{color: var(--muted);}
    .loading,.error,.empty{padding:16px; border-radius:12px; background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08)}
    .error{border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.08)}
  `]
})
export class SearchResultsComponent {
  private route = inject(ActivatedRoute);
  private searchApi = inject(SearchService);

  q       = signal<string>('');
  items   = signal<Product[]>([]);
  total   = signal(0);
  loading = signal(true);
  error   = signal<string | null>(null);

  constructor(){
    this.route.queryParamMap.subscribe(params => {
      const query = (params.get('q') || '').trim();
      this.q.set(query);
      if (!query) {
        this.items.set([]); this.total.set(0);
        this.loading.set(false); this.error.set(null);
        return;
      }
      this.fetch(query);
    });
  }

  private fetch(query: string){
    this.loading.set(true);
    this.error.set(null);
    this.searchApi.search(query, 1, 48).subscribe({
      next: (res: any) => {
        // expects { items, total, page, limit } from your /products endpoint
        this.items.set(res?.items || []);
        this.total.set(res?.total || 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erreur lors de la recherche.');
        this.loading.set(false);
      }
    });
  }
}
