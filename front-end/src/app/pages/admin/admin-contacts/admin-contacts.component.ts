import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../../services/contact/contact.service';
import { ContactRequest } from '../../../interfaces/contact-request';
import { ContactStatus } from '../../../interfaces/ContactStatus';
import { getUrl } from '../../../shared/constant/function';
import { showAlert} from '../../../shared/constant/function';

@Component({
  standalone: true,
  selector: 'app-admin-contacts',
  imports: [CommonModule],
  templateUrl: './admin-contacts.component.html',
  styleUrls: ['./admin-contacts.component.css']
})
export class AdminContactsComponent {
  private api = inject(ContactService);

  // état
  items      = signal<ContactRequest[]>([]);
  loading    = signal<boolean>(false);

  // filtre/pagination
  q          = signal<string>('');
  st         = signal<string>('');   // '', 'new', 'in_progress', 'done'
  page       = signal<number>(1);
  pages      = signal<number>(1);

  // modal
  modalOpen  = signal<boolean>(false);
  selected   = signal<ContactRequest | null>(null);

  // action (spinner/disable)
  actionForId   = signal<string|null>(null);                  // id en cours
  actionType    = signal<'in_progress'|'done'|null>(null);    // type en cours
  get actionBusy() { return this.actionForId() !== null; }

  constructor() {
    this.load();

    // recharge quand filtres changent
    effect(() => {
      // lire les signaux -> déclenche load
      this.q(); this.st(); this.page();
      this.load();
    });

    // ESC pour fermer la modale
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalOpen()) this.close();
    });
  }

  avatarUrlSafe(user: any): string | null {
    const raw = user?.avatar ?? null;
    if (!raw || typeof raw !== 'string') return null;
    let clean = raw.trim().replace(/^"+|"+$/g, '');
    clean = clean.replace(/=s\d+(-c)?$/, '=s64-c');
    return clean || null;
  }

  trackById = (_: number, c: ContactRequest) => c._id;

  async load() {
    this.loading.set(true);
    try {
      const { items, pages } = await this.api.list({
        q: this.q(),
        status: this.st(),
        page: this.page()
      });
      this.items.set(items);
      this.pages.set(pages);
    } finally {
      this.loading.set(false);
    }
  }

  search(val: string) { this.q.set(val); this.page.set(1); }
  filterStatus(val: string) { this.st.set(val); this.page.set(1); }
  setPage(p: number) { if (p < 1 || p > this.pages()) return; this.page.set(p); }

  open(c: ContactRequest) {
    this.selected.set(c);
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }
  close() {
    this.modalOpen.set(false);
    this.selected.set(null);
    document.body.style.overflow = '';
  }

  // ========== Actions avec SweetAlert + loader ==========
  async mark(rowId: string, status: ContactStatus) {
    // confirmer l’action
    const title =
      status === 'in_progress' ? 'Passer « en cours » ?'
        : status === 'done' ? 'Marquer « terminé » ?'
          : 'Mettre à jour ?';

    const res = await showAlert({
      icon: 'question',
      title,
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false,
      preConfirm: async () => {
        this.actionForId.set(rowId);
        this.actionType.set(status === 'in_progress' ? 'in_progress' : 'done');
        try {
          await this.api.update(rowId, { status }).toPromise();
          // maj liste
          this.items.update(list =>
            list.map(it => it._id === rowId ? { ...it, status } : it)
          );
          // si c'est l'élément dans la modale, le mettre à jour
          const cur = this.selected();
          if (cur && cur._id === rowId) {
            const updated = { ...cur, status } as ContactRequest;
            this.selected.set(updated);
            if (status === 'done') this.close();
          }
          return true;
        } catch (e: any) {
          throw new Error(e?.error?.error || e?.message || 'Échec de la mise à jour');
        } finally {
          this.actionForId.set(null);
          this.actionType.set(null);
        }
      }
    });

    if (res.isConfirmed) {
      await showAlert({
        icon: 'success',
        title: 'Mise à jour effectuée',
        confirmButtonText: 'OK',
        timer: 1200,
        timerProgressBar: true,
        showCancelButton: false
      });
    }
  }

  async markFromModal(status: ContactStatus) {
    const c = this.selected();
    if (!c?._id) return;
    await this.mark(c._id, status);
  }

  protected readonly getUrl = getUrl;
}
