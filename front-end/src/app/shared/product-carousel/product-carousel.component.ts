import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import { Product} from '../../interfaces/product';
import { ProductCardComponent} from '../../pages/product-list/product-card/product-card.component';

@Component({
  standalone: true,
  selector: 'app-product-carousel',
  imports: [NgFor, ProductCardComponent, NgIf],
  templateUrl: './product-carousel.component.html',
  styleUrls: ['./product-carousel.component.css']
})
export class ProductCarouselComponent implements AfterViewInit, OnDestroy {
  @Input() title = 'Meilleures Offres';
  @Input() products: Product[] = [];
  @Input() intervalMs = 5000;
  @Input() autoplay = true;

  @ViewChild('track', { static: true }) trackRef!: ElementRef<HTMLDivElement>;
  @ViewChild('shell', { static: true }) shellRef!: ElementRef<HTMLDivElement>;

  index = 0;                  // active “page” (snap index)
  private visible = 4;        // recalculated
  private timer: any = null;
  private io?: IntersectionObserver;


  ngAfterViewInit(): void {
    this.recalcVisible();
    this.initObserver();
    if (this.autoplay) this.startAuto();

    // ne pas scroller la page si pas d’overflow
    queueMicrotask(() => { if (this.canScroll()) this.snapTo(this.index, false); });
  }

  ngOnDestroy(): void { this.stopAuto(); this.io?.disconnect(); }
  private canScroll(): boolean {
    const el = this.trackRef.nativeElement;
    return el.scrollWidth > el.clientWidth + 2; // +2 marge anti arrondis
  }

  private snapTo(i: number, smooth = true) {
    const items = this.itemEls();
    if (!items.length || !this.canScroll()) return;

    const clamped = Math.max(0, Math.min(i, Math.max(0, items.length - this.visible)));
    this.index = clamped;

    const track = this.trackRef.nativeElement;
    const target = items[clamped];
    if (!target) return;

    // position horizontale relative à la piste
    const left = target.offsetLeft - track.offsetLeft;

    track.scrollTo({
      left,
      behavior: smooth ? 'smooth' as ScrollBehavior : 'auto'
    });
  }

  @HostListener('window:resize') onResize() {
    this.recalcVisible();
    this.snapTo(this.index, false);
  }

  private recalcVisible() {
    const w = this.shellRef.nativeElement.clientWidth || window.innerWidth;
    this.visible = w <= 520 ? 1 : w <= 780 ? 2 : w <= 1024 ? 3 : 4;
  }

  private itemEls(): HTMLElement[] {
    return Array.from(this.trackRef.nativeElement.querySelectorAll<HTMLElement>('.pc-item'));
  }



  scroll(dir: 'left' | 'right') {
    this.snapTo(this.index + (dir === 'right' ? this.visible : -this.visible));
  }

  private nextPage() {
    const items = this.itemEls().length;
    if (!items) return;
    const maxIdx = Math.max(0, items - this.visible);
    this.snapTo(this.index >= maxIdx ? 0 : this.index + this.visible);
  }

  private startAuto() { this.stopAuto(); this.timer = setInterval(() => this.nextPage(), this.intervalMs); }
  private stopAuto() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  private initObserver() {
    this.io?.disconnect();
    const opts: IntersectionObserverInit = { root: this.trackRef.nativeElement, threshold: 0.6 };
    this.io = new IntersectionObserver((entries) => {
      // find first visible item, update index (keeps dots & arrows in sync)
      const visibles = entries.filter(e => e.isIntersecting).sort((a,b)=> (a.target as HTMLElement).offsetLeft - (b.target as HTMLElement).offsetLeft);
      if (visibles[0]) {
        const items = this.itemEls();
        const idx = items.indexOf(visibles[0].target as HTMLElement);
        if (idx >= 0) this.index = Math.min(idx, Math.max(0, items.length - this.visible));
      }
    }, opts);
    this.itemEls().forEach(el => this.io!.observe(el));
  }

  // dots click
  goToDot(i: number) { this.snapTo(i); }

  // pause auto on user touch/hover
  onUserStart() { this.stopAuto(); }
  onUserEnd()   { if (this.autoplay) this.startAuto(); }
}
