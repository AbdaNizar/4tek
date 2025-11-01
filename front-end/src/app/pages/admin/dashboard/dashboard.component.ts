// src/app/pages/admin/dashboard/admin-dashboard.component.ts
import {Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import {Router} from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class AdminDashboardComponent {

  private router = inject(Router);

  goTo(path: string) {
    this.router.navigateByUrl(path).then();
  }
}
