// src/app/guards/admin.can-match.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment, Route } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const adminCanMatch: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // connecté + rôle admin ?
  const isLogged = !!auth.token();
  const isAdmin  = auth.user()?.role === 'admin';

  if (isLogged && isAdmin) return true;

  // sinon → Home (tu peux ouvrir ton modal login si tu veux)
  router.navigateByUrl('/');
  return false;
};
