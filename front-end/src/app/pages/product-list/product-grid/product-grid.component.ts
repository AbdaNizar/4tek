import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  standalone: true,
  selector: 'app-product-grid',
  imports: [NgIf, NgFor, ProductCardComponent],
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.css']
})
export class ProductGridComponent {
  @Input() products: any[] = [];
  @Input() view: 'grid' | 'list' = 'grid';
  @Input() loading = false;
}
