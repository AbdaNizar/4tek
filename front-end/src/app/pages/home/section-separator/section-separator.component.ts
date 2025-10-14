import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-section-separator',
  templateUrl: './section-separator.component.html',
  styleUrls: ['./section-separator.component.css']
})
export class SectionSeparatorComponent {
  @Input() label: string = '';
}
