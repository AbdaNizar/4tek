import {Component, Input} from '@angular/core';
import {RouterLink} from '@angular/router';

export type CatCard = { _id?: string; slug?: string; name: string; imageUrl?: string; };

@Component({
  standalone: true,
  selector: 'app-category-card',
  imports: [RouterLink],
  templateUrl: './category-card.component.html',
  styleUrls: ['./category-card.component.css']
})
export class CategoryCardComponent {
  @Input() cat!: CatCard;
  get link() {
    return this.cat._id ? ['/categories', this.cat._id] : ['/categories', this.cat.slug] ; }
  get src()  { return this.cat.imageUrl || '/assets/images/placeholder.jpg'; }
}
