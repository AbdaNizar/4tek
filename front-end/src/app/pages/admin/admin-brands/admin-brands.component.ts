import {Component, OnInit, computed, inject, signal} from '@angular/core';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgIf, NgFor} from '@angular/common';
import {finalize} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';

import {BrandService} from '../../../services/brand/brand.service';
import {getUrl} from '../../../shared/constant/function';
import {Brand} from '../../../interfaces/brand';
import {Category} from '../../../interfaces/category';

@Component({
  standalone: true,
  selector: 'app-admin-brands',
  imports: [NgIf, NgFor, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-brands.component.html',
  styleUrls: ['./admin-brands.component.css']
})
export class AdminBrandsComponent implements OnInit {
  private api = inject(BrandService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  loading = signal(true);
  q = signal('');
  status = signal<'all' | 'active' | 'inactive'>('all');
  raw = signal<Brand[]>([]);

  list = computed(() => {
    let arr = this.raw();
    if (this.status() !== 'all') {
      const ok = this.status() === 'active';
      arr = arr.filter(b => !!b.isActive === ok);
    }
    const query = this.q().trim().toLowerCase();
    if (query) {
      arr = arr.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.slug.toLowerCase().includes(query)
      );
    }
    return arr;
  });

  // modal states
  modalOpen = signal(false);
  replaceOpen = signal(false);
  editing = signal<Brand | null>(null);

  // form
  f = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    isActive: [true],
  });

  // icon (create & replace)
  iconFile: File | null = null;
  iconPreview = signal<string | null>(null);
  iconChanged = computed(() => !!this.iconFile);

  ngOnInit() {
    this.fetch();
  }

  fetch() {
    this.loading.set(true);
    this.api.list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(rows => this.raw.set(rows || []));
  }

  openCreate() {
    this.editing.set(null);
    this.f.reset({name: '', slug: '', isActive: true});
    this.clearIconSelection();
    this.modalOpen.set(true);
  }

  openEdit(b: Brand) {
    this.editing.set(b);
    this.f.reset({name: b.name, slug: b.slug, isActive: b.isActive});
    this.clearIconSelection();
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  // pick icon (create)
  onPickIcon(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    this.clearIconSelection();
    this.iconFile = f;
    this.iconPreview.set(URL.createObjectURL(f));
  }

  clearIconSelection() {
    const url = this.iconPreview();
    if (url) URL.revokeObjectURL(url);
    this.iconPreview.set(null);
    this.iconFile = null;
  }

  save() {
    const val = this.f.value;
    if (!val.name || !val.slug) return;

    if (!this.editing()) {
      // CREATE
      const fd = new FormData();
      fd.append('name', val.name!);
      fd.append('slug', val.slug!);
      fd.append('isActive', String(!!val.isActive));
      if (this.iconFile) fd.append('icon', this.iconFile);

      this.api.create(fd).subscribe(() => {
        this.closeModal();
        this.clearIconSelection();
        this.fetch();
      });
    } else {
      // UPDATE (text only)
      this.api.update(this.editing()!._id, {
        name: val.name!, slug: val.slug!, isActive: !!val.isActive
      }).subscribe(() => {
        this.closeModal();
        this.clearIconSelection();
        this.fetch();
      });
    }
  }

  // replace dialog
  openReplace(b: Brand) {
    this.editing.set(b);
    this.clearIconSelection();
    this.replaceOpen.set(true);
  }

  closeReplace() {
    this.replaceOpen.set(false);
  }

  // pick icon (replace)
  onPickIconReplace(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.clearIconSelection();
    this.iconFile = file;
    this.iconPreview.set(URL.createObjectURL(file));
  }

  resetIconSelection(close = false) {
    this.clearIconSelection();
    if (close) this.closeReplace();
  }

  // submit replace
  async saveReplace() {
    if (!this.iconFile || !this.editing()) return;

    const id = this.editing()!._id;
    const fd = new FormData();
    fd.append('icon', this.iconFile);

    try {
      const updated = await this.api.replace(id, fd).toPromise();
      if (updated) {
        this.raw.set(this.raw().map(b => b._id === id ? updated : b));
      }
      this.resetIconSelection(true);
    } catch (e) {
      console.error(e);
    }
  }

  async toggle(b: Brand) {
    try {
      const updated = await this.api.toggle(b._id, !b.isActive).toPromise();
      if (updated) {
        this.raw.set(this.raw().map(x => x._id === b._id ? updated : x));
      }
    } catch (e) {
      console.error(e);
    }
  }

  remove(b: Brand) {
    if (confirm('Supprimer cette marque ?')) this.api.remove(b._id).subscribe(() => this.fetch());
  }

  protected readonly getUrl = getUrl;
}
