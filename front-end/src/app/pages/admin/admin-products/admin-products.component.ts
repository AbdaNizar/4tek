import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductService } from '../../../services/product/product.service';
import { CategoryService } from '../../../services/category/category.service';
import { SubcategoryService } from '../../../services/subcategory/subcategory.service';
import { BrandService } from '../../../services/brand/brand.service';
import { Category } from '../../../interfaces/category';
import { SubCategory } from '../../../interfaces/SubCategory';
import { Brand } from '../../../interfaces/brand';
import { Product } from '../../../interfaces/product';
import { lastValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { getUrl } from '../../../shared/constant/function';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, map } from 'rxjs';
import { showAlert} from '../../../shared/constant/function';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  standalone: true,
  selector: 'app-admin-products',
  imports: [CommonModule, NgIf, NgFor, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.css']
})
export class AdminProductsComponent implements OnInit {
  private api = inject(ProductService);
  private catsApi = inject(CategoryService);
  private subsApi = inject(SubcategoryService);
  private brandApi = inject(BrandService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // data
  loading = signal(true);
  raw = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  brands = signal<Brand[]>([]);
  total = signal(0);

  // Sélection courante + options
  selectedCatId = signal<string | ''>('');
  subOptions   = signal<SubCategory[]>([]);

  // filters
  q = signal<string>('');
  status = signal<StatusFilter>('all');
  catId = signal<string>('all');

  // modal create/edit
  modalOpen = signal(false);
  editing   = signal<Product | null>(null);

  // modal replace
  replaceOpen = signal(false);

  // ---------- loaders ciblés ----------
  actionId   = signal<string | null>(null);
  actionKind = signal<'create' | 'update' | 'toggle' | 'remove' | 'replace' |'toggleToNew'| null>(null);
  get busy() { return this.actionKind() !== null; }

  // form
  f = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    category: ['', [Validators.required]],
    subCategory: ['', [Validators.required]],
    brand: ['', Validators.required],
    description: [''],
    price: [null as any, [Validators.required, Validators.min(0)]],
    oldPrice: [null as any],
    stock: [0, [Validators.min(0)]],
    cost: [null as any, [Validators.required, Validators.min(0)]],
    sku: [''],
    isActive: [true],
    currency: ['TND'],
    tags: ['']
  });

  // files (create)
  coverFile = signal<File | null>(null);
  coverPreview = signal<string | null>(null);
  galleryFiles = signal<File[]>([]);
  galleryPreviews = signal<string[]>([]);

  // replace
  coverChanged = signal(false);
  galleryChanged = signal(false);
  coverReplace = signal<File | null>(null);
  coverReplacePreview = signal<string | null>(null);
  galleryReplace = signal<File[]>([]);
  galleryReplacePreviews = signal<string[]>([]);

  // list filtrée
  list = computed(() => {
    const text = this.q().trim().toLowerCase();
    const st = this.status();
    const cat = this.catId();
    return this.raw().filter(p => {
      const matchText = !text
        || p.name.toLowerCase().includes(text)
        || p.slug.toLowerCase().includes(text)
        || (p.description || '').toLowerCase().includes(text)
        || (p.sku || '').toLowerCase().includes(text);
      const matchStatus = st === 'all'
        || (st === 'active' && p.isActive)
        || (st === 'inactive' && !p.isActive);
      const matchCat = cat === 'all' || p.category === cat;
      return matchText && matchStatus && matchCat;
    });
  });

  async ngOnInit() {
    await Promise.all([this.fetch(), this.loadBrands(), this.fetchCategories()]);
    // hydratation subcats si on arrive en édition
    const catId = this.f.get('category')!.value as string;
    if (catId) {
      this.selectedCatId.set(catId);
      await this.loadSubcategories(catId);
      const subId = this.f.get('subCategory')!.value as string;
      if (!subId) this.f.get('subCategory')!.setValue('');
    }
  }


  // -------- fetchers ----------
  async fetch() {
    this.loading.set(true);
    try {
      const res = await this.api.list().toPromise();
      this.raw.set(res?.items || []);
      this.total.set(res?.total || 0);
    } finally {
      this.loading.set(false);
    }
  }
  loadBrands() {
    this.brandApi.list().subscribe(rows => this.brands.set(rows || []));
  }
  async fetchCategories() {
    const cs = await this.catsApi.list().toPromise();
    this.categories.set(cs || []);
  }

  // -------- subcategories ----------
  async hydrateEditSubcategories(product: Product) {
    if (product?.category) {
      this.selectedCatId.set(product.category);
      await this.loadSubcategories(product.category);
      if (product.subCategory) {
        this.f.get('subCategory')!.setValue(product.subCategory);
      }
    }
  }
  private async loadSubcategories(catId: string) {
    try {
      const subs = await lastValueFrom(this.subsApi.listByCategory(catId));
      this.subOptions.set((subs || []).filter(s => s.isActive));
    } catch {
      this.subOptions.set([]);
    }
  }
  async onCategoryChange(event: Event) {
    const catId = (event.target as HTMLSelectElement).value;
    this.selectedCatId.set(catId || '');
    this.f.get('subCategory')!.setValue('');
    this.subOptions.set([]);
    if (catId) await this.loadSubcategories(catId);
  }
  onBrandChange(_: Event) {
    this.f.patchValue({ category: '', subCategory: '' });
    this.selectedCatId.set('');
    this.subOptions.set([]);
  }

  // -------- nav ----------
  goDetail(p: Product) {
    this.router.navigate(['/admin/produits', p._id]);
  }

  // -------- modals ----------
  openCreate() {
    this.editing.set(null);
    this.f.reset({
      name: '', slug: '', category: '', subCategory: '', brand: '',
      description: '', price: null, oldPrice: null, stock: 0, sku: '',
      isActive: true, currency: 'TND', tags: '',cost: null,
    });
    this.coverFile.set(null);
    this.coverPreview.set(null);
    this.galleryFiles.set([]);
    this.galleryPreviews.set([]);
    this.modalOpen.set(true);
    document.body.classList.add('modal-open');
  }
  openEdit(p: Product) {
    this.hydrateEditSubcategories(p);
    this.editing.set(p);
    this.f.reset({
      name: p.name,
      slug: p.slug,
      category: p.category,
      subCategory: p.subCategory,
      brand: p.brand,
      description: p.description || '',
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      stock: p.stock ?? 0,
      sku: p.sku || '',
      isActive: p.isActive,
      cost: p.cost ?? null,
      currency: p.currency || 'TND',
      tags: (p.tags || []).join(', ')
    });
    this.coverFile.set(null);
    this.coverPreview.set(p.imageUrl ? getUrl(p.imageUrl) : null);
    this.galleryFiles.set([]);
    this.galleryPreviews.set([]);
    this.modalOpen.set(true);
    document.body.classList.add('modal-open');
  }
  closeModal() {
    this.modalOpen.set(false);
    document.body.classList.remove('modal-open');
  }

  readonly formValueSig = toSignal(
    this.f.valueChanges.pipe(startWith(this.f.getRawValue())),
    { initialValue: this.f.getRawValue() }
  );

  readonly marginAmountSig = computed(() => {
    const v = this.formValueSig();
    const price = Number(v?.price ?? 0);
    const cost  = Number(v?.cost  ?? 0);
    return Math.max(0, price - cost);
  });
  readonly marginRateSig = computed(() => {
    const v = this.formValueSig();
    const price = Number(v?.price ?? 0);
    if (!price) return 0;
    return Math.max(0, (this.marginAmountSig() / price) * 100);
  });
  readonly currencySig = computed(() => this.formValueSig()?.currency || 'TND');
  openReplace(p: Product) {
    this.editing.set(p);
    this.coverChanged.set(false);
    this.galleryChanged.set(false);
    this.coverReplace.set(null);
    this.coverReplacePreview.set(null);
    this.galleryReplace.set([]);
    this.galleryReplacePreviews.set([]);
    this.replaceOpen.set(true);
    document.body.classList.add('modal-open');
  }
  closeReplace() {
    this.replaceOpen.set(false);
    document.body.classList.remove('modal-open');
  }

  // -------- files (create) ----------
  onPickCover(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] || null;
    this.coverFile.set(f);
    this.coverPreview.set(f ? URL.createObjectURL(f) : null);
  }
  clearCover() { this.coverFile.set(null); this.coverPreview.set(null); }
  onPickGallery(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    if (!files.length) return;
    this.galleryFiles.set([...this.galleryFiles(), ...files]);
    this.galleryPreviews.set([...this.galleryPreviews(), ...files.map(f => URL.createObjectURL(f))]);
    (ev.target as HTMLInputElement).value = '';
  }
  removeGalleryAt(i: number) {
    const nf = [...this.galleryFiles()];
    const np = [...this.galleryPreviews()];
    nf.splice(i, 1); np.splice(i, 1);
    this.galleryFiles.set(nf); this.galleryPreviews.set(np);
  }

  // -------- files (replace) ----------
  onPickCoverReplace(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] || null;
    this.coverReplace.set(f);
    this.coverReplacePreview.set(f ? URL.createObjectURL(f) : null);
    this.coverChanged.set(!!f);
  }
  resetCoverReplace() {
    this.coverReplace.set(null);
    this.coverReplacePreview.set(null);
    this.coverChanged.set(false);
  }
  onPickGalleryReplace(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    this.galleryReplace.set(files);
    this.galleryReplacePreviews.set(files.map(f => URL.createObjectURL(f)));
    this.galleryChanged.set(files.length > 0);
  }
  removeNewGalleryAt(i: number) {
    const nf = [...this.galleryReplace()];
    const np = [...this.galleryReplacePreviews()];
    nf.splice(i, 1); np.splice(i, 1);
    this.galleryReplace.set(nf);
    this.galleryReplacePreviews.set(np);
    this.galleryChanged.set(nf.length > 0);
  }

  // -------- save (create/update) ----------
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
      title: isCreate ? 'Créer ce produit ?' : 'Enregistrer les modifications ?',
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
    fd.append('category', v.category!);
    fd.append('subCategory', v.subCategory!);
    fd.append('brand', v.brand!);
    fd.append('description', v.description || '');
    if (v.price !== null && v.price !== undefined) fd.append('price', String(v.price));
    if (v.oldPrice !== null && v.oldPrice !== undefined) fd.append('oldPrice', String(v.oldPrice));
    if (v.cost !== null && v.cost !== undefined)     fd.append('cost', String(v.cost));
    fd.append('stock', String(v.stock ?? 0));
    fd.append('sku', v.sku || '');
    fd.append('isActive', String(!!v.isActive));
    fd.append('currency', v.currency || 'TND');
    if (v.tags) fd.append('tags', v.tags);
    if (isCreate) {
      if (this.coverFile()) fd.append('image', this.coverFile()!);
      this.galleryFiles().forEach(f => fd.append('gallery', f));
    }

    try {
      this.actionKind.set(isCreate ? 'create' : 'update');
      this.actionId.set(this.editing()?._id || null);

      if (isCreate) {
        const created = await this.api.create(fd).toPromise();
        if (created) this.raw.set([created, ...this.raw()]);
      } else {
        const updated = await this.api.update(this.editing()!._id, fd).toPromise();
        if (updated) this.raw.set(this.raw().map(p => p._id === updated._id ? updated : p));
      }

      this.closeModal();
      await showAlert({ icon: 'success', title: 'Enregistré avec succès', timer: 1300, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Erreur', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // -------- save replace ----------
  async saveReplace() {
    const p = this.editing();
    if (!p) return;

    if (!this.coverChanged() && !this.galleryChanged()) {
      this.closeReplace();
      return;
    }

    const changed: string[] = [];
    if (this.coverChanged()) changed.push('cover');
    if (this.galleryChanged()) changed.push('galerie');

    const html = `Les éléments suivants seront <b>remplacés</b> :<br>• ${changed.join('<br>• ')}`;
    const ask = await showAlert({
      icon: 'warning',
      title: 'Confirmer le remplacement',
      html,
      showCancelButton: true,
      confirmButtonText: 'Oui, remplacer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#4f46e5',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    const fd = new FormData();
    if (this.coverChanged() && this.coverReplace()) {
      fd.append('replaceCover', 'true');
      fd.append('image', this.coverReplace()!);
    }
    if (this.galleryChanged()) {
      fd.append('replaceGallery', 'true');
      this.galleryReplace().forEach(f => fd.append('gallery', f));
    }

    try {
      this.actionKind.set('replace');
      this.actionId.set(p._id);

      const updated = await this.api.replace(p._id, fd).toPromise();
      if (updated) {
        this.raw.set(this.raw().map(x => x._id === updated._id ? updated : x));
      }
      await showAlert({ icon: 'success', title: 'Fichiers remplacés', timer: 1300, timerProgressBar: true });
      this.closeReplace();
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Erreur', html: e?.message || 'Impossible d’enregistrer.' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // -------- toggle ----------
  async toggle(p: Product) {
    const ask = await showAlert({
      icon: 'question',
      title: p.isActive ? 'Désactiver ce produit ?' : 'Activer ce produit ?',
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    try {
      this.actionKind.set('toggle');
      this.actionId.set(p._id);

      const updated = await this.api.toggle(p._id).toPromise();
      if (updated) this.raw.set(this.raw().map(x => x._id === p._id ? updated : x));

      await showAlert({ icon: 'success', title: 'Statut mis à jour', timer: 1100, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Échec de mise à jour', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  async toggleToNew(p: Product) {
    const ask = await showAlert({
      icon: 'question',
      title: p.isNew ? 'Changé a ancien ?' : 'Changé a Nouveau?',
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    try {
      this.actionKind.set('toggleToNew');
      this.actionId.set(p._id);

      const updated = await this.api.toggleToNew(p._id).toPromise();
      if (updated) this.raw.set(this.raw().map(x => x._id === p._id ? updated : x));

      await showAlert({ icon: 'success', title: 'Statut mis à jour', timer: 1100, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Échec de mise à jour', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // -------- remove ----------
  async remove(p: Product) {
    const ask = await showAlert({
      icon: 'warning',
      title: `Supprimer « ${p.name} » ?`,
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
      this.actionId.set(p._id);

      await this.api.remove(p._id).toPromise();
      this.raw.set(this.raw().filter(x => x._id !== p._id));

      await showAlert({ icon: 'success', title: 'Produit supprimé', timer: 1100, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Échec de suppression', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // helpers
  getUrl = getUrl;
}
