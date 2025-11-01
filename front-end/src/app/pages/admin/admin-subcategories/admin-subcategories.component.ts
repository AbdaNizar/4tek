import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { Router } from '@angular/router';
import { SubcategoryService } from '../../../services/subcategory/subcategory.service';
import { CategoryService } from '../../../services/category/category.service';

import { SubCategory } from '../../../interfaces/SubCategory';
import { Category } from '../../../interfaces/category';
import { getUrl } from '../../../shared/constant/function';

// ⚠️ adapte le chemin si besoin
import { showAlert} from '../../../shared/constant/function';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  standalone: true,
  selector: 'app-admin-subcategories',
  imports: [CommonModule, NgIf, NgFor, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './admin-subcategories.component.html',
  styleUrls: ['./admin-subcategories.component.css']
})
export class AdminSubcategoriesComponent implements OnInit {
  private api = inject(SubcategoryService);
  private apiCat = inject(CategoryService);
  private fb  = inject(FormBuilder);
  private router = inject(Router);

  // data
  loading = signal(true);
  parents = signal<Category[]>([]);
  raw = signal<SubCategory[]>([]);

  // filters
  q = signal<string>('');
  status = signal<StatusFilter>('all');

  // modals
  modalOpen = signal(false);
  replaceOpen = signal(false);
  editing = signal<SubCategory | null>(null);

  // loaders ciblés par action
  actionKind = signal<'create' | 'update' | 'toggle' | 'remove' | 'replace' | null>(null);
  actionId   = signal<string | null>(null);
  get busy() { return this.actionKind() !== null; }

