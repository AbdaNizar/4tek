import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-contact',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  sending = signal(false);
  ok = signal(false);
  err = signal('');

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(30)]],
    subject: ['', [Validators.required, Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    // Honeypot — doit rester vide :
    website: ['']
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if ((this.form.get('website')?.value || '').length > 0) {
      // bot → on fait comme si tout allait bien
      this.ok.set(true); this.err.set(''); return;
    }

    this.sending.set(true); this.ok.set(false); this.err.set('');
    try {
      await this.http.post('http://localhost:4000/api/contact', this.form.value, { responseType: 'json' }).toPromise();
      this.ok.set(true);
      this.form.reset();
    } catch (e: any) {
      this.err.set(e?.error?.error || 'Une erreur est survenue. Réessaie plus tard.');
    } finally {
      this.sending.set(false);
    }
  }

  // Helpers d’affichage d’erreurs
  showError(name: string) {
    const c = this.form.get(name);
    return !!(c && c.touched && c.invalid);
  }
}
