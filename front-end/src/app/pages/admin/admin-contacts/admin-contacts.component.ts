import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ContactService} from '../../../services/contact/contact.service';
import {ContactRequest} from '../../../interfaces/contact-request';
import {ContactStatus} from '../../../interfaces/ContactStatus';
import {getUrl} from '../../../shared/constant/function';




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
  items = signal<ContactRequest[]>([]);
  loading = signal<boolean>(false);

  // filtre/pagination simples
  q = signal<string>('');
  st = signal<string>('');
  page = signal<number>(1);
  pages = signal<number>(1);

  // modal
  modalOpen = signal<boolean>(false);
  selected = signal<ContactRequest | null>(null);

  constructor() {
    this.load();
    // recharger quand filtres changent
    effect(() => {
      this.q(); this.st(); this.page();
      this.load();
    });
    // ESC pour fermer la modale
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalOpen()) this.close();
    });
  }
  avatarUrlSafe(user :any ): string | null {
    const raw = user.avatar ?? null;
    if (!raw || typeof raw !== 'string') return null;

    // strip accidental quotes/whitespace
    let clean = raw.trim().replace(/^"+|"+$/g, '');

    // (Optional) normalize Google size to 64px circle
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

  search(val: string) {
    this.q.set(val);
    this.page.set(1);
  }

  filterStatus(val: string) {
    this.st.set(val);
    this.page.set(1);
  }

  setPage(p: number) {
    if (p < 1 || p > this.pages()) return;
    this.page.set(p);
  }

  async mark(id: string, status: ContactStatus) {
    await this.api.update(id, { status }).toPromise();
    await this.load();
    // si c'était l’élément sélectionné dans la modale, gardons-la cohérente
    console.log('this.selected()',this.selected())

    if (this.selected()?. _id === id) {
      this.selected.set({ ...this.selected()!, status });
      if (status === 'done') this.close(); // on ferme si terminé
    }
  }

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

  async markFromModal(status: ContactStatus) {
    const c = this.selected();
    if (!c || !c._id) return;
    await this.mark(c._id, status);
  }

  protected readonly getUrl = getUrl;
}
