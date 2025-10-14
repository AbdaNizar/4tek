import { Component } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-header-topbar',
  imports: [
    RouterLink,
  ],
  standalone: true,
  templateUrl: './header-topbar.component.html',
  styleUrl: './header-topbar.component.css'
})
export class HeaderTopbarComponent {

}
