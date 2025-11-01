import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order/order.service';
import { Order, OrderStatus } from '../../../interfaces/OrderItem';
import { showAlert} from '../../../shared/constant/function';

@Component({
  standalone: true,
  selector: 'app-admin-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css'],
})
export class AdminOrdersComponent implements OnInit {
  private api = inject(OrderService);

  // liste
  items = signal<Order[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  q = signal('');
  status = signal<OrderStatus | ''>('');
  loading = signal(false);

  // modal
  modalOpen = signal(false);
  selected = signal<Order | null>(null);
  noteDraft = signal('');

  // loaders des actions dans la modale
  actionLoading = signal<OrderStatus | 'note' | null>(null);
  actionBusy = computed(() => this.actionLoading() !== null);

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.api
        .adminList({
          page: this.page(),
          pageSize: this.pageSize(),
          q: this.q(),
          status: this.status() || undefined,
        })
        .toPromise();

      this.items.set(res?.items ?? []);
      this.total.set(res?.total ?? 0);
    } finally {
      this.loading.set(false);
    }
  }

  pages() {
    return Math.max(1, Math.ceil(this.total() / this.pageSize()));
  }
  setPage(p: number) {
    this.page.set(Math.min(Math.max(1, p), this.pages()));
    this.load();
  }

  search(v: string) {
    this.q.set(v);
    this.page.set(1);
    this.load();
  }
  filterStatus(v: string) {
    this.status.set((v || '') as any);
    this.page.set(1);
    this.load();
  }

  async open(o: Order) {
    const fresh = await this.api.adminGet(o._id).toPromise();
    this.selected.set(fresh!);
    this.noteDraft.set(fresh?.note || '');
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }
  close() {
    this.modalOpen.set(false);
    document.body.style.overflow = '';
  }

  // ------------ Actions avec SweetAlert + loader ------------
  private statusLabel(s: OrderStatus) {
    switch (s) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'shipped': return 'Expédiée';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
    }
  }

  async setStatus(s: OrderStatus) {
    const o = this.selected();
    if (!o || this.actionBusy()) return;

    // Confirmation
    const label = this.statusLabel(s);
    const currentLabel = this.statusLabel(o.status);
    const confirmRes = await showAlert({
      icon: 'question',
      title: 'Confirmer le changement de statut',
      html: `
        <div style="text-align:left">
          <p>Voulez-vous vraiment passer la commande</p>
          <p><b>#${o._id}</b> de <b>${currentLabel}</b> → <b>${label}</b> ?</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Oui, continuer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false,
      preConfirm: async () => {
        // on lance vraiment l’action ici pour montrer le loader SweetAlert
        this.actionLoading.set(s);
        try {
          const updated = await this.api.adminUpdateStatus(o._id, s).toPromise();
          this.selected.set(updated!);
          await this.load();
          return true;
        } catch (err: any) {
          throw new Error(err?.error?.error || err?.message || 'Échec de la mise à jour');
        } finally {
          this.actionLoading.set(null);
        }
      },
    });

    // Si l’utilisateur a annulé via cancel, rien à faire
    if (!confirmRes.isConfirmed) return;

    // Succès
    await showAlert({
      icon: 'success',
      title: 'Statut mis à jour',
      html: `<div>La commande est maintenant <b>${label}</b>.</div>`,
      confirmButtonText: 'Ok',
    });
  }

  async saveNote() {
    const o = this.selected();
    if (!o || this.actionBusy()) return;

    if ((o.note || '') === this.noteDraft().trim()) {
      await showAlert({
        icon: 'info',
        title: 'Aucune modification',
        html: `<div>La note n'a pas changé.</div>`,
        confirmButtonText: 'Ok',
      });
      return;
    }

    const confirmRes = await showAlert({
      icon: 'question',
      title: 'Enregistrer la note ?',
      html: `<div>Cette note sera visible uniquement par l'équipe.</div>`,
      showCancelButton: true,
      confirmButtonText: 'Enregistrer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false,
      preConfirm: async () => {
        this.actionLoading.set('note');
        try {
          const updated = await this.api
            .adminUpdateNote(o._id, this.noteDraft().trim())
            .toPromise();
          this.selected.set(updated!);
          await this.load();
          return true;
        } catch (err: any) {
          throw new Error(err?.error?.error || err?.message || 'Échec de l’enregistrement');
        } finally {
          this.actionLoading.set(null);
        }
      },
    });

    if (!confirmRes.isConfirmed) return;

    await showAlert({
      icon: 'success',
      title: 'Note enregistrée',
      confirmButtonText: 'Ok',
    });
  }
}
