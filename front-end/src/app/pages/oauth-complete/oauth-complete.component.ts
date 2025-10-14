// src/app/pages/oauth-complete/oauth-complete.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

type OauthPayload = { type: 'OAUTH_RESULT'; token: string; user: any; state?: string };

@Component({
  standalone: true,
  selector: 'app-oauth-complete',
  template: `<div style="display:grid;place-items:center;height:100dvh">Connexion en cours…</div>`
})
export class OauthCompleteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth  = inject(AuthService);

  ngOnInit(): void {
    try {
      const dataParam = this.route.snapshot.queryParamMap.get('data'); // /#/oauth-complete?data=...
      const hashMatch = (window.location.hash || '').match(/(?:^|#|&)data=([^&]+)/); // /oauth-complete#data=...
      const b64url = dataParam || (hashMatch ? hashMatch[1] : null);

      if (!b64url) throw new Error('Missing payload');

      const jsonStr = this.base64UrlDecode(b64url);
      const payload: OauthPayload = JSON.parse(jsonStr);

      if (!payload || payload.type !== 'OAUTH_RESULT' || !payload.token || !payload.user) {
        throw new Error('Bad payload');
      }

      // Persist + update UI

      if ((this.auth as any).applyLogin) {
        (this.auth as any).applyLogin(payload);
        console.log('here')
      } else {
        console.log('here2')
        this.auth.user.set(payload.user);
        this.auth['token'].set(payload.token);
        localStorage.setItem('auth_token', payload.token);
        localStorage.setItem('auth_user', JSON.stringify(payload.user));

      }

      // If opened as a popup, notify opener then close
      try { window.opener?.postMessage(payload, window.location.origin); } catch {}
      setTimeout(() => { try { window.close(); } catch {} }, 60);

      // If not a popup (navigated main tab), go home
      if (!window.opener) this.router.navigateByUrl('/.');
    } catch (e) {
      console.error('OAuth complete error:', e);
      // Fallback: go home
      this.router.navigateByUrl('/');
    }
  }

  private base64UrlDecode(input: string): string {
    // convert base64url -> base64
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    // pad with '=' if needed
    const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
    const padded = b64 + '='.repeat(pad);
    return atob(padded);
  }
}
