// src/app/guards/admin.can-match.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { from, map } from 'rxjs';

export const adminCanMatch: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.whenReady()).pipe(
    map(() => {
      const isAdmin = auth.user()?.role === 'admin';
      if (isAdmin) return true;
      router.navigateByUrl('/');
      return false;
    })
  );
};
