import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../../services/category/category.service';

@Component({
  selector: 'app-admin-category-add',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './admin-category-add.component.html',
  styleUrls: ['./admin-category-add.component.css']
})
export class AdminCategoryAddComponent {
  private fb = new FormBuilder();
  private api = new CategoryService();

  // === Signals état ===
  loading = signal(false);
  err = signal<string | null>(null);
  ok = signal<string | null>(null);

  // === Prévisualisation images ===
  preview = {
    imageUrl: signal<string>(''),
    iconUrl: signal<string>(''),
    bannerUrl: signal<string>(''),
  };

  imageFile?: File;
  iconFile?: File;
  bannerFile?: File;

  // === Formulaire ===
  form = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    description: [''],
    sortOrder: [0],
    isActive: [true],
    metaTitle: [''],
    metaDescription: [''],
    metaKeywords: [''],
  });

  touchedSlug = false;

  // Générer slug auto
  genSlug() {
    if (!this.touchedSlug) {
      const val = this.form.value.name || '';
      this.form.patchValue({
        slug: val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      });
    }
  }

  onSlugInput() {
    this.touchedSlug = true;
  }

  // Gestion fichiers upload
  onPickFile(e: Event, kind: 'image'|'icon'|'banner') {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    if (kind === 'image') { this.imageFile = file; this.preview.imageUrl.set(url); }
    if (kind === 'icon') { this.iconFile = file; this.preview.iconUrl.set(url); }
    if (kind === 'banner') { this.bannerFile = file; this.preview.bannerUrl.set(url); }
  }

  // Soumission
  async submit() {
    if (this.form.invalid) {
      this.err.set('Veuillez remplir les champs obligatoires.');
      return;
    }

    this.loading.set(true);
    this.err.set(null);
    this.ok.set(null);

    try {
      const v = this.form.value;
      const fd = new FormData();

      fd.append('name', v.name!);
      fd.append('slug', v.slug!);
      if (v.description) fd.append('description', v.description);
      fd.append('sortOrder', String(v.sortOrder ?? 0));
      fd.append('isActive', String(!!v.isActive));
      if (v.metaTitle) fd.append('metaTitle', v.metaTitle);
      if (v.metaDescription) fd.append('metaDescription', v.metaDescription);
      if (v.metaKeywords) fd.append('metaKeywords', v.metaKeywords);

      if (this.imageFile)  fd.append('image', this.imageFile);
      if (this.iconFile)   fd.append('icon', this.iconFile);
      if (this.bannerFile) fd.append('banner', this.bannerFile);

      // const res = await this.api.createMultipart(fd).toPromise();
      // this.ok.set(`✅ Catégorie « ${res?.name} » ajoutée avec succès`);

      // Reset form
      this.form.reset({ sortOrder: 0, isActive: true });
      this.imageFile = this.iconFile = this.bannerFile = undefined;
      this.preview.imageUrl.set('');
      this.preview.iconUrl.set('');
      this.preview.bannerUrl.set('');
      this.touchedSlug = false;
    } catch (e: any) {
      this.err.set(e?.error?.error || 'Erreur serveur');
    } finally {
      this.loading.set(false);
    }
  }
}
