// src/app/pages/admin/shell/topbar/admin-topbar.component.ts
import {Component, HostListener, inject, signal} from '@angular/core';
import { AuthService } from '../../../../services/auth/auth.service';
import {NgIf, SlicePipe, UpperCasePipe} from '@angular/common';
import {Router} from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-admin-topbar',
  templateUrl: './admin-topbar.component.html',
  imports: [
    NgIf,
    SlicePipe,
    UpperCasePipe
  ],
  styleUrls: ['./admin-topbar.component.css']
})
export class AdminTopbarComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);
  private router = inject(Router);

  toggleMenu(ev?: Event) {
    ev?.stopPropagation();
    this.menuOpen.update(v => !v);
  }
  closeMenu() {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeMenu();
  }

  // Close on Esc
  @HostListener('document:keydown.escape', ['$event'])
  onEsc(e: KeyboardEvent) {
    e.stopPropagation();
    this.closeMenu();
  }
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
  logout(){ this.auth.logout(); this.router.navigateByUrl('/', {replaceUrl: true}); }
  goToApp(){     this.router.navigateByUrl('/', {replaceUrl: true});
  }

  // protected readonly v = v;
}
