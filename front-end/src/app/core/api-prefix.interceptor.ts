import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const apiPrefixInterceptor: HttpInterceptorFn = (req, next) => {
  // Ne pas toucher aux URLs absolues (http/https)
  const isAbsolute = /^https?:\/\//i.test(req.url);
  if (isAbsolute) return next(req);

  // Préfixer les URLs relatives avec base + /v1
  const apiUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const url = `${apiUrl}/v1${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  const cloned = req.clone({ url });

  return next(cloned);
};
