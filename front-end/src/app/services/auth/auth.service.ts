// src/app/services/auth/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type User = {
  id: string; _id?: string; email?: string; phone?: string; address?: string;
  name?: string; isVerified?: boolean; active?: boolean; avatar?: string;
  role?: 'user' | 'admin'; providers?: any; createdAt?: string; ordersCount?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  user  = signal<User | null>(null);
  ready = signal(false);

  private _readyPromise!: Promise<void>;

  constructor() {
    // 1) UX instantanée (si cookie user signé présent)
    const cookieUser = this.readSignedUserCookie();
    if (cookieUser) this.user.set(cookieUser);

    // 2) Séquence d’initialisation bloquante
    this._readyPromise = (async () => {
      await this.handleAuthHash();     // si #data=... (oauth/verify) → cookies déjà posés par le back
      await this.hydrateFromServer();  // source de vérité
      this.ready.set(true);
    })();
  }

  whenReady(): Promise<void> { return this._readyPromise; }

  // === OAuth helpers (inchangés) ===
  startGoogleLogin(returnTo: string = window.location.origin) {
    const url = `${environment.api_Url || ''}/auth/google/start?r=${encodeURIComponent(returnTo)}`;
    window.location.href = url;
  }
  loginWithFacebook() {
    const r = window.location.origin;
    window.location.href = `${environment.api_Url || ''}/auth/facebook/start?r=${encodeURIComponent(r)}`;
  }

  async login(email: string, password: string,captchaToken: string) {
    const res = await this.http.post<{ token: string; user: User }>(
      `/auth/login`, { email, password ,captchaToken}, { withCredentials: true }
    ).toPromise();
    if (!res) throw new Error('Réponse vide');
    if (!res.user.isVerified) throw new Error('Email non vérifié.');
    if (!res.user.active) throw new Error('Compte bloqué.');
    this.user.set(res.user);
    return true;
  }

  async register(payload: { name: string; email: string; password: string; phone?: string; address?: string },captchaToken: string) {
    const res = await this.http.post<{ token: string; user: User }>(
      `/auth/register`, { ...payload, captchaToken },{ withCredentials: true }
    ).toPromise();
    if (res?.user) this.user.set(res.user);
    return !!res?.user;
  }

  async handleAuthHash(): Promise<{ type?: string, email?: string } | null> {
    const hash = window.location.hash || '';
    const m = hash.match(/#data=([^&]+)/) || hash.match(/#oauth=([^&]+)/);
    if (!m) return null;

    history.replaceState({}, document.title, window.location.pathname + window.location.search);

    try {
      const json = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(json);
      // Après OAuth/verify, le back a posé les cookies → on n’essaie pas de lire un token ici
      return { type: data?.type, email: data?.email };
    } catch {
      return null;
    }
  }

  async hydrateFromServer(): Promise<void> {
    try {
      const res = await this.http.get<any>(`/auth/me`, { withCredentials: true }).toPromise();
      // Tolérant au format: soit l’objet user direct, soit { user: ... }
      const me = (res && res.email) ? res : res?.user;
      this.user.set(me || null);
    } catch {
      this.user.set(null);
    }
  }

  logout() {
    this.http.post(`/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => this.user.set(null),
      error:    () => this.user.set(null)
    });
  }

  forceLocalLogout() {
    this.user.set(null);
    try {
      document.cookie = 'auth_user=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = 'access_token=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = 'refresh_token=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = 'csrf_token=; Max-Age=0; Path=/; SameSite=Lax';
    } catch {}
  }

  isLoggedIn() { return !!this.user(); }
  isAdmin()    { return this.user()?.role === 'admin'; }

  async updateProfile(patch: Partial<User>) {
    const res = await this.http.patch<User>(`/auth/me`, patch, { withCredentials: true }).toPromise();
    if (!res) throw new Error('Réponse vide');
    this.user.set(res);
  }

  // -------- helpers cookie (UX instantanée) ----------
  private getCookie(name: string): string | null {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  private readSignedUserCookie(): User | null {
    const raw = this.getCookie('auth_user');
    if (!raw) return null;
    const [payload] = raw.split('.');
    if (!payload) return null;
    try { return JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))) as User; }
    catch { return null; }
  }
  async forgotPassword(email: string,captchaToken: string) {
    await this.http.post(`/auth/forgot/password`, { email ,captchaToken}).toPromise();
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.http.post<{ ok: boolean }>(`/auth/reset`, { token, password }).toPromise();
  }

  async resendVerification(email: string): Promise<void> {
    await this.http.post(`/auth/resend-verification`, { email }).toPromise();
  }
}
