// src/app/layout/header/header-search/header-search.component.ts
import { Component, ElementRef, EventEmitter, Output, ViewChild, inject, signal } from '@angular/core';
import {  NgIf, NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { SearchService} from '../../../../services/search/search.service';
import {SearchHit} from '../../../../interfaces/SearchHit';
import {FormsModule} from '@angular/forms';
import {getUrl} from '../../../../shared/constant/function';

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

  // états
  query = '';
  isMobile = false;               // tu peux déjà le calculer ailleurs si tu veux
  isOpen = false;

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
            this.results.set([]); return of([]);
          }
          this.loading.set(true);
          this.error.set(null);
          return this.searchApi.suggest(q.trim()).pipe(
            catchError(() => {
              this.error.set('Erreur de recherche'); return of([]);
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
    this.closeMobile();
    this.router.navigate(['/recherche'], { queryParams: { q } });
  }

  // mobile sheet
  openMobile() {
    this.isOpen = true;
    setTimeout(() => this.mobileInput?.nativeElement?.focus(), 0);
  }
  closeMobile() { this.isOpen = false; }

  clear() {
    this.query = '';
    this.results.set([]);
  }

  trackById = (_: number, h: SearchHit) => h._id;
  protected readonly getUrl = getUrl;
}
