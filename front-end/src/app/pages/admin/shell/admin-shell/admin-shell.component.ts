// src/app/pages/admin/shell/admin-shell.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminTopbarComponent } from '../admin-topbar/admin-topbar.component';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  standalone: true,
  selector: 'app-admin-shell',
  imports: [RouterOutlet, AdminTopbarComponent, AdminSidebarComponent],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css']
})
export class AdminShellComponent {}
