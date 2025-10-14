// src/app/services/auth.service.ts
import {Injectable, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';

type User = { id: string; email?: string; name?: string; isVerified?: boolean; active?: boolean; avatar?: string; role?: 'user' | 'admin' };
type LoginResp = { token: string; user: User };

@Injectable({providedIn: 'root'})
export class AuthService {
  private http = inject(HttpClient);
  private CLIENT_URL = 'http://localhost:4200' ;
  API_URL = 'http://localhost:3000/v1';
  private CLIENT_ORIGIN = new URL(this.CLIENT_URL).origin;

  token = signal<string | null>(localStorage.getItem('auth_token'));
  user = signal<User | null>(JSON.parse(localStorage.getItem('auth_user') || 'null'));

  async hydrateFromStorage() {
    if (!this.token()) return;
    try {
      const me = await this.http.get<User>(`${this.API_URL}/auth/me`).toPromise();
      if (me) {
        this.user.set(me);
        localStorage.setItem('auth_user', JSON.stringify(me));
      }
    } catch {
      this.logout();
    }
  }

  /** Email/password */
  async login(email: string, password: string) {
    const res = await this.http.post<LoginResp>(`${this.API_URL}/auth/login`, { email, password }).toPromise();
    if (!res) throw new Error('Réponse vide');
    console.log(res.user.isVerified)
    if (!res.user.isVerified) {
      throw new Error('Email non vérifié. Vérifie ta boîte mail ou renvoie l’email de confirmation.');
    }
    if (!res.user.active) {
      throw new Error('Votre compte est actuellement bloqué par l\'administrateur. Nous vous prions de contacter le support technique.');
    }
    this.applyLogin(res);
    return true;
  }

  async register(payload: { name: string; email: string; password: string; phone?: string; address?: string }) {
    const res = await this.http.post<LoginResp>(`${this.API_URL}/auth/register`, payload).toPromise();
    if (res?.token) this.applyLogin(res);
    return !!res?.token;
  }


  async forgotPassword(email: string) {
    // backend route: POST { email }
    console.log(email)

    await this.http.post(`${this.API_URL}/auth/forgot/password`, { email }).toPromise();



  }
  async resetPassword(token: string, password: string): Promise<void> {
    await this.http.post<{ ok: boolean }>(`${this.API_URL}/auth/reset`, { token, password }).toPromise();
  }

  // --------- Vérification email : renvoi du lien ----------
  async resendVerification(email: string): Promise<void> {
    console.log('email ', email)
    await this.http.post(`${this.API_URL}/auth/resend-verification`, { email }).toPromise();
  }

  // --------- Interception du hash #data=... ----------
  /**
   * Lit window.location.hash, détecte #data=..., décode base64url,
   * et si {token,user} → applique le login + nettoie l’URL.
   * Retourne true si un login a été appliqué.
   */
  // Parse #data=... and act
  async handleAuthHash(): Promise<{type?: string, email?: string} | null> {
    const hash = window.location.hash || '';
    const m = hash.match(/#data=([^&]+)/);
    if (!m) return null;

    // clear hash immediately to avoid re-processing on navigation
    history.replaceState({}, document.title, window.location.pathname + window.location.search);

    try {
      const json = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(json);

      switch (data?.type) {
        case 'VERIFY_OK':
          if (data?.token && data?.user) this.applyLogin({ token: data.token, user: data.user });
          return { type: 'VERIFY_OK' };
          case 'EMAIL_VALID':
            return { type: 'EMAIL_VALID', email: data?.email };

        case 'VERIFY_EXPIRED':
          return { type: 'VERIFY_EXPIRED', email: data?.email };

        case 'VERIFY_INVALID':
          return { type: 'VERIFY_INVALID', email: data?.email };

        default:
          return null;
      }
    } catch {
      return null;
    }
  }









  /** === GOOGLE OAUTH ===
   * Opens popup to /v1/auth/google, waits for postMessage from backend,
   * then persists token+user.
   */





  logout() {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  isLoggedIn() {
    return !!this.token();
  }

  isAdmin() {
    return this.user()?.role === 'admin';
  }


  waitForOAuthMessage(popup: Window): Promise<void> {
    return new Promise((resolve, reject) => {
      const onMessage = (ev: MessageEvent) => {
        if (ev.origin !== this.CLIENT_ORIGIN) return; // we redirected popup to 4200, so origin is 4200
        let data = ev.data as LoginResp;

        if (!data || !data.token || !data.user) return;

        this.applyLogin({token: data.token, user: data.user});
        cleanup();
        resolve();
      };

      const t = setTimeout(() => {
        cleanup();
        reject(new Error('Temps dépassé lors de la connexion.'));
      }, 60_000);

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(t);
        try {
          popup.close();
        } catch {
        }
      };

      window.addEventListener('message', onMessage);
    });
  }

  /** Persist + signal update */
  private applyLogin(res: { token: string; user: User }) {
    this.token.set(res.token);
    this.user.set(res.user);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
  }

  openOAuthPopup(url: string): Window {
    // Optional: append state
    const state = crypto.getRandomValues(new Uint32Array(4)).join('-');
    const u = `${url}?state=${encodeURIComponent(state)}`;

    const w = 520, h = 620;
    const y = window.top!.outerHeight / 2 + window.top!.screenY - (h / 2);
    const x = window.top!.outerWidth / 2 + window.top!.screenX - (w / 2);
    const popup = window.open(
      u,
      'oauth_popup',
      `width=${w},height=${h},left=${x},top=${y},resizable=no,scrollbars=yes,status=no`
    );
    if (!popup) throw new Error('Popup bloquée par le navigateur.');
    return popup;
  }

}
