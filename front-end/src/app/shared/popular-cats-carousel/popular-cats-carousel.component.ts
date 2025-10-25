import {Component, Input, OnDestroy, OnInit, ViewChild, ElementRef, signal, computed} from '@angular/core';
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
  @Input() cats: CatCard[] = [];
  @Input() autoMs = 4000;

  @ViewChild('track', {static: true}) track!: ElementRef<HTMLElement>;
  @ViewChild('shell', {static: true}) shell!: ElementRef<HTMLElement>;

  page = signal(0);
  pages = computed(() => Math.max(1, Math.ceil(this.cats.length / this.itemsPerView)));
  private timer?: number;
  private resizeObs?: ResizeObserver;
  itemsPerView = 4;

  ngOnInit() {
    console.log('=======>>',this.cats)
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
    this.itemsPerView = (w <= 520) ? 1 : (w <= 900) ? 2 : (w <= 1200) ? 3 : 4;
    // recaler la page
    this.goTo(this.page() % this.pages());
  }

  start() { this.stop(); this.timer = window.setInterval(() => this.next(), this.autoMs); }
  stop()  { if (this.timer) { clearInterval(this.timer); this.timer = undefined; } }

  prev() { this.goTo((this.page() - 1 + this.pages()) % this.pages()); }
  next() { this.goTo((this.page() + 1) % this.pages()); }

  goTo(p: number) {
    this.page.set(p);
    const shellEl = this.shell?.nativeElement;
    if (!shellEl) return;
    shellEl.scrollTo({ left: shellEl.clientWidth * p, behavior: 'smooth' });
  }

  /** pour dots clic */
  setPage(p: number) { this.goTo(p); this.start(); }

  /** trackBy pour ngFor */
  trackByCat = (_: number, c: CatCard) => c._id ?? c.slug ?? c.name;

  /** tableau [0..pages-1] pour les pastilles */
  pagesArr(): number[] {
    const n = this.pages();
    return Array.from({ length: n }, (_, i) => i);
  }
}
