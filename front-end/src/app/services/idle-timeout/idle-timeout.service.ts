// src/app/core/idle-timeout.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import Swal from 'sweetalert2';
import { AuthService } from '../auth/auth.service';
import { showAlert} from '../../shared/constant/function';

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  /** 15 minutes d’inactivité */
  private readonly INACTIVITY_MS = 15 * 60 * 1000; // 900_000
  /** Alerte 10s avant la déconnexion */
  private readonly WARNING_MS = 15 * 1000;         // 10_000

  private warnTimeoutId: any = null;
  private logoutTimeoutId: any = null;
  private countdownInterval: any = null;

  private readonly activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  private readonly onActivity = () => {
    if (Swal.isVisible()) return; // si popup ouverte, on laisse l’utilisateur décider
    this.resetTimer();
  };

  constructor(private auth: AuthService) {}

  init() {
    this.activityEvents.forEach(ev =>
      window.addEventListener(ev, this.onActivity, { passive: true })
    );
    this.resetTimer();
  }

  ngOnDestroy() {
    this.clearTimers();
    this.activityEvents.forEach(ev =>
      window.removeEventListener(ev, this.onActivity as any)
    );
    this.clearCountdown();
    Swal.close();
  }

  // --------------------------------

  private resetTimer() {
    this.clearTimers();
    // planifie l’alerte 10s avant la déconnexion
    this.warnTimeoutId = setTimeout(
      () => this.showWarning(),
      this.INACTIVITY_MS - this.WARNING_MS
    );
    // planifie la déconnexion à 15 min pile
    this.logoutTimeoutId = setTimeout(
      () => this.doLogout(),
      this.INACTIVITY_MS
    );
  }

  private clearTimers() {
    if (this.warnTimeoutId) { clearTimeout(this.warnTimeoutId); this.warnTimeoutId = null; }
    if (this.logoutTimeoutId) { clearTimeout(this.logoutTimeoutId); this.logoutTimeoutId = null; }
  }

  private showWarning() {
    const endAt = Date.now() + this.WARNING_MS;

    // annule le timer de logout pendant l’alerte
    if (this.logoutTimeoutId) { clearTimeout(this.logoutTimeoutId); this.logoutTimeoutId = null; }

    showAlert({
      icon: 'warning',
      title: 'Inactivité détectée',
      html: `
        <p>Vous serez déconnecté dans <b id="swal-timer">15</b>&nbsp;s.</p>
        <p><small>Cliquez sur <strong>Rester connecté</strong> pour continuer.</small></p>
      `,
      confirmButtonText: 'Rester connecté',
      cancelButtonText: 'Se déconnecter',
      showCancelButton: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      timer: this.WARNING_MS,
      timerProgressBar: true,

      didOpen: (container : any) => {
        const el = container?.querySelector('#swal-timer') as HTMLElement;
        this.clearCountdown();
        this.countdownInterval = setInterval(() => {
          const left = Math.max(0, endAt - Date.now());
          if (el) el.textContent = String(Math.ceil(left / 1000));
        }, 200);
      },
      willClose: () => {
        this.clearCountdown();
      },
    }).then(result => {
      if (result.isConfirmed) {
        // rester connecté → repartir sur 15 min
        Swal.close();
        this.resetTimer();
      } else {
        // cancel / close / timeout → logout
        this.doLogout();
      }
    });
  }

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private doLogout() {
    this.clearTimers();
    this.clearCountdown();
    Swal.close();
    this.auth.logout();
  }
}
