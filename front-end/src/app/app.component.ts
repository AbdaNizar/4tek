import {Component, inject, OnInit, signal} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {FooterComponent} from './pages/layout/footer/footer.component';
import {AppHeaderComponent} from './pages/layout/header/header.component';
import {filter} from 'rxjs';
import {NgIf} from '@angular/common';
import {ToastsComponent} from './shared/toasts/toasts.component';
import {SubnavMegaComponent} from './pages/layout/header/subnav-mega/subnav-mega.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, AppHeaderComponent, NgIf, ToastsComponent, SubnavMegaComponent],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = '4tek';
  hideShell = signal(false);


  constructor(private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const route = this.router.routerState.root;
        console.log(route)
        let r = route.firstChild;
        let hide = false;

        while (r) {
          hide = !!r.snapshot.data?.['hideShell'] || hide;
          r = r.firstChild;
        }
        this.hideShell.set(hide);
        console.log(this.hideShell())
      });


  }

}
