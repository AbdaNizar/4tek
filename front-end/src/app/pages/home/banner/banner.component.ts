import { Component, Input, OnInit, OnDestroy, signal, effect, HostListener } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { BannerSlideComponent } from '../banner-slide/banner-slide.component';
import { Slide } from '../../../models/slide';

@Component({
  standalone: true,
  selector: 'app-banner',
  imports: [NgFor,  BannerSlideComponent],
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css']
})
export class BannerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) slides: Slide[] = [];
  @Input() intervalMs = 3000;
  @Input() autoPlay = true;

  index = signal(0);
  paused = signal(false);
  private timerId: any = null;

  ngOnInit() { this.start(); }
  ngOnDestroy() { this.stop(); }

  start() {
    if (!this.autoPlay || this.timerId) return;
    this.timerId = setInterval(() => {
      if (!this.paused()) this.next();
    }, this.intervalMs);
  }
  stop() { if (this.timerId) { clearInterval(this.timerId); this.timerId = null; } }

  next() { this.index.update(i => (i + 1) % this.slides.length); }
  prev() { this.index.update(i => (i - 1 + this.slides.length) % this.slides.length); }
  goTo(i: number) { this.index.set(i % this.slides.length); }

  // accessibilité : clavier
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'ArrowLeft') this.prev();
  }
}
