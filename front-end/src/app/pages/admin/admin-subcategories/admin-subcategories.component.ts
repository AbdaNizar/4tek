import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { SubcategoryService } from '../../../services/subcategory/subcategory.service';
import { HttpClientModule } from '@angular/common/http';
import {SubCategory} from '../../../interfaces/SubCategory';
import {Category} from '../../../interfaces/category';
import {CategoryService} from '../../../services/category/category.service';
import {getUrl} from '../../../shared/constant/function';

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

  // data
  loading = signal(true);
  parents = signal<Category[]>([]);
  raw = signal<SubCategory[]>([]);

  // filters
  q = signal<string>('');
  status = signal<StatusFilter>('all');

  // modal create/edit
  modalOpen = signal(false);
  editing = signal<SubCategory | null>(null);

  // modal replace
  replaceOpen = signal(false);

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

  // replace modal flags and selected files
  iconChanged = signal(false);
  imageChanged = signal(false);
  bannersChanged = signal(false);

  // computed list
  list = computed(() => {
    const text = this.q().trim().toLowerCase();
    const st = this.status();
    return this.raw().filter(s => {
      const matchText = !text
        || s.name.toLowerCase().includes(text)
        || s.slug.toLowerCase().includes(text)
        || (s.description || '').toLowerCase().includes(text)
        || (typeof s.parent !== 'string' && s.parent?.name?.toLowerCase().includes(text));
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

  // ---- fetchers ----
  async fetchParents() {
    try {
      const data = await this.apiCat.list().toPromise();
      console.log('data')
      this.parents.set(data || []);
    } catch (_) {}
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

  // ---- modal create/edit ----
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

    // we show current files in the card, create modal shows previews only when picked
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

  // ---- file handlers (create/edit simple) ----
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
    const next = [...this.bannerFiles(), ...files];
    const previews = [...this.bannerPreviews(), ...files.map(f => URL.createObjectURL(f))];
    this.bannerFiles.set(next);
    this.bannerPreviews.set(previews);
    (ev.target as HTMLInputElement).value = '';
  }
  removeBannerAt(i: number) {
    const nextFiles = [...this.bannerFiles()];
    const nextPreviews = [...this.bannerPreviews()];
    nextFiles.splice(i, 1);
    nextPreviews.splice(i, 1);
    this.bannerFiles.set(nextFiles);
    this.bannerPreviews.set(nextPreviews);
  }

  // ---- save create/update ----
  async save() {
    if (this.f.invalid) {
      this.f.markAllAsTouched();
      return;
    }
    const v = this.f.value;
    const fd = new FormData();
    fd.append('name', v.name!);
    fd.append('slug', v.slug!);
    fd.append('description', v.description || '');
    fd.append('isActive', String(!!v.isActive));
    if (v.parentId) fd.append('parentId', v.parentId);

    if (this.imageFile()) fd.append('image', this.imageFile()!);
    if (this.iconFile())  fd.append('icon',  this.iconFile()!);
    this.bannerFiles().forEach(f => fd.append('banners', f));

    try {
      if (this.editing()) {
        const updated = await this.api.update(this.editing()!._id, fd).toPromise();
        if (updated) {
          this.raw.set(this.raw().map(x => x._id === updated._id ? updated : x));
        }
      } else {
        const created = await this.api.create(fd).toPromise();
        if (created) this.raw.set([created, ...this.raw()]);
      }
      this.closeModal();
    } catch (e) {
      console.error(e);
    }
  }

  // ---- toggle / remove ----
  async toggle(s: SubCategory) {
    try {
      const updated = await this.api.toggle(s._id, !s.isActive).toPromise();
      if (updated) this.raw.set(this.raw().map(x => x._id === s._id ? updated : x));
    } catch (e) { console.error(e); }
  }

  async remove(s: SubCategory) {
    if (!confirm(`Supprimer "${s.name}" ?`)) return;
    try {
      await this.api.remove(s._id).toPromise();
      this.raw.set(this.raw().filter(x => x._id !== s._id));
    } catch (e) { console.error(e); }
  }

  // ---- replace modal ----
  openReplace(s: SubCategory) {
    this.editing.set(s);
    this.iconChanged.set(false);
    this.imageChanged.set(false);
    this.bannersChanged.set(false);

    // clear temporary selections (replace modal uses its own selection)
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
    this.iconChanged.set(true);
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
    this.imageChanged.set(true);
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
    this.bannersChanged.set(!!files.length);
  }
  removeNewBannerAt(i: number) {
    const files = [...this.bannerFiles()];
    const prevs = [...this.bannerPreviews()];
    files.splice(i, 1);
    prevs.splice(i, 1);
    this.bannerFiles.set(files);
    this.bannerPreviews.set(prevs);
    this.bannersChanged.set(!!files.length);
  }
  resetBannersSelection() {
    this.bannerFiles.set([]);
    this.bannerPreviews.set([]);
    this.bannersChanged.set(false);
  }

  async saveReplace() {
    if (!this.editing()) return;
    const fd = new FormData();
    fd.append('replaceIcon', String(this.iconChanged()));
    fd.append('replaceImage', String(this.imageChanged()));
    fd.append('replaceBanners', String(this.bannersChanged()));

    if (this.iconChanged() && this.iconFile())   fd.append('icon', this.iconFile()!);
    if (this.imageChanged() && this.imageFile()) fd.append('image', this.imageFile()!);
    if (this.bannersChanged()) this.bannerFiles().forEach(f => fd.append('banners', f));

    try {
      const updated = await this.api.replaceFiles(this.editing()!._id, fd).toPromise();
      if (updated) {
        this.raw.set(this.raw().map(x => x._id === updated._id ? updated : x));
        this.closeReplace();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // expose in template
  protected readonly getUrl = getUrl;
}
