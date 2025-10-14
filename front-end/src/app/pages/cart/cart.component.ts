import {Component, inject, OnInit} from '@angular/core';
import { NgFor, CurrencyPipe, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart/cart.service';

@Component({
  standalone: true,
  selector: 'app-cart',
  imports: [NgFor, CurrencyPipe, FormsModule, NgIf],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cart = inject(CartService);
  ngOnInit() {
    console.log(this.cart.items());
  }
}
