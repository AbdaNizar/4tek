import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppConfigService } from './app-config.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const cfg = inject(AppConfigService);
  if (req.url.startsWith('/api/')) {
    const url = cfg.apiBaseUrl + req.url.replace('/api', '');
    req = req.clone({ url });
  }

  return next(req);
};
