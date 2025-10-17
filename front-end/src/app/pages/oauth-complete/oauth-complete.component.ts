// src/app/pages/oauth-complete/oauth-complete.component.ts
import { Component, OnInit, inject, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

type User = { id: string; email?: string; name?: string; isVerified?: boolean; active?: boolean; avatar?: string; role?: 'user'|'admin' };
type OauthPayload = { type: 'OAUTH_RESULT'; token: string; user: User; state?: string };
type LoginResp   = { token: string; user: User };

@Component({
  standalone: true,
  selector: 'app-oauth-complete',
  template: `<div style="display:grid;place-items:center;height:100dvh">Connexion en cours…</div>`
})
export class OauthCompleteComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private auth   = inject(AuthService);
  private zone   = inject(NgZone);

  ngOnInit(): void {
    try {
      const dataParam = this.route.snapshot.queryParamMap.get('data');
      const hashMatch = (window.location.hash || '').match(/(?:^|#|&)data=([^&]+)/);
      const b64url = dataParam || (hashMatch ? hashMatch[1] : null);
      if (!b64url) throw new Error('Missing payload');

      const json = this.b64urlDecode(b64url);
      const payload: OauthPayload = JSON.parse(json);
      if (!payload || payload.type !== 'OAUTH_RESULT' || !payload.token || !payload.user) {
        throw new Error('Bad payload');
      }

      this.zone.run(() => {
        const res: LoginResp = { token: payload.token, user: payload.user };
        // update local state (handy if this tab navigates)
        this.auth.applyLogin(res);

        // 🔊 1) postMessage (to the opener)
        try { window.opener?.postMessage(payload, '*'); } catch {}

        // 🔊 2) localStorage signal (fires “storage” in the opener)
        try { localStorage.setItem('oauth_result', JSON.stringify(payload)); } catch {}

        // 🔊 3) BroadcastChannel
        try {
          const bc = new BroadcastChannel('auth');
          bc.postMessage(payload);
          bc.close();
        } catch {}

        // 🧹 try to close the popup (multiple fallbacks)
        setTimeout(() => {
          try { window.close(); } catch {}
          try { window.opener && window.open('', '_self')?.close(); } catch {}
          // If still not closed and it’s not a popup, navigate home
          if (!window.opener) this.router.navigateByUrl('/');
        }, 60);

      });

    } catch (e) {
      console.error('OAuth complete error:', e);
      this.router.navigateByUrl('/');
    }
  }

  private b64urlDecode(s: string): string {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    return atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
  }
}
