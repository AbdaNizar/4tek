import {
  Component, Input, OnDestroy, OnInit, ViewChild, ElementRef,
  signal, computed, effect
} from '@angular/core';
import {NgFor, NgIf, NgClass} from '@angular/common';
import {CategoryCardComponent, CatCard} from '../category-card/category-card.component';

@Component({
  standalone: true,
  selector: 'app-popular-cats-carousel',
  imports: [NgFor, NgIf, NgClass, CategoryCardComponent],
  templateUrl: './popular-cats-carousel.component.html',
  styleUrls: ['./popular-cats-carousel.component.css']
})
export class PopularCatsCarouselComponent implements OnInit, OnDestroy {
  @Input() title = 'Catégories Populaires';
  @Input() autoMs = 4000;

  /** make cats reactive */
  protected catsSig = signal<CatCard[]>([]);
  @Input() set cats(v: CatCard[]) { this.catsSig.set(v ?? []); }
  get cats(): CatCard[] { return this.catsSig(); }

  @ViewChild('track', {static: true}) track!: ElementRef<HTMLElement>;
  @ViewChild('shell', {static: true}) shell!: ElementRef<HTMLElement>;

  page = signal(0);
  private itemsPerViewSig = signal(4);

  /** now truly reactive */
  pages = computed(() =>
    Math.max(1, Math.ceil(this.catsSig().length / this.itemsPerViewSig()))
  );

  /** keep page index valid when pages change */
  private clamp = effect(() => {
    const total = this.pages();
    const p = this.page();
    if (p > total - 1) this.page.set(Math.max(0, total - 1));
  });

  private timer?: number;
  private resizeObs?: ResizeObserver;

  ngOnInit() {
    this.calcItemsPerView();
    this.resizeObs = new ResizeObserver(() => this.calcItemsPerView());
    this.resizeObs.observe(document.documentElement);
    this.start();
  }
  ngOnDestroy() {
    this.stop();
    this.resizeObs?.disconnect();
  }

  private calcItemsPerView() {
    const w = window.innerWidth;
    const val = (w <= 520) ? 1 : (w <= 900) ? 2 : (w <= 1200) ? 3 : 4;
    if (this.itemsPerViewSig() !== val) {
      this.itemsPerViewSig.set(val);
      this.goTo(this.page() % this.pages());
    }
  }

  start() {
    this.stop();
    if (this.pages() > 1) { // avoid running when only 1 page
      this.timer = window.setInterval(() => this.next(), this.autoMs);
    }
  }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = undefined; } }

  prev() { this.goTo((this.page() - 1 + this.pages()) % this.pages()); }
  next() { this.goTo((this.page() + 1) % this.pages()); }

  goTo(p: number) {
    this.page.set(p);
    const shellEl = this.shell?.nativeElement;
    if (!shellEl) return;
    shellEl.scrollTo({ left: shellEl.clientWidth * p, behavior: 'smooth' });
  }

  setPage(p: number) { this.goTo(p); this.start(); }

  trackByCat = (_: number, c: CatCard) => c._id ?? c.slug ?? c.name;

  pagesArr(): number[] {
    const n = this.pages();
    return Array.from({ length: n }, (_, i) => i);
  }
}
