import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { BrandService } from '../../../services/brand/brand.service';
import { getUrl } from '../../../shared/constant/function';
import { Brand } from '../../../interfaces/brand';

// ⚠️ Adapte le chemin si besoin
import { showAlert} from '../../../shared/constant/function';

@Component({
  standalone: true,
  selector: 'app-admin-brands',
  imports: [NgIf, NgFor, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-brands.component.html',
  styleUrls: ['./admin-brands.component.css']
})
export class AdminBrandsComponent implements OnInit {
  private api = inject(BrandService);
  private fb  = inject(FormBuilder);
  private http = inject(HttpClient);

  // data
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
        (b.name || '').toLowerCase().includes(query) ||
        (b.slug || '').toLowerCase().includes(query)
      );
    }
    return arr;
  });

  // modal states
  modalOpen   = signal(false);
  replaceOpen = signal(false);
  editing     = signal<Brand | null>(null);

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

  // loaders / actions ciblées
  // - actionId: id de la marque en cours (toggle/remove/replace)
  // - actionKind: 'toggle' | 'remove' | 'replace' | 'create' | 'update'
  actionId   = signal<string | null>(null);
  actionKind = signal<'toggle' | 'remove' | 'replace' | 'create' | 'update' | null>(null);
  get busy() { return this.actionKind() !== null; }

  ngOnInit() { this.fetch(); }

  fetch() {
    this.loading.set(true);
    this.api.list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(rows => this.raw.set(rows || []));
  }

  // ---------- create / edit ----------
  openCreate() {
    this.editing.set(null);
    this.f.reset({ name: '', slug: '', isActive: true });
    this.clearIconSelection();
    this.modalOpen.set(true);
  }

  openEdit(b: Brand) {
    this.editing.set(b);
    this.f.reset({ name: b.name, slug: b.slug, isActive: !!b.isActive });
    this.clearIconSelection();
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  // file picking (create)
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

  async save() {
    const val = this.f.value;
    if (!val.name || !val.slug) {
      await showAlert({ icon: 'warning', title: 'Veuillez remplir Nom et Slug.' });
      return;
    }

    const isCreate = !this.editing();
    const title = isCreate ? 'Confirmer l’ajout ?' : 'Enregistrer les modifications ?';

    const confirm = await showAlert({
      icon: 'question',
      title,
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!confirm.isConfirmed) return;

    try {
      this.actionKind.set(isCreate ? 'create' : 'update');
      this.actionId.set(this.editing()?._id || null);

      if (isCreate) {
        // CREATE
        const fd = new FormData();
        fd.append('name', val.name!);
        fd.append('slug', val.slug!);
        fd.append('isActive', String(!!val.isActive));
        if (this.iconFile) fd.append('icon', this.iconFile);

        await this.api.create(fd).toPromise();
      } else {
        // UPDATE (text only)
        await this.api.update(this.editing()!._id, {
          name: val.name!, slug: val.slug!, isActive: !!val.isActive
        }).toPromise();
      }

      this.closeModal();
      this.clearIconSelection();
      this.fetch();

      await showAlert({ icon: 'success', title: 'Enregistré avec succès', timer: 1200, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Erreur', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // ---------- replace icon ----------
  openReplace(b: Brand) {
    this.editing.set(b);
    this.clearIconSelection();
    this.replaceOpen.set(true);
  }

  closeReplace() { this.replaceOpen.set(false); }

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

  async saveReplace() {
    if (!this.iconFile || !this.editing()) {
      await showAlert({ icon: 'warning', title: 'Sélectionnez une icône d’abord.' });
      return;
    }

    const ask = await showAlert({
      icon: 'question',
      title: 'Remplacer l’icône ?',
      showCancelButton: true,
      confirmButtonText: 'Remplacer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    const id = this.editing()!._id;
    const fd = new FormData();
    fd.append('icon', this.iconFile);

    try {
      this.actionKind.set('replace');
      this.actionId.set(id);

      const updated = await this.api.replace(id, fd).toPromise();
      if (updated) this.raw.set(this.raw().map(b => b._id === id ? updated : b));

      this.resetIconSelection(true);
      await showAlert({ icon: 'success', title: 'Icône remplacée', timer: 1100, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Erreur de remplacement', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // ---------- toggle active ----------
  async toggle(b: Brand) {
    const next = !b.isActive;
    const title = next ? 'Activer cette marque ?' : 'Désactiver cette marque ?';

    const ask = await showAlert({
      icon: 'question',
      title,
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false
    });
    if (!ask.isConfirmed) return;

    try {
      this.actionKind.set('toggle');
      this.actionId.set(b._id);

      const updated = await this.api.toggle(b._id, next).toPromise();
      if (updated) this.raw.set(this.raw().map(x => x._id === b._id ? updated : x));

      await showAlert({ icon: 'success', title: 'Statut mis à jour', timer: 1000, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Échec de mise à jour', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  // ---------- delete ----------
  async remove(b: Brand) {
    const ask = await showAlert({
      icon: 'warning',
      title: `Supprimer « ${b.name} » ?`,
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
      this.actionId.set(b._id);

      await this.api.remove(b._id).toPromise();
      this.fetch();

      await showAlert({ icon: 'success', title: 'Marque supprimée', timer: 1100, timerProgressBar: true });
    } catch (e: any) {
      await showAlert({ icon: 'error', title: 'Échec de suppression', html: e?.message || 'Action impossible' });
    } finally {
      this.actionKind.set(null);
      this.actionId.set(null);
    }
  }

  protected readonly getUrl = getUrl;
}
