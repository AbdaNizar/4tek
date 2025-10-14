import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-header-brand',
  imports: [RouterLink],
  templateUrl: './header-brand.component.html',
  styleUrls: ['./header-brand.component.css']
})
export class HeaderBrandComponent {}
