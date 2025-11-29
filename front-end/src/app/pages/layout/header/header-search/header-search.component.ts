// src/app/layout/header/header-search/header-search.component.ts
import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { SearchService } from '../../../../services/search/search.service';
import { SearchHit } from '../../../../interfaces/SearchHit';
import { FormsModule } from '@angular/forms';
import { getUrl } from '../../../../shared/constant/function';

@Component({
  standalone: true,
  selector: 'app-header-search',
  imports: [FormsModule, NgIf, NgFor, RouterLink],
  templateUrl: './header-search.component.html',
  styleUrls: ['./header-search.component.css']
})
export class HeaderSearchComponent {
  @Output() submitSearch = new EventEmitter<string>();

  private searchApi = inject(SearchService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  // états
  query = '';
  isMobile = false;   // à gérer ailleurs si besoin
  isOpen = false;     // pour le sheet mobile

  results = signal<SearchHit[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  private input$ = new Subject<string>();

  @ViewChild('mobileInput') mobileInput?: ElementRef<HTMLInputElement>;

  constructor() {
    // écoute du flux de saisie
    this.input$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap(q => {
          if (!q?.trim()) {
            this.results.set([]);
            return of([]);
          }
          this.loading.set(true);
          this.error.set(null);
          return this.searchApi.suggest(q.trim()).pipe(
            catchError(() => {
              this.error.set('Erreur de recherche');
              return of([]);
            })
          );
        })
      )
      .subscribe(list => {
        this.results.set(list || []);
        this.loading.set(false);
      });
  }

  // appelé depuis (ngModelChange)
  onType(v: string) {
    this.query = v;
    this.input$.next(v);
  }

  onSubmit(e: Event) {
    e.preventDefault();
    const q = this.query?.trim();
    if (!q) return;
    this.submitSearch.emit(q);
    this.closeMobile(true); // ferme et nettoie sur mobile
    this.router.navigate(['/recherche'], { queryParams: { q } });
  }

  // quand on clique sur un produit dans la liste (desktop ou mobile)
  onHitClick(hit: SearchHit) {
    const slug = (hit as any).slug;
    if (!slug) return;

    // nettoie l'UI
    this.clear();
    this.isOpen = false;

    this.router.navigate(['/product', slug]);
  }

  // mobile sheet
  openMobile() {
    this.isOpen = true;
    setTimeout(() => this.mobileInput?.nativeElement?.focus(), 0);
  }

  // closeMobile(clear = false) : si clear = true, on efface la recherche
  closeMobile(clear: boolean = false) {
    this.isOpen = false;
    if (clear) {
      this.clear();
    }
  }

  clear() {
    this.query = '';
    this.results.set([]);
    this.error.set(null);
    this.loading.set(false);
  }

  trackById = (_: number, h: SearchHit) => h._id;
  protected readonly getUrl = getUrl;

  // Fermer la liste si clic à l’extérieur du composant (desktop + mobile)
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    if (!this.host.nativeElement.contains(target)) {
      // clic dehors → on vide tout
      this.clear();
      this.isOpen = false;
    }
  }
}
