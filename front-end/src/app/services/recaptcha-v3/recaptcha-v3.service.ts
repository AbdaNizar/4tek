import { Injectable } from '@angular/core';
import { environment} from '../../../environments/environment';

declare global {
  interface Window {
    grecaptcha?: {
      ready(cb: () => void): void;
      execute(siteKey: string, opts: { action: string }): Promise<string>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RecaptchaV3Service {
  private loaded = false;
  private loadPromise?: Promise<void>;
  private siteKey = environment.recaptchaV3SiteKey;

  private loadScript(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      // render=explicit non requis pour v3; ici on auto-render par execute()
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(this.siteKey)}`;
      s.async = true;
      s.defer = true;
      s.onload = () => {
        this.loaded = true;
        resolve();
      };
      s.onerror = () => reject(new Error('Failed to load reCAPTCHA v3 script'));
      document.head.appendChild(s);
    });
    return this.loadPromise;
  }

  /** Récupère un token pour l'action demandée (ex: 'login', 'register', 'forgot'). */
  async getToken(action: string): Promise<string> {
    await this.loadScript();
    if (!window.grecaptcha) throw new Error('reCAPTCHA not available');
    await new Promise<void>(res => window.grecaptcha!.ready(() => res()));
    return window.grecaptcha!.execute(this.siteKey, { action });
  }
}
