import {Component, OnInit, inject, signal, computed} from '@angular/core';
import {CommonModule, NgFor, NgIf} from '@angular/common';
import {FormsModule, ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import {ProductService} from '../../../services/product/product.service';
import {CategoryService} from '../../../services/category/category.service';
import {Category} from '../../../interfaces/category';
import {getUrl} from '../../../shared/constant/function';
import {Product} from '../../../interfaces/product';
import {SubCategory} from '../../../interfaces/SubCategory';
import {lastValueFrom} from 'rxjs';
import {SubcategoryService} from '../../../services/subcategory/subcategory.service';
import {log} from '@angular-devkit/build-angular/src/builders/ssr-dev-server';
import {Brand} from '../../../interfaces/brand';
import {BrandService} from '../../../services/brand/brand.service';

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
  private fb = inject(FormBuilder);
  private subsApi = inject(SubcategoryService);
  private brandApi = inject(BrandService);

  // data
  loading = signal(true);
  raw = signal<Product[]>([]);
  categories = signal<Category[]>([]);
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
  editing = signal<Product | null>(null);

  // modal replace
  replaceOpen = signal(false);

  // form (create/edit simple champs)
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
    sku: [''],
    isActive: [true],
    currency: ['TND'],
    tags: [''] // CSV dans le form, je convertis au submit
  });
  brands = signal<Brand[]>([]);

  // files state (create/edit simple)
  coverFile = signal<File | null>(null);
  coverPreview = signal<string | null>(null);

  galleryFiles = signal<File[]>([]);
  galleryPreviews = signal<string[]>([]);

  // replace flags + files
  coverChanged = signal(false);
  galleryChanged = signal(false);
  coverReplace = signal<File | null>(null);
  coverReplacePreview = signal<string | null>(null);
  galleryReplace = signal<File[]>([]);
  galleryReplacePreviews = signal<string[]>([]);
  saving = signal(false);

  // filtered list
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
    await Promise.all([this.fetch(),  this.loadBrands(),this.fetchCategories()]);

    // Si on arrive en édition avec une catégorie déjà présente:
    const catId = this.f.get('category')!.value as string;
    if (catId) {
      this.selectedCatId.set(catId);
      await this.loadSubcategories(catId);
      // si un subCategory est présent en édition, il reste; sinon on réinitialise
      const subId = this.f.get('subCategory')!.value as string;
      if (!subId) this.f.get('subCategory')!.setValue('');
    }
  }

  async fetch() {
    this.loading.set(true);
    try {
      const res = await this.api.list().toPromise();
      console.log('res',res)

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

  async hydrateEditSubcategories(product: any) {
    if (product?.category) {
      this.selectedCatId.set(product.category);
      await this.loadSubcategories(product.category);
      // remet la valeur si elle existe
      if (product.subCategory) {
        this.f.get('subCategory')!.setValue(product.subCategory);
      }
    }
  }

  /** Récupère les sous-catégories actives d’une catégorie */
  private async loadSubcategories(catId: string) {
    try {
      const subs = await lastValueFrom(this.subsApi.listByCategory(catId));
      // Garde seulement les actives, optionnel:
      this.subOptions.set((subs || []).filter(s => s.isActive));
    } catch {
      this.subOptions.set([]);
    }
  }

  /** Quand l’utilisateur choisit une catégorie */
  onCategoryChange(event: Event) {
    const selectEl = event.target as HTMLSelectElement;
    const catId = selectEl.value;
    this.selectedCatId.set(catId || '');
    this.f.get('subCategory')!.setValue('');
    this.subOptions.set([]);

    if (catId) {
      this.loadSubcategories(catId);
    }
  }

  onBrandChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.f.patchValue({ category: '', subCategory: '' });
    this.selectedCatId?.set?.('');
    this.subOptions.set([]);
  }
  // modal open/close
  openCreate() {
    this.editing.set(null);
    this.f.reset({
      name: '', slug: '', category: '', subCategory: '', description: '',
      price: null, oldPrice: null, stock: 0, sku: '',
      isActive: true, currency: 'TND', tags: ''
    });
    this.coverFile.set(null);
    this.coverPreview.set(null);
    this.galleryFiles.set([]);
    this.galleryPreviews.set([]);
    this.modalOpen.set(true);
    document.body.classList.add('modal-open');
  }

  openEdit(p: Product) {
    console.log('p',p)
    this.editing.set(p);
    this.f.reset({
      name: p.name,
      slug: p.slug,
      category: p.category,
      // <- requis
      subCategory: p.subCategory,   // <- requis
      brand: p.brand,   // <- requis
      description: p.description || '',
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      stock: p.stock ?? 0,
      sku: p.sku || '',
      isActive: p.isActive,
      currency: p.currency || 'TND',
      tags: (p.tags || []).join(', ')
    });
    // new files (none yet)
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

  // replace modal
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

  // file handlers (create/edit)
  onPickCover(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] || null;
    this.coverFile.set(f);
    this.coverPreview.set(f ? URL.createObjectURL(f) : null);
  }

  clearCover() {
    this.coverFile.set(null);
    this.coverPreview.set(null);
  }

  onPickGallery(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    if (!files.length) return;
    const next = [...this.galleryFiles(), ...files];
    const prev = [...this.galleryPreviews(), ...files.map(f => URL.createObjectURL(f))];
    this.galleryFiles.set(next);
    this.galleryPreviews.set(prev);
    (ev.target as HTMLInputElement).value = '';
  }

  removeGalleryAt(i: number) {
    const nf = [...this.galleryFiles()];
    const np = [...this.galleryPreviews()];
    nf.splice(i, 1);
    np.splice(i, 1);
    this.galleryFiles.set(nf);
    this.galleryPreviews.set(np);
  }

  // file handlers (replace)
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
    nf.splice(i, 1);
    np.splice(i, 1);
    this.galleryReplace.set(nf);
    this.galleryReplacePreviews.set(np);
    this.galleryChanged.set(nf.length > 0);
  }

  // save (create or update fields)
  async save() {
    if (this.f.invalid) {
      this.f.markAllAsTouched();
      this.saving.set(false);
      return;
    }
    const v = this.f.value;

    // build formdata (pour gérer textes + fichiers)
    const fd = new FormData();
    fd.append('name', v.name!);
    fd.append('slug', v.slug!);
    fd.append('category', v.category!);
    fd.append('subCategory', v.subCategory!);
    fd.append('brand', v.brand!);
    fd.append('description', v.description || '');
    if (v.price !== null && v.price !== undefined) fd.append('price', String(v.price));
    if (v.oldPrice !== null && v.oldPrice !== undefined) fd.append('oldPrice', String(v.oldPrice));
    fd.append('stock', String(v.stock ?? 0));
    fd.append('sku', v.sku || '');
    fd.append('isActive', String(!!v.isActive));
    fd.append('currency', v.currency || 'TND');
    if (v.tags) fd.append('tags', v.tags); // CSV
    if (!this.editing()) {
      if (this.coverFile()) fd.append('image', this.coverFile()!);
      this.galleryFiles().forEach(f => fd.append('gallery', f));
    }


    try {
      if (this.editing()) {
        const updated = await this.api.update(this.editing()!._id, fd).toPromise();
        if (updated) {
          this.raw.set(this.raw().map(p => p._id === updated._id ? updated : p));
        }
      } else {
        const created = await this.api.create(fd).toPromise();
        if (created) this.raw.set([created, ...this.raw()]);
      }
      this.closeModal();
    } catch (e) {
      console.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  async saveReplace() {
    const p = this.editing();
    if (!p) return;

    // Avertissement si rien n'a changé
    if (!this.coverChanged() && !this.galleryChanged()) {
      this.closeReplace();
      return;
    }

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
      const updated = await this.api.replace(p._id, fd).toPromise();
      if (updated) {
        this.raw.set(this.raw().map(x => x._id === updated._id ? updated : x));
      }
      this.closeReplace();
    } catch (e) {
      console.error(e);
    }
  }

  async toggle(p: Product) {
    try {
      const updated = await this.api.toggle(p._id).toPromise();
      if (updated) this.raw.set(this.raw().map(x => x._id === p._id ? updated : x));
    } catch (e) {
      console.error(e);
    }
  }

  async remove(p: Product) {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await this.api.remove(p._id).toPromise();
      this.raw.set(this.raw().filter(x => x._id !== p._id));
    } catch (e) {
      console.error(e);
    }
  }

  getUrl = getUrl;
}
