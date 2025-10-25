import {Component, Input, OnChanges} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ProductCardComponent } from '../product-card/product-card.component';
import {FormsModule} from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-product-grid',
  imports: [NgIf, NgFor, ProductCardComponent, FormsModule],
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.css']
})
export class ProductGridComponent implements OnChanges {
  @Input() products: any[] = [];
  @Input() view: 'grid' | 'list' = 'grid';
  @Input() loading = false;

  page = 1;
  pageSize = this.view == 'list' ? 4 : 6;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.products.length / this.pageSize));
  }

  get pageNums(): number[] {
    const max = 7;
    const pages = this.totalPages;
    const cur = this.page;
    if (pages <= max) return Array.from({length: pages}, (_, i) => i + 1);

    const nums: number[] = [];
    const push = (n: number) => { if (!nums.includes(n)) nums.push(n); };

    push(1); push(2);
    const start = Math.max(3, cur - 1);
    const end   = Math.min(pages - 2, cur + 1);
    if (start > 3) push(NaN); // fera un "…" via CSS
    for (let i = start; i <= end; i++) push(i);
    if (end < pages - 2) push(NaN);
    push(pages - 1); push(pages);

    return nums;
  }

  get pagedProducts() {
    const start = (this.page - 1) * this.pageSize;
    return this.products.slice(start, start + this.pageSize);
  }


  goTo(n: number) {
    if (Number.isNaN(n)) return;
    if (n < 1 || n > this.totalPages) return;
    this.page = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  goPrev() { this.goTo(this.page - 1); }
  goNext() { this.goTo(this.page + 1); }
  changePageSize(sz: number) {
    this.pageSize = +sz || 12;
    this.page = 1;
  }

  ngOnChanges() { this.page = 1;   this.pageSize = this.view == 'list' ? 4 : 6; }

  protected readonly Number = Number;
}
