// src/app/layout/header/menu-toggle/header-menu-toggle.component.ts
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-header-menu-toggle',
  templateUrl: './header-menu-toggle.component.html',
  styleUrls: ['./header-menu-toggle.component.css'],
})
export class HeaderMenuToggleComponent {
  @Output() toggle = new EventEmitter<void>();
}
