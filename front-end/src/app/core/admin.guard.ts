import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service' ;

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  console.log('auth.isLoggedIn() ',auth.isLoggedIn() )
  console.log('auth.isAdmin() ',auth.isAdmin() )
  if (auth.isLoggedIn() && auth.isAdmin()) return true;
  router.navigate(['/admin/login']);
  return false;
};
