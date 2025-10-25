import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../services/contact/contact.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit {
  private fb    = inject(FormBuilder);
  private api   = inject(ContactService);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);

  sending = signal(false);
  ok      = signal(false);
  err     = signal<string | null>(null);

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email:    ['', [Validators.required, Validators.email]],
    phone:    ['',[Validators.required ,Validators.minLength(8), Validators.maxLength(13)]],
    message:  ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    website:  [''] // honeypot
  });

  ngOnInit(): void {
    // Autofill si connecté + réagit aux changements

      const u = this.auth.user();
      if (u) {
        this.form.patchValue({
          fullName: u.name || '',
          email: u.email || '',
          phone: u?.phone || '',
        }, { emitEvent: false });
      }

  }

  showError(ctrl: string) {
    const c = this.form.get(ctrl);
    return c?.invalid && (c.dirty || c.touched);
  }

  async submit() {
    this.err.set(null);
    this.ok.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    try {
      const payload = this.form.getRawValue();
      if (!this.auth.user()){
        await this.api.send(payload).toPromise();

      }else {
        await this.api.sendConectedUser(payload).toPromise();
      }
      this.ok.set(true);
      this.toast.show('Message envoyé. Merci !', 'success');
      this.form.patchValue({ message: '' }); // on garde les coordonnées autofill
    } catch (e: any) {
      this.err.set(e?.error?.error || 'Une erreur est survenue.');
      this.toast.show('Échec de l’envoi', 'error');
    } finally {
      this.sending.set(false);
    }
  }
}
