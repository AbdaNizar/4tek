import { Component, Input } from '@angular/core';
import {CurrencyPipe, DecimalPipe, KeyValuePipe, NgIf, SlicePipe} from '@angular/common';
import {getUrl} from '../../../shared/constant/function';
import {Product} from '../../../interfaces/product';
import {RouterLink} from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-product-card',
  imports: [NgIf, CurrencyPipe, KeyValuePipe, SlicePipe, RouterLink, DecimalPipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() view: 'grid' | 'list' = 'grid';
  protected readonly getUrl = getUrl;
  protected readonly Math = Math;
}
