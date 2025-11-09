import { Component } from '@angular/core';
import {SectionSeparatorComponent} from '../../home/section-separator/section-separator.component';

@Component({
  standalone: true,
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  imports: [
    SectionSeparatorComponent
  ],
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  year = new Date().getFullYear();
}
