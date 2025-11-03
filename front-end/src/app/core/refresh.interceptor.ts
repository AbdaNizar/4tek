import { HttpClient, HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, firstValueFrom, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

let refreshing = false;
const queue: Array<() => void> = [];

function enqueue(cb: () => void) { queue.push(cb); }
function flush() { while (queue.length) queue.shift()!(); }

export const refreshInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<any>> => {
  const http = inject(HttpClient);
  const auth = inject(AuthService);
  const isRefreshCall = req.url.includes('/auth/refresh');

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isRefreshCall) return throwError(() => err);

      if (!refreshing) {
        refreshing = true;
        // call refresh once
        return from(firstValueFrom(http.post<{ ok: boolean }>('/auth/refresh', {}, { withCredentials: true }))).pipe(
          switchMap(() => {
            refreshing = false;
            flush();
            return next(req.clone({ withCredentials: true }));
          }),
          catchError(e => {
            refreshing = false;
            flush();
            auth.forceLocalLogout();
            return throwError(() => e);
          })
        );
      }

      // queue the original request until refresh finishes
      return new Observable<HttpEvent<any>>(observer => {
        enqueue(() => {
          next(req.clone({ withCredentials: true })).subscribe({
            next: v => observer.next(v),
            error: e => observer.error(e),
            complete: () => observer.complete(),
          });
        });
      });
    })
  );
};
