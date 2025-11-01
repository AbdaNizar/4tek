import { HttpInterceptorFn } from '@angular/common/http';


export const apiInterceptor: HttpInterceptorFn = (req, next) => {

  if (req.url.startsWith('/api/')) {
    const url = req.url.replace('/api', '');
    req = req.clone({ url });
  }

  return next(req);
};
