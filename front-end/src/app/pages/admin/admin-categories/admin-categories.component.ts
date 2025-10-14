// src/app/pages/admin/admin-categories/admin-categories.component.ts
import {Component, OnInit, inject, signal, computed} from '@angular/core';
import {CommonModule, NgFor, NgIf} from '@angular/common';
import {FormsModule, ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import {CategoryService} from '../../../services/category/category.service';
import {Category} from '../../../interfaces/category';
import {Router} from '@angular/router';
import {getUrl} from '../../../shared/constant/function';
import Swal from 'sweetalert2';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  standalone: true,
  selector: 'app-admin-categories',
  imports: [CommonModule, NgIf, NgFor, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.css']
})
export class AdminCategoriesComponent implements OnInit {
  private api = inject(CategoryService);
  private fb = inject(FormBuilder);
  private router = inject(Router);


  // data
  loading = signal(true);
  raw = signal<Category[]>([]);
  q = signal<string>('');                       // FIX: use signal, not [(ngModel)] to function call
  status = signal<StatusFilter>('all');         // FIX: same

  // modal + edit
  modalOpen = signal(false);
  editing = signal<Category | null>(null);

  // form (simple fields only)
  f = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    description: [''],
    isActive: [true],
  });

  // file state (newly selected, not yet uploaded)
  imageFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);

  iconFile = signal<File | null>(null);
  iconPreview = signal<string | null>(null);

  bannerFiles = signal<File[]>([]);
  bannerPreviews = signal<string[]>([]);

  // existing banners when editing (URLs already saved)
  existingBanners = signal<string[]>([]);

  // filtered view
  list = computed(() => {
    const text = this.q().trim().toLowerCase();
    const st = this.status();
    return this.raw().filter(c => {
      const matchText = !text
        || c.name.toLowerCase().includes(text)
        || c.slug.toLowerCase().includes(text)
        || (c.description || '').toLowerCase().includes(text);
      const matchStatus = st === 'all'
        || (st === 'active' && c.isActive)
        || (st === 'inactive' && !c.isActive);
      return matchText && matchStatus;
    });
  });

  async ngOnInit() {
    await this.fetch();
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

  // ------- modal open/close -------
  openCreate() {
    this.editing.set(null);
    this.f.reset({name: '', slug: '', description: '', isActive: true});

    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.iconFile.set(null);
    this.iconPreview.set(null);
    this.bannerFiles.set([]);
    this.bannerPreviews.set([]);
    this.existingBanners.set([]);

    this.modalOpen.set(true);
    document.body.classList.add('modal-open'); // prevent background scroll
  }

  openEdit(c: Category) {
    this.editing.set(c);
    this.f.reset({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      isActive: c.isActive,
    });

    // reset new files
    this.imageFile.set(null);
    this.imagePreview.set(getUrl(c.imageUrl) || null);
    this.iconFile.set(null);
    this.iconPreview.set(getUrl(c.iconUrl) || null);

    const serverBanners = Array.isArray(c.banners) ? c.banners : (c.bannerUrl ? [c.bannerUrl] : []);
    this.existingBanners.set(serverBanners);
    this.bannerFiles.set([]);
    this.bannerPreviews.set([]);

    this.modalOpen.set(true);
    document.body.classList.add('modal-open');
  }

  closeModal() {
    this.modalOpen.set(false);
    document.body.classList.remove('modal-open');
  }

  // ------- file handlers -------
  onPickImage(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0] || null;
    this.imageFile.set(file);
    this.imagePreview.set(file ? URL.createObjectURL(file) : null);
  }

  clearImage() {
    this.imageFile.set(null);
    this.imagePreview.set(null);
  }

  onPickIcon(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0] || null;
    this.iconFile.set(file);
    this.iconPreview.set(file ? URL.createObjectURL(file) : null);
  }

  clearIcon() {
    this.iconFile.set(null);
    this.iconPreview.set(null);
  }

  onPickBanners(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    if (!files.length) return;
    const next = [...this.bannerFiles(), ...files];
    const previews = [...this.bannerPreviews(), ...files.map(f => URL.createObjectURL(f))];
    this.bannerFiles.set(next);
    this.bannerPreviews.set(previews);
    // reset input value so same files can be selected again if needed
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

  removeExistingBannerAt(i: number) {
    const next = [...this.existingBanners()];
    next.splice(i, 1);
    this.existingBanners.set(next);
  }

  // ------- save (multipart) -------
  async save() {
    if (this.f.invalid) {
      this.f.markAllAsTouched();
      return;
    }
    const v = this.f.value;

    // Build FormData
    const fd = new FormData();
    fd.append('name', v.name!);
    fd.append('slug', v.slug!);
    fd.append('description', v.description || '');
    fd.append('isActive', String(!!v.isActive));
    if (!this.editing()) {
      if (this.imageFile()) fd.append('image', this.imageFile()!);
      if (this.iconFile()) fd.append('icon', this.iconFile()!);
      this.existingBanners().forEach((url) => fd.append('existingBanners[]', url));
      this.bannerFiles().forEach(file => fd.append('banners', file));

    }

    try {
      if (this.editing()) {
        const updated = await this.api.update(this.editing()!._id, fd).toPromise();
        if (updated) {
          this.raw.set(this.raw().map(c => c._id === updated._id ? updated : c));
        }
      } else {
        console.log(fd)
        const created = await this.api.create(fd).toPromise();
        if (created) this.raw.set([created, ...this.raw()]);
      }
      this.closeModal();
    } catch (e) {
      console.error(e);
      // TODO: toast error
    }
  }

  async toggle(c: Category) {
    try {
      const updated = await this.api.toggle(c._id, !c.isActive).toPromise();
      if (updated) {
        this.raw.set(this.raw().map(x => x._id === c._id ? updated : x));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async remove(c: Category) {
    if (!confirm(`Supprimer "${c.name}" ?`)) return;
    try {
      await this.api.remove(c._id).toPromise();
      this.raw.set(this.raw().filter(x => x._id !== c._id));
    } catch (e) {
      console.error(e);
    }
  }

  goDetail(c: Category) {
    this.router.navigate(['/admin/categories', c._id]);
  }

  protected readonly getUrl = getUrl;


  // src/app/pages/admin/admin-categories/admin-categories.component.ts (extraits à AJOUTER)


// --- état modal remplacement ---
  replaceOpen = signal(false);

// flags groupes modifiés
  iconChanged = false;
  imageChanged = false;
  bannersChanged = false;

// buffers fichiers à remplacer
  private iconFileReplace: File | null = null;
  private imageFileReplace: File | null = null;
  private bannerFilesReplace: File[] = [];

// ouvre le modal remplacement
  openReplace(c: Category) {
    this.editing.set(c);

    // reset flags + previews
    this.iconChanged = false;
    this.imageChanged = false;
    this.bannersChanged = false;
    this.iconFileReplace = null;
    this.imageFileReplace = null;
    this.bannerFilesReplace = [];
    this.iconPreview.set(null);
    this.imagePreview.set(null);
    this.bannerPreviews.set([]);

    this.replaceOpen.set(true);
    document.body.classList.add('modal-open');
  }

  closeReplace() {
    this.replaceOpen.set(false);
    document.body.classList.remove('modal-open');
  }

// handlers PICK (replace)
  onPickIconReplace(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] || null;
    this.iconFileReplace = f;
    this.iconPreview.set(f ? URL.createObjectURL(f) : null);
    this.iconChanged = !!f;
  }

  resetIconSelection() {
    this.iconFileReplace = null;
    this.iconPreview.set(null);
    this.iconChanged = false;
  }

  onPickImageReplace(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] || null;
    this.imageFileReplace = f;
    this.imagePreview.set(f ? URL.createObjectURL(f) : null);
    this.imageChanged = !!f;
  }

  resetImageSelection() {
    this.imageFileReplace = null;
    this.imagePreview.set(null);
    this.imageChanged = false;
  }

  onPickBannersReplace(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    this.bannerFilesReplace = files;
    this.bannerPreviews.set(files.map(f => URL.createObjectURL(f)));
    this.bannersChanged = files.length > 0;
  }

  resetBannersSelection() {
    this.bannerFilesReplace = [];
    this.bannerPreviews.set([]);
    this.bannersChanged = false;
  }

  removeNewBannerAt(i: number) {
    const arr = [...this.bannerFilesReplace];
    arr.splice(i, 1);
    this.bannerFilesReplace = arr;
    this.bannerPreviews.set(arr.map(f => URL.createObjectURL(f)));
    this.bannersChanged = arr.length > 0;
  }

// sauvegarde remplacement
  async saveReplace() {
    const changed: string[] = [];
    if (this.iconChanged) changed.push('icône');
    if (this.imageChanged) changed.push('image de couverture');
    if (this.bannersChanged) changed.push('bannières');

    if (!changed.length) {
      this.closeReplace();
      return;
    }

    const html = `Les éléments suivants seront <b>écrasés</b> :<br>• ${changed.join('<br>• ')}`;
    const confirm = await Swal.fire({
      title: 'Confirmer le remplacement',
      html, icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, remplacer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#4f46e5'
    });
    if (!confirm.isConfirmed) return;

    const fd = new FormData();
    // n’envoyer QUE ce qui change
    if (this.iconChanged && this.iconFileReplace) {
      fd.append('replaceIcon', 'true');
      fd.append('icon', this.iconFileReplace);
    }
    if (this.imageChanged && this.imageFileReplace) {
      fd.append('replaceImage', 'true');
      fd.append('image', this.imageFileReplace);
    }
    if (this.bannersChanged && this.bannerFilesReplace.length) {
      fd.append('replaceBanners', 'true');
      this.bannerFilesReplace.forEach(f => fd.append('banners', f));
    }

    try {
      console.log(fd)
      const updated = await this.api.replace(this.editing()!._id, fd).toPromise();
      if (updated) {
        this.raw.set(this.raw().map(c => c._id === updated._id ? updated : c));
        await Swal.fire({icon: 'success', title: 'Modifications enregistrées', timer: 1400, showConfirmButton: false});
        this.closeReplace();
      }
    } catch (e) {
      console.error(e);
      Swal.fire({icon: 'error', title: 'Erreur', text: 'Impossible d’enregistrer.'});
    }
  }


}
