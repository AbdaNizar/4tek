import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import {SortKey} from '../../../interfaces/sortKey';


@Component({
  standalone: true,
  selector: 'app-product-sort-dropdown',
  imports: [NgIf, NgFor],
  templateUrl: './product-sort-dropdown.component.html',
  styleUrls: ['./product-sort-dropdown.component.css']
})
export class ProductSortDropdownComponent {
  @Input() sortBy: SortKey = 'priceAsc';
  @Output() sortChange = new EventEmitter<SortKey>();

  // état du menu
  open = signal(false);

  // toutes les options
  options: { key: SortKey; label: string }[] = [
    { key: 'priceAsc', label: 'Prix le plus bas' },
    { key: 'priceDesc', label: 'Prix le plus haut' },
    { key: 'newest', label: 'Nouveautés' }
  ];

  toggle() {
    this.open.update(v => !v);
  }

  choose(key: SortKey) {
    this.sortBy = key;
    this.sortChange.emit(key);
    this.open.set(false);
  }

  label(key: SortKey) {
    return this.options.find(o => o.key === key)?.label ?? key;
  }
}
