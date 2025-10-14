// src/app/admin/products/admin-product-add.component.ts
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from '../../../services/product/product.service';
import { AuthService } from '../../../services/auth/auth.service';
import { AdminProductPayload} from '../../../interfaces/AdminProductPayload';

@Component({
  standalone: true,
  selector: 'app-admin-product-add',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './admin-product-add.component.html',
  styleUrls: ['./admin-product-add.component.css']
})
export class AdminProductAddComponent {
  private fb = inject(FormBuilder);
  private api = inject(ProductService);
  private router = inject(Router);
  auth = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);
  ok = signal(false);

  form = this.fb.group({
    name:    ['', [Validators.required, Validators.minLength(2)]],
    slug:    ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    price:   [0,  [Validators.required, Validators.min(0)]],
    brand:   [''],
    imageUrl:[''],
    oldPrice:[null],
    inStock: [true],
    shortSpecs: [''] // textarea, séparées par saut de ligne
  });

  async submit() {
    if (this.form.invalid) return;
    this.error.set(null); this.ok.set(false); this.loading.set(true);
    try {
      const v = this.form.value;
      const payload: AdminProductPayload = {
        name: v.name!, slug: v.slug!, price: Number(v.price!),
        brand: v.brand || undefined,
        imageUrl: v.imageUrl || undefined,
        oldPrice: v.oldPrice != null ? Number(v.oldPrice) : undefined,
        inStock: !!v.inStock,
        shortSpecs: (v.shortSpecs || '')
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean)
      };
      await this.api.createAdmin(payload).toPromise();
      this.ok.set(true);
      // reset sauf inStock
      this.form.reset({ inStock: true, price: 0 });
    } catch (e: any) {
      this.error.set(e?.error?.error || 'Erreur serveur');
    } finally {
      this.loading.set(false);
    }
  }
}
