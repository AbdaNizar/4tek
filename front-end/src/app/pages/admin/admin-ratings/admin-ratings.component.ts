import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RatingService } from '../../../services/rating/rating.service';
import { Rating } from '../../../interfaces/rating';
import { getUrl } from '../../../shared/constant/function';
import { showAlert} from '../../../shared/constant/function';

@Component({
  selector: 'app-admin-ratings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-ratings.component.html',
  styleUrls: ['./admin-ratings.component.css']
})
export class RatingsComponent implements OnInit {
  private api = inject(RatingService);

  // Table state
  loading   = signal(true);
  items     = signal<Rating[]>([]);
  total     = signal(0);
  page      = signal(1);
  pageSize  = signal(20);
  pages     = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  q         = signal<string>('');
  status    = signal<string>(''); // '', 'pending', 'approved', 'rejected'

  // Modal
  modalOpen = signal(false);
  selected  = signal<Rating | null>(null);

  // Action loading (pour spinner & disable)
  actionLoading = signal<'approve'|'reject'|'remove'|null>(null);
  actionBusy    = computed(() => this.actionLoading() !== null);

  ngOnInit(): void { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.api.list({
        q: this.q(),
        status: this.status(),
        page: this.page(),
        pageSize: this.pageSize()
      }).toPromise();

      this.items.set(res?.items || []);
      this.total.set(res?.total || 0);
    } finally {
      this.loading.set(false);
    }
  }

  // Controls
  search(v: string) { this.q.set(v); this.page.set(1); this.load(); }
  filterStatus(s: string) { this.status.set(s); this.page.set(1); this.load(); }
  setPage(n: number) { if (n < 1 || n > this.pages()) return; this.page.set(n); this.load(); }

  // Modal
  open(row: Rating) { this.selected.set(row); this.modalOpen.set(true); }
  close() { this.modalOpen.set(false); this.selected.set(null); }

  // Helpers
  starsArray(n: number) { return Array.from({ length: 5 }, (_, i) => i < n); }
  productName(row: Rating) { return row.product?.name || `#${String(row.productId).slice(-6)}`; }
  productImage(row: Rating) { return getUrl(row.product?.imageUrl) || '/assets/placeholder.jpg'; }
  productLink(row: Rating) { return row.product?.slug ? ['/product', row.product.slug] : ['/']; }

  private patchRow(updated?: Rating) {
    if (!updated) return;
    this.items.update(list => list.map(x => x._id === updated._id ? { ...x, ...updated } : x));
    const cur = this.selected();
    if (cur && cur._id === updated._id) this.selected.set({ ...cur, ...updated });
  }

  // ===== Actions avec SweetAlert + loader =====
  async approve(row: Rating) {
    if (this.actionBusy()) return;
    const res = await showAlert({
      icon: 'question',
      title: 'Approuver cet avis ?',
      html: `<div style="text-align:left">
               <p><b>Utilisateur :</b> ${row.user?.name || '—'} (${row.user?.email || '—'})</p>
               <p><b>Produit :</b> ${this.productName(row)}</p>
               <p><b>Note :</b> ${row.stars}/5</p>
             </div>`,
      showCancelButton: true,
      confirmButtonText: 'Oui, approuver',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false,
      preConfirm: async () => {
        this.actionLoading.set('approve');
        try {
          const updated = await this.api.setStatus(row._id, 'approved').toPromise();
          this.patchRow(updated);
          return true;
        } catch (e: any) {
          throw new Error(e?.error?.error || e?.message || 'Échec de l’approbation');
        } finally {
          this.actionLoading.set(null);
        }
      }
    });
    if (!res.isConfirmed) return;
    await showAlert({ icon: 'success', title: 'Avis approuvé', confirmButtonText: 'OK' });
  }

  async reject(row: Rating) {
    if (this.actionBusy()) return;
    const res = await showAlert({
      icon: 'warning',
      title: 'Rejeter cet avis ?',
      html: `<div style="text-align:left">
               <p>Cet avis ne sera plus visible publiquement.</p>
             </div>`,
      showCancelButton: true,
      confirmButtonText: 'Oui, rejeter',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false,
      preConfirm: async () => {
        this.actionLoading.set('reject');
        try {
          const updated = await this.api.setStatus(row._id, 'rejected').toPromise();
          this.patchRow(updated);
          return true;
        } catch (e: any) {
          throw new Error(e?.error?.error || e?.message || 'Échec du rejet');
        } finally {
          this.actionLoading.set(null);
        }
      }
    });
    if (!res.isConfirmed) return;
    await showAlert({ icon: 'success', title: 'Avis rejeté', confirmButtonText: 'OK' });
  }

  async remove(row: Rating) {
    if (this.actionBusy()) return;
    const res = await showAlert({
      icon: 'error',
      title: 'Supprimer définitivement ?',
      html: `<div style="text-align:left">
               <p>Cette action est irréversible.</p>
             </div>`,
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#ef4444',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => false,
      preConfirm: async () => {
        this.actionLoading.set('remove');
        try {
          await this.api.remove(row._id).toPromise();
          this.items.update(list => list.filter(x => x._id !== row._id));
          // si on supprime l’élément visible dans la modale, on ferme
          if (this.selected()?._id === row._id) this.close();
          return true;
        } catch (e: any) {
          throw new Error(e?.error?.error || e?.message || 'Échec de la suppression');
        } finally {
          this.actionLoading.set(null);
        }
      }
    });
    if (!res.isConfirmed) return;
    await showAlert({ icon: 'success', title: 'Avis supprimé', confirmButtonText: 'OK' });
  }
}
