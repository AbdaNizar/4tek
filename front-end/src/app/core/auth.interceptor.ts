// src/app/core/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Intercepteur "auth" après la migration vers cookies HttpOnly :
 * - NE PAS ajouter d'Authorization (les cookies partent tout seuls)
 * - Ajoute X-CSRF-Token pour les requêtes mutantes si le cookie csrf_token est présent
 * - Force withCredentials
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const withCreds = req.clone({ withCredentials: true });

  // Méthodes "unsafe" → envoyer le CSRF si dispo
  const method = req.method.toUpperCase();
  const needsCsrf = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

  if (!needsCsrf) {
    return next(withCreds);
  }

  // Récupère le csrf_token (double-submit cookie)
  const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  if (!m) {
    return next(withCreds);
  }

  const csrf = decodeURIComponent(m[1]);
  const withCsrf = withCreds.clone({
    headers: withCreds.headers.set('X-CSRF-Token', csrf),
  });

  return next(withCsrf);
};
