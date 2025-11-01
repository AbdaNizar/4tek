import {
  Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal
} from '@angular/core';
import {CommonModule, NgIf} from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidatorFn,
  ValidationErrors
} from '@angular/forms';
import {Router, ActivatedRoute, NavigationEnd, RouterLink} from '@angular/router';
import {filter, Subscription} from 'rxjs';
import {AuthService} from '../../../../services/auth/auth.service';
import {ToastService} from '../../../../services/toast/toast.service';
import {environment} from '../../../../../environments/environment';
import {AuthModalService, Mode} from '../../../../services/authModal/auth-modal.service';


function matchOther(otherKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) return null;
    const other = parent.get(otherKey);
    if (!other) return null;
    return control.value === other.value ? null : {mismatch: true};
  };
}

@Component({
  standalone: true,
  selector: 'app-header-user',
  imports: [CommonModule, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './header-user.component.html',
  styleUrls: ['./header-user.component.css']
})
export class HeaderUserComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  protected auth = inject(AuthService);
  private host = inject(ElementRef<HTMLElement>);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private authModal = inject(AuthModalService);
  private modalSub?: Subscription;

  hasAvatar = signal(true);
  open = signal(false);
  mode = signal<Mode>('login');
  loading = signal(false);
  userMenuOpen = signal(false);
  err = signal<string | undefined>(undefined);
  okMsg = signal<string | undefined>(undefined);

  // token pour /reset-password/:token
  private resetToken = signal<string | null>(null);

  // focus
  @ViewChild('firstField') firstField?: ElementRef<HTMLInputElement>;
  private focusables: HTMLElement[] = [];
  private navSub?: Subscription;

  // body scroll lock
  private scrollY = 0;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', []],
    confirm: ['', []],
    name: ['', []],
    phone: ['', []],
    address: ['', []],
  });

  async ngOnInit() {
    this.modalSub = this.authModal.open$.subscribe(opts => {
      // mode demandé ?
      if (opts.mode) this.mode.set(opts.mode);

      // reset des messages
      this.err.set(undefined);
      this.okMsg.set(undefined);

      // préremplissage éventuel
      if (opts.patch) this.form.patchValue(opts.patch, { emitEvent: false });

      // ouvre si pas déjà ouvert
      if (!this.open()) {
        this.open.set(true);
        this.lockBody();
      }

      // autofocus ?
      queueMicrotask(() => {
        this.collectFocusables();
        if (opts.autofocus !== false) this.firstField?.nativeElement?.focus();
      });

      // ajuster les validateurs au mode
      this.setupValidatorsForMode();
    });

    // auto open modal en mode reset quand on visite /reset-password/:token
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const token = this.findResetToken(this.route);
        if (token) {
          this.resetToken.set(token);
          this.mode.set('reset');
          this.err.set(undefined);
          this.okMsg.set(undefined);
          this.setupValidatorsForMode();
          this.form.patchValue({password: '', confirm: ''}, {emitEvent: false});
          this.open.set(true);
          this.lockBody();
          queueMicrotask(() => this.firstField?.nativeElement?.focus());
        }
      });
    const result = await this.auth.handleAuthHash();
    if (!result) return;
    if (result.type === 'VERIFY_OK') {
      this.toast?.show('Compte vérifié et connecté ', 'success');
      this.open.set(false);
      document.body.style.overflow = '';
      return;
    }
    if (result.type === 'EMAIL_VALID') {
      this.toast?.show('Compte et vérifié connecté-vous', 'success');
      this.mode.set('login');
      this.err.set(undefined);
      this.okMsg.set(undefined);
      this.setupValidatorsForMode();
      this.open.set(true);
      document.body.style.overflow = 'hidden';
      return;
    }

    if (result.type === 'VERIFY_EXPIRED') {
      this.switchMode('verify-email');
      this.open.set(true);
      this.form.patchValue({email: result.email || ''});
      this.okMsg.set(undefined);
      this.err.set('Le lien d’activation a expiré. Renvoyez un nouveau lien 👇');
      document.body.style.overflow = 'hidden';
      return;
    }

    if (result.type === 'VERIFY_INVALID') {
      this.switchMode('verify-email');
      this.open.set(true);
      this.form.patchValue({email: result.email || ''});
      this.okMsg.set(undefined);
      this.err.set('Lien invalide. Vous pouvez demander un nouveau lien 👇');
      document.body.style.overflow = 'hidden';
      return;
    }

  }

  ngOnDestroy() {
    this.modalSub?.unsubscribe();
    this.navSub?.unsubscribe();
    if (this.open()) this.unlockBody();
  }

  // --------- helpers route
  private findResetToken(node: ActivatedRoute | null): string | null {
    while (node) {
      const segs = node.snapshot.url.map(s => s.path);
      if (segs[0] === 'reset-password' && node.snapshot.params['token']) {
        return node.snapshot.params['token'];
      }
      node = node.firstChild!;
    }
    return null;
  }

  // --------- état user
  isLoggedIn() {
    return this.auth.isLoggedIn();
  }

  user() {
    return this.auth.user();
  }

  shortName() {
    const u = this.user();
    if (!u) return '';
    if (u.name) return u.name;
    return (u.email || '').split('@')[0];
  }

  onAvatarError() {
    this.hasAvatar.set(false);
  }

  avatarUrlSafe(): string | null {
    const raw = this.auth.user()?.avatar ?? null;
    if (!raw || typeof raw !== 'string') return null;

    // strip accidental quotes/whitespace
    let clean = raw.trim().replace(/^"+|"+$/g, '');

    // (Optional) normalize Google size to 64px circle
    clean = clean.replace(/=s\d+(-c)?$/, '=s64-c');

    return clean || null;
  }

  // --------- menu user
  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
  }

  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.userMenuOpen()) return;
    const inside = this.host.nativeElement.contains(ev.target as Node);
    if (!inside) this.closeUserMenu();
  }

  // --------- modal
  toggleModal() {
    const next = !this.open();
    this.open.set(next);
    if (next) {
      // par défaut en login
      if (this.mode() !== 'register' && this.mode() !== 'forgot' && this.mode() !== 'reset') {
        this.mode.set('login');
      }
      this.err.set(undefined);
      this.okMsg.set(undefined);
      const u = this.auth.user();
      if (u?.email) this.form.patchValue({email: u.email});
      this.lockBody();
      queueMicrotask(() => {
        this.collectFocusables();
        this.firstField?.nativeElement?.focus();
      });
    } else {
      this.unlockBody();
      // si on fermait en étant en reset, on nettoie l’URL
      if (this.resetToken()) {
        this.setupValidatorsForMode();
        this.resetToken.set(null);
        this.router.navigateByUrl('/', {replaceUrl: true});
      }
    }
  }

  switchMode(m: Mode) {
    this.mode.set(m);
    this.err.set(undefined);
    this.okMsg.set(undefined);
    this.setupValidatorsForMode();
    queueMicrotask(() => {
      this.collectFocusables();
      this.firstField?.nativeElement?.focus();
    });
  }

  startForgot(prefillEmail?: string) {
    this.err.set(undefined);
    this.okMsg.set(undefined);
    if (!this.open()) this.toggleModal();
    this.mode.set('forgot');
    if (prefillEmail) this.form.patchValue({email: prefillEmail});
    this.setupValidatorsForMode();
    this.closeUserMenu()
  }
  goToOrder() {
    this.router.navigateByUrl('/mes-commandes', {replaceUrl: true});
    this.closeUserMenu()
  }
  goToDashboard() {
    this.router.navigateByUrl('/admin', {replaceUrl: true});
    this.closeUserMenu()
  }

  // --------- validators par mode
  private setupValidatorsForMode() {
    const m = this.mode();
    const set = (name: string, validators: any[]) => {
      const c = this.form.get(name);
      if (!c) return;
      c.clearValidators();
      c.setValidators(validators);
      c.updateValueAndValidity({emitEvent: false});
    };

    if (m === 'login') {
      set('email', [Validators.required, Validators.email]);
      set('password', [Validators.required, Validators.minLength(6)]);
      set('confirm', []);
      set('name', []);
      set('phone', []);
      set('address', []);
    } else if (m === 'register') {
      set('email', [Validators.required, Validators.email]);
      set('password', [Validators.required, Validators.minLength(6)]);
      set('confirm', [Validators.required, matchOther('password')]);
      set('name', [Validators.required]);
      set('phone', [Validators.pattern(/^[0-9 +\-().]{6,20}$/)]);
      set('address', [Validators.minLength(4)]);
    } else if (m === 'forgot') {
      set('email', [Validators.required, Validators.email]);
      set('password', []);
      set('confirm', []);
      set('name', []);
      set('phone', []);
      set('address', []);
    } else if (m === 'reset') {
      set('email', []);
      set('password', [Validators.required, Validators.minLength(6)]);
      set('confirm', [Validators.required, matchOther('password')]);
      set('name', []);
      set('phone', []);
      set('address', []);
    } else {// verify-email
      set('email', [Validators.required, Validators.email]);
      set('password', []);
      set('confirm', []);
      set('name', []);
      set('phone', []);
      set('address', []);
    }
  }

  // --------- submit
  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.err.set('Veuillez remplir correctement le formulaire.');
      return;
    }

    this.err.set(undefined);
    this.okMsg.set(undefined);

    try {
      if (this.mode() === 'forgot') {
        const email = this.form.value.email!.trim();
        this.loading.set(true);
        await this.auth.forgotPassword(email);
        this.okMsg.set('Si un compte existe, un email de réinitialisation a été envoyé.');
        this.toast.show('Email envoyé', 'info');
        this.loading.set(false);
        return;
      }

      if (this.mode() === 'login') {
        const {email, password} = this.form.getRawValue();
        this.loading.set(true);
        const ok = await this.auth.login(email!, password!);
        this.loading.set(false);
        if (ok) {
          this.open.set(false);
          this.unlockBody();
          this.toast.show('Connecté', 'info');
        } else this.err.set('Identifiants invalides.');
        return;
      }

      if (this.mode() === 'register') {
        const v = this.form.getRawValue();
        if (v.password !== v.confirm) {
          this.err.set('Les mots de passe ne correspondent pas.');
          return;
        }
        this.loading.set(true);
        await this.auth.register({
          email: v.email!, password: v.password!,
          name: v.name || '', phone: v.phone || '', address: v.address || ''
        });
        this.loading.set(false);
        this.okMsg.set('Compte créé. Vérifie ta boîte mail si la vérification est requise.');
        this.toast.show('Compte créé', 'success');
        setTimeout(() => {
          this.open.set(false);
          this.mode.set('login')
          this.unlockBody();
          this.setupValidatorsForMode()

        }, 3000);
        return;
      }

      if (this.mode() === 'reset') {
        const token = this.resetToken();
        if (!token) {
          this.err.set('Lien invalide.');
          return;
        }
        const {password, confirm} = this.form.getRawValue();
        if (password !== confirm) {
          this.err.set('Les mots de passe ne correspondent pas.');
          return;
        }

        this.loading.set(true);
        await this.auth.resetPassword(token, password!);
        this.loading.set(false);
        this.toast.show('Mot de passe changé', 'success');
        this.open.set(false);
        this.unlockBody();
        // Nettoie l’URL et repasse en login
        this.resetToken.set(null);
        this.router.navigateByUrl('/', {replaceUrl: true});
        this.mode.set('login');
        return;
      }

      if (this.mode() === 'verify-email') {
        const email = this.form.value.email?.trim();
        if (!email) {
          this.err.set('Email requis.');
          return;
        }
        this.loading.set(true);
        await this.auth.resendVerification(email);
        this.loading.set(false);
        this.okMsg.set('Un nouveau lien de vérification a été envoyé. Vérifie ta boîte mail.');
        setTimeout(() => {
          this.open.set(false);
          this.unlockBody();
        }, 3000);
        return;
      }
    } catch (e: any) {
      this.loading.set(false);
      this.err.set(e?.error?.error || e?.message || 'Action impossible.');
    }
  }

  logout() {
    this.auth.logout();
    this.open.set(false);
    this.unlockBody();
    this.mode.set('login');
    this.toast.show('Déconnecté', 'info');
    this.closeUserMenu();
  }

  // --------- body scroll lock
  private lockBody() {
    this.scrollY = window.scrollY || 0;
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  private unlockBody() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, this.scrollY);
  }

  // --------- focus trap
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (!this.open()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.open.set(false);
      this.unlockBody();
      return;
    }
    if (e.key !== 'Tab') return;

    if (this.focusables.length === 0) return;
    const first = this.focusables[0];
    const last = this.focusables[this.focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || !active) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  private collectFocusables() {
    const panel = this.host.nativeElement.querySelector('.modal-panel') as HTMLElement | null;
    this.focusables = panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
      : [];
  }

  // Google
  async loginWithGoogle() {
    this.open.set(false);
    this.unlockBody();
    try {
      this.auth.openOAuthPopup(`${environment.api_Url}/auth/google`);

    } catch (e) {
      this.toast.show('Connexion Google annulée/échouée ❌', 'error');
    }
  }




}
