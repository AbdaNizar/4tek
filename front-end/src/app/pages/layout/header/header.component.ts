import { Component, signal } from '@angular/core';
import {HeaderBrandComponent} from './header-brand/header-brand.component';
import {HeaderNavDesktopComponent} from './header-nav-desktop/header-nav-desktop.component';
import {HeaderCartComponent} from './header-cart/header-cart.component';
import {HeaderMenuToggleComponent} from './header-menu-toggle/header-menu-toggle.component';
import {HeaderNavMobileComponent} from './header-nav-mobile/header-nav-mobile.component';
import {HeaderSearchComponent} from './header-search/header-search.component';
import {HeaderUserComponent} from './header-user/header-user.component';
import {HeaderTopbarComponent} from './header-topbar/header-topbar.component';


@Component({
  standalone: true,
  selector: 'app-header',
  imports: [
    HeaderBrandComponent,
    HeaderSearchComponent,
    HeaderNavDesktopComponent,
    HeaderCartComponent,
    HeaderMenuToggleComponent,
    HeaderNavMobileComponent,
    HeaderUserComponent,
    HeaderTopbarComponent
  ],
  templateUrl: 'header.component.html',
  styleUrls: ['header.component.css']
})
export class AppHeaderComponent {
// in parent
  open = signal(false);
  toggleMenu(){ this.open.update(v => !v); }
  closeMenu(){ this.open.set(false); }


  onSearch(term: string) {
    // TODO: naviguer vers /recherche?query=term ou appeler un service
  }
}
