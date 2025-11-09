// app-brand-strip.component.ts
import {Component, Input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Brand} from '../../../interfaces/brand';
import {NgForOf} from '@angular/common';
import {getUrl} from '../../../shared/constant/function';
@Component({
  standalone: true,
  selector: 'app-brand-strip',
  template: `
    <div class="brands">
      <a class="brand" *ngFor="let b of brands"
         [routerLink]="['/recherche']" [queryParams]="{ q: b.slug }" >
        <img [src]="getUrl(b.iconUrl)" [alt]="b.name" loading="lazy">
      </a>
    </div>`,
  imports: [
    RouterLink,
    NgForOf
  ],
  styles: [`
    .brands {
      display: flex;
      gap: 16px;
      overflow: auto;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, .06);
      border-radius: var(--radius-2);
      background: linear-gradient(180deg, var(--card), #12182612);
      justify-content: center;
    }

    .brands::-webkit-scrollbar {
      display: none
    }

    .brand {
      flex: 0 0 120px;
      height: 56px;
      display: grid;
      place-items: center;
      background: #0e15253d;
      border: 1px solid rgba(255, 255, 255, .06);
      border-radius: 12px;
      transition: transform .15s;
      justify-content: center;
    }

    .brand:hover {
      transform: translateY(-2px)
    }

    img {
      max-width: 80%;
      max-height: 70%;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, .4))
    }
  `]
})
export class BrandStripComponent{
  @Input() brands:Brand[]=[];
  protected readonly getUrl = getUrl;
}
