import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductSortDropdownComponent } from '../product-sort-dropdown/product-sort-dropdown.component';
import {SortKey} from '../../../interfaces/sortKey';

@Component({
  standalone: true,
  selector: 'app-product-controls',
  imports: [FormsModule, ProductSortDropdownComponent],
  templateUrl: './product-controls.component.html',
  styleUrls: ['./product-controls.component.css']
})
export class ProductControlsComponent {
  @Input() view: 'grid' | 'list' = 'grid';
  @Output() viewChange = new EventEmitter<'grid' | 'list'>();

  @Input() featuredOnly = false;
  @Output() featuredChange = new EventEmitter<boolean>();

  @Input() sortBy: SortKey = 'priceAsc';
  @Output() sortChange = new EventEmitter<SortKey>();
}
