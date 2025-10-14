import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Slide } from '../../../models/slide';

@Component({
  standalone: true,
  selector: 'app-banner-slide',
  imports: [NgIf, RouterLink],
  templateUrl: './banner-slide.component.html',
  styleUrls: ['./banner-slide.component.css']
})
export class BannerSlideComponent {
  @Input({ required: true }) slide!: Slide;
  @Input() active = false;

  isExternal(link: string | any): boolean {
    return typeof link === 'string' && link.startsWith('http');
  }

}