  // form
  f = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    description: [''],
    isActive: [true],
    parentId: [null as string | null, [Validators.required]]
  });

  // uploads (create/edit simple)
  imageFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  iconFile = signal<File | null>(null);
  iconPreview = signal<string | null>(null);
  bannerFiles = signal<File[]>([]);
  bannerPreviews = signal<string[]>([]);

  // replace modal flags
  iconChanged = signal(false);
  imageChanged = signal(false);
  bannersChanged = signal(false);

  // computed list
  list = computed(() => {
    const text = this.q().trim().toLowerCase();
    const st = this.status();
    return this.raw().filter(s => {
      const parentName = typeof s.parent === 'string' ? '' : (s.parent?.name || '');
      const matchText =
        !text ||
        s.name.toLowerCase().includes(text) ||
        s.slug.toLowerCase().includes(text) ||
        (s.description || '').toLowerCase().includes(text) ||
        parentName.toLowerCase().includes(text);

      const matchStatus =
        st === 'all' ||
        (st === 'active' && s.isActive) ||
        (st === 'inactive' && !s.isActive);

      return matchText && matchStatus;
    });
  });

  async ngOnInit() {
    await Promise.all([this.fetchParents(), this.fetch()]);
  }

  // -------- fetchers --------
  async fetchParents() {
    try {
      const data = await this.apiCat.list().toPromise();
      this.parents.set(data || []);
    } catch { /* noop */ }
  }

  async fetch() {
    this.loading.set(true);
    try {
      const data = await this.api.list().toPromise();
      this.raw.set(data || []);
    } finally {
      this.loading.set(false);
    }
  }

  // -------- nav --------
  goDetail(s: SubCategory) {
    this.router.navigate(['/admin/sous-categories', s._id]);
  }

  // -------- modals --------
  openCreate() {
    this.editing.set(null);
    this.f.reset({ name: '', slug: '', description: '', isActive: true, parentId: null });

    this.imageFile.set(null); this.imagePreview.set(null);
    this.iconFile.set(null);  this.iconPreview.set(null);
    this.bannerFiles.set([]); this.bannerPreviews.set([]);
    this.modalOpen.set(true);
    document.body.classList.add('modal-open');
  }

  openEdit(s: SubCategory) {
    this.editing.set(s);
    this.f.reset({
      name: s.name,
      slug: s.slug,
      description: s.description || '',
      isActive: s.isActive,
      parentId: (typeof s.parent === 'string' ? s.parent : s.parent?._id) || null
    });

    // montrer l’état actuel (en création les previews ne s’affichent que si on choisit un fichier)
    this.imageFile.set(null); this.imagePreview.set(s.imageUrl ? getUrl(s.imageUrl) : null);
    this.iconFile.set(null);  this.iconPreview.set(s.iconUrl ? getUrl(s.iconUrl) : null);
    this.bannerFiles.set([]); this.bannerPreviews.set((s.banners || []).map(getUrl));

    this.modalOpen.set(true);
    document.body.classList.add('modal-open');
  }

  closeModal() {
    this.modalOpen.set(false);
    document.body.classList.remove('modal-open');
  }

  // -------- files (create/edit simple) --------
  onPickImage(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0] || null;
    this.imageFile.set(file);
    this.imagePreview.set(file ? URL.createObjectURL(file) : null);
  }
  clearImage() { this.imageFile.set(null); this.imagePreview.set(null); }

  onPickIcon(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0] || null;
    this.iconFile.set(file);
    this.iconPreview.set(file ? URL.createObjectURL(file) : null);
  }
  clearIcon() { this.iconFile.set(null); this.iconPreview.set(null); }

  onPickBanners(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    if (!files.length) return;
    this.bannerFiles.set([...this.bannerFiles(), ...files]);
    this.bannerPreviews.set([...this.bannerPreviews(), ...files.map(f => URL.createObjectURL(f))]);
    (ev.target as HTMLInputElement).value = '';
  }
  removeBannerAt(i: number) {
    const nf = [...this.bannerFiles()];
    const np = [...this.bannerPreviews()];
    nf.splice(i, 1); np.splice(i, 1);
    this.bannerFiles.set(nf); this.bannerPreviews.set(np);
  }

  // -------- save create/update --------
  async save() {
    if (this.f.invalid) {
      this.f.markAllAsTouched();
      await showAlert({ icon: 'warning', title: 'Vérifiez les champs obligatoires.' });
      return;
    }

    const v = this.f.value;
    const isCreate = !this.editing();

    const ask = await showAlert({
      icon: 'question',
      title: isCreate ? 'Créer cette sous-catégorie ?' : 'Enregistrer les modifications ?',
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    const fd = new FormData();
    fd.append('name', v.name!);
    fd.append('slug', v.slug!);
    fd.append('description', v.description || '');
    fd.append('isActive', String(!!v.isActive));
    if (v.parentId) fd.append('parentId', v.parentId);

    // En création, on envoie les fichiers
    if (isCreate) {
      if (this.imageFile()) fd.append('image', this.imageFile()!);
      if (this.iconFile())  fd.append('icon',  this.iconFile()!);
      this.bannerFiles().forEach(f => fd.append('banners', f));
    }

    try {
      this.actionKind.set(isCreate ? 'create' : 'update');
      this.actionId.set(this.editing()?._id || null);

      if (isCreate) {
        const created = await this.api.create(fd).toPromise();
        if (created) this.raw.set([created, ...this.raw()]);
      } else {
        const updated = await this.api.update(this.editing()!._id, fd).toPromise();
        if (updated) this.raw.set(this.raw().map(x => x._id === updated._id ? updated : x));
      }

      this.closeModal();
      await showAlert({ icon: 'success', title: 'Enregistré avec succès', timer: 1200, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Erreur', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // -------- toggle / remove --------
  async toggle(s: SubCategory) {
    const ask = await showAlert({
      icon: 'question',
      title: s.isActive ? 'Désactiver cette sous-catégorie ?' : 'Activer cette sous-catégorie ?',
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    try {
      this.actionKind.set('toggle');
      this.actionId.set(s._id);

      const updated = await this.api.toggle(s._id, !s.isActive).toPromise();
      if (updated) this.raw.set(this.raw().map(x => x._id === s._id ? updated : x));

      await showAlert({ icon: 'success', title: 'Statut mis à jour', timer: 1000, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Échec de mise à jour', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  async remove(s: SubCategory) {
    const ask = await showAlert({
      icon: 'warning',
      title: `Supprimer « ${s.name} » ?`,
      html: 'Cette action est irréversible.',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#ef4444',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    try {
      this.actionKind.set('remove');
      this.actionId.set(s._id);

      await this.api.remove(s._id).toPromise();
      this.raw.set(this.raw().filter(x => x._id !== s._id));

      await showAlert({ icon: 'success', title: 'Sous-catégorie supprimée', timer: 1000, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Échec de suppression', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // -------- replace modal --------
  openReplace(s: SubCategory) {
    this.editing.set(s);
    this.iconChanged.set(false);
    this.imageChanged.set(false);
    this.bannersChanged.set(false);

    // reset des sélections temporaires
    this.iconFile.set(null);
    this.imageFile.set(null);
    this.bannerFiles.set([]);
    this.bannerPreviews.set([]);
    this.iconPreview.set(null);
    this.imagePreview.set(null);

    this.replaceOpen.set(true);
    document.body.classList.add('modal-open');
  }
  closeReplace() {
    this.replaceOpen.set(false);
    document.body.classList.remove('modal-open');
  }

  onPickIconReplace(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0] || null;
    this.iconFile.set(file);
    this.iconPreview.set(file ? URL.createObjectURL(file) : null);
    this.iconChanged.set(!!file);
  }
  resetIconSelection() {
    this.iconFile.set(null);
    this.iconPreview.set(null);
    this.iconChanged.set(false);
  }

  onPickImageReplace(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0] || null;
    this.imageFile.set(file);
    this.imagePreview.set(file ? URL.createObjectURL(file) : null);
    this.imageChanged.set(!!file);
  }
  resetImageSelection() {
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.imageChanged.set(false);
  }

  onPickBannersReplace(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    this.bannerFiles.set(files);
    this.bannerPreviews.set(files.map(f => URL.createObjectURL(f)));
    this.bannersChanged.set(files.length > 0);
  }
  removeNewBannerAt(i: number) {
    const files = [...this.bannerFiles()];
    const prevs = [...this.bannerPreviews()];
    files.splice(i, 1); prevs.splice(i, 1);
    this.bannerFiles.set(files); this.bannerPreviews.set(prevs);
    this.bannersChanged.set(files.length > 0);
  }
  resetBannersSelection() {
    this.bannerFiles.set([]);
    this.bannerPreviews.set([]);
    this.bannersChanged.set(false);
  }

  async saveReplace() {
    if (!this.editing()) return;

    if (!this.iconChanged() && !this.imageChanged() && !this.bannersChanged()) {
      this.closeReplace();
      return;
    }

    const changed: string[] = [];
    if (this.iconChanged()) changed.push('icône');
    if (this.imageChanged()) changed.push('image de couverture');
    if (this.bannersChanged()) changed.push('bannières');

    const ask = await showAlert({
      icon: 'warning',
      title: 'Confirmer le remplacement',
      html: `Les éléments suivants seront <b>remplacés</b> :<br>• ${changed.join('<br>• ')}`,
      showCancelButton: true,
      confirmButtonText: 'Oui, remplacer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#4f46e5',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    const fd = new FormData();
    if (this.iconChanged() && this.iconFile())   { fd.append('replaceIcon', 'true');  fd.append('icon', this.iconFile()!); }
    if (this.imageChanged() && this.imageFile()) { fd.append('replaceImage', 'true'); fd.append('image', this.imageFile()!); }
    if (this.bannersChanged()) {
      fd.append('replaceBanners', 'true');
      this.bannerFiles().forEach(f => fd.append('banners', f));
    }

    try {
      this.actionKind.set('replace');
      this.actionId.set(this.editing()!._id);

      const updated = await this.api.replaceFiles(this.editing()!._id, fd).toPromise();
      if (updated) this.raw.set(this.raw().map(x => x._id === updated._id ? updated : x));

      await showAlert({ icon: 'success', title: 'Fichiers remplacés', timer: 1200, timerProgressBar: true });
      this.closeReplace();
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Erreur', html: e?.message || 'Impossible d’enregistrer.' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // expose in template
  protected readonly getUrl = getUrl;
}
