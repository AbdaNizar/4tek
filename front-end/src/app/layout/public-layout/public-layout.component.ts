import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';


@Component({
  standalone: true,
  selector: 'app-public-layout',
  imports: [RouterOutlet],
  template: `
    <main class="page"><router-outlet /></main>
  `,
  styles: [`.page{min-height:calc(100dvh - 160px); padding: 12px 0;}`]
})
export class PublicLayoutComponent {}
