// src/app/pages/home/banner/banner.component.ts
import { Component, Input, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { NgFor } from '@angular/common';
import { BannerSlideComponent } from '../banner-slide/banner-slide.component';
import { Slide } from '../../../models/slide';

@Component({
  standalone: true,
  selector: 'app-banner',
  imports: [NgFor, BannerSlideComponent],
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css']
})
export class BannerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) slides: Slide[] = [];
  @Input() intervalMs = 4000;
  @Input() autoPlay = true;

  index = signal(0);
  paused = signal(false);
  private timerId: any = null;

  ngOnInit() {
    this.start();
  }

  ngOnDestroy() {
    this.stop();
  }

  start() {
    if (!this.autoPlay || this.timerId || !this.slides.length) return;
    this.timerId = setInterval(() => {
      if (!this.paused()) this.next();
    }, this.intervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  next() {
    if (!this.slides.length) return;
    this.index.update(i => (i + 1) % this.slides.length);
  }

  prev() {
    if (!this.slides.length) return;
    this.index.update(i => (i - 1 + this.slides.length) % this.slides.length);
  }

  goTo(i: number) {
    if (!this.slides.length) return;
    const safe = ((i % this.slides.length) + this.slides.length) % this.slides.length;
    this.index.set(safe);
  }

  // accessibilité : clavier
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.slides.length) return;
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'ArrowLeft') this.prev();
  }
}
