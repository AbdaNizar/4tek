// src/app/services/auth-modal/auth-modal.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify-email';

export interface AuthModalOpenOpts {
  mode?: Mode;                 // ex: 'login'
  patch?: Partial<{
    email: string; name: string; phone: string; address: string;
    password: string; confirm: string;
  }>;                                   // pré-remplir des champs
  autofocus?: boolean;                  // focus premier champ
}

@Injectable({ providedIn: 'root' })
export class AuthModalService {
  private _open$ = new Subject<AuthModalOpenOpts>();
  /** Stream interne utilisé par la modale pour s’ouvrir */
  readonly open$ = this._open$.asObservable();

  /** À appeler depuis n’importe quel composant */
  open(opts: AuthModalOpenOpts = {}) {
    this._open$.next(opts);
  }
}
