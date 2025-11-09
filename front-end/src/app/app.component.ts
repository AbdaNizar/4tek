import {Component, inject, OnInit, signal} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {FooterComponent} from './pages/layout/footer/footer.component';
import {AppHeaderComponent} from './pages/layout/header/header.component';
import {filter} from 'rxjs';
import {NgIf} from '@angular/common';
import {ToastsComponent} from './shared/toasts/toasts.component';
import {IdleTimeoutService} from './services/idle-timeout/idle-timeout.service';
import { AuthService} from './services/auth/auth.service';
import {BreadcrumbComponent} from './shared/breadcrumb/breadcrumb.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, AppHeaderComponent, NgIf, ToastsComponent, BreadcrumbComponent],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = '4tek';
  hideShell = signal(false);
  auth = inject(AuthService);


  constructor(protected router: Router, private idle: IdleTimeoutService) {
    this.auth.hydrateFromServer(); // ← déclenche GET /auth/me (envoie cookies)

    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const route = this.router.routerState.root;
        let r = route.firstChild;
        let hide = false;

        while (r) {
          hide = !!r.snapshot.data?.['hideShell'] || hide;
          r = r.firstChild;
        }
        this.hideShell.set(hide);



      });
    this.idle.init();


  }

}
