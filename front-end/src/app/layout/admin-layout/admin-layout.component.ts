import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ToastsComponent} from '../../shared/toasts/toasts.component';
// Optionnel : une topbar admin plus tard
@Component({
  standalone: true,
  selector: 'app-admin-layout',
  template: `
    <!-- Admin shell sans header/footer public -->

  `,
  styles: [`.admin-shell{min-height:100dvh; padding:16px;}`]
})
export class AdminLayoutComponent {}
