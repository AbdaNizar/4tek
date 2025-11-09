import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  f = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(){
    this.loading.set(true); this.error.set(null);
    try{
      const ok = await this.auth.login(this.f.value.email!, this.f.value.password!,'');
      if (ok) this.router.navigateByUrl('/admin');
      else this.error.set('Identifiants invalides');
    } catch(e:any){
      this.error.set(e?.error?.error || 'Erreur');
    } finally {
      this.loading.set(false);
    }
  }
}
