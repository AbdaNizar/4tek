// src/app/pages/admin/shell/topbar/admin-topbar.component.ts
import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth/auth.service';
import {NgIf, SlicePipe, UpperCasePipe} from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-admin-topbar',
  templateUrl: './admin-topbar.component.html',
  imports: [
    NgIf
  ],
  styleUrls: ['./admin-topbar.component.css']
})
export class AdminTopbarComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);

  shortName(){
    const u = this.auth.user();
    if (!u) return '';
    return u.name || (u.email?.split('@')[0] ?? '');
  }
  avatarUrl(){
    const u = this.auth.user();
    const raw = u?.avatar; if (!raw) return null;
    return raw.trim().replace(/^"+|"+$/g, '');
  }
  logout(){ this.auth.logout(); location.href = '/'; }

  // protected readonly v = v;
}
