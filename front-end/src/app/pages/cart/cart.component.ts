import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth/auth.service';
import { AuthModalService } from '../../services/authModal/auth-modal.service';
import { OrderService } from '../../services/order/order.service';
import { CartService } from '../../services/cart/cart.service';
import { Router } from '@angular/router';
import { CreateOrderInput } from '../../interfaces/OrderItem';

import { FormsModule } from '@angular/forms';
import { NgForOf } from '@angular/common';

import { showAlert} from '../../shared/constant/function';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [FormsModule, NgForOf],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent {
  private auth = inject(AuthService);
  private authModal = inject(AuthModalService);
  private orders = inject(OrderService);
  cart = inject(CartService);
  private router = inject(Router);

  private readonly SHIPPING_FLAT = 8;

  get shipping(): number {
    return this.cart.items().length ? this.SHIPPING_FLAT : 0;
  }
  get total(): number {
    return (this.cart.subtotal() || 0) + this.shipping;
  }

  async checkout() {
    // A) Panier vide
    if (!this.cart.items().length) {
      await showAlert({
        icon: 'warning',
        title: 'Panier vide',
        html: 'Votre panier ne contient aucun article.',
        confirmButtonText: 'OK',
        showCancelButton: false
      });
      return;
    }

    // B) Pas connecté → Login | Register | Annuler
    if (!this.auth.isLoggedIn()) {
      const r = await showAlert({
        icon: 'info',
        title: 'Connexion requise',
        html: 'Pour passer votre commande, connectez-vous ou créez un compte.',
        confirmButtonText: 'Se connecter',
        showDenyButton: true,
        denyButtonText: 'Créer un compte',
        showCancelButton: true,
        cancelButtonText: 'Annuler',
        reverseButtons: true
      });

      if (r.isConfirmed) {
        this.authModal.open({ mode: 'login', patch: { email: '' }, autofocus: true });
      } else if (r.isDenied) {
        this.authModal.open({ mode: 'register', patch: { email: '' }, autofocus: true });
      }
      return;
    }

    // C) Connecté mais sans téléphone OU adresse → demander les 2 via showAlert
    const okContact = await this.ensureContactInfo();
    if (!okContact) return;

    // D) Créer la commande
    try {
      const payload: CreateOrderInput = {
        items: this.cart.items().map(i => ({
          productId: (i as any).productId || (i as any).product || (i as any)._id,
          name: i.name,
          price: i.price, // le back recalcule de toute façon
          qty: i.qty,
          imageUrl: i.imageUrl
        })),
        currency: 'TND'
      };

      const created = await firstValueFrom(this.orders.create(payload));
      this.cart.clear();

      await showAlert({
        icon: 'success',
        title: 'Commande créée',
        html: 'Merci ! Votre commande a été enregistrée.',
        confirmButtonText: 'Voir ma commande',
        showCancelButton: false
      });

      this.router.navigate(['/mes-commandes']);
    } catch (e: any) {
      await showAlert({
        icon: 'error',
        title: 'Erreur',
        html: e?.error?.error || 'Impossible de créer la commande.',
        confirmButtonText: 'OK',
        showCancelButton: false
      });
    }
  }

  /**
   * Vérifie téléphone + adresse. Si manquants → showAlert avec 2 inputs.
   * Valide (regex/simple longueur), sauvegarde via AuthService, puis retourne true.
   */
  private async ensureContactInfo(): Promise<boolean> {
    const user = this.auth.user();
    const hasPhone   = !!(user?.phone && String(user.phone).trim().length >= 6);
    const hasAddress = !!(user?.address && String(user.address).trim().length >= 6);
    if (hasPhone && hasAddress) return true;

    const html = `
      <div style="display:grid;gap:10px;text-align:left">
        <label style="font-weight:600">Téléphone</label>
        <input id="swal-phone" type="tel" class="swal2-input" placeholder="+216 12 345 678"
               value="${(user?.phone ?? '').replace(/"/g,'&quot;')}"
               style="margin:0" />
        <small style="color:#9aa3b2;margin-top:-6px">8–13 caractères (chiffres/espaces/+ - ( ) .)</small>

        <label style="font-weight:600;margin-top:8px">Adresse</label>
        <input id="swal-address" type="text" class="swal2-input" placeholder="Rue, ville…"
               value="${(user?.address ?? '').replace(/"/g,'&quot;')}"
               style="margin:0" />
        <small style="color:#9aa3b2;margin-top:-6px">Minimum 10 caractères</small>
      </div>
    `;

    const res = await showAlert({
      icon: 'info',
      title: 'Informations requises',
      html,
      confirmButtonText: 'Enregistrer',
      cancelButtonText: 'Annuler',
      showCancelButton: true,
      allowOutsideClick: false,
      // ⚠️ on utilise ton preConfirm pour valider & renvoyer les valeurs
      preConfirm: () => {
        const phoneEl = document.getElementById('swal-phone') as HTMLInputElement | null;
        const addrEl  = document.getElementById('swal-address') as HTMLInputElement | null;
        const phone = (phoneEl?.value || '').trim();
        const address = (addrEl?.value || '').trim();

        const phoneOk = /^[0-9 +\-().]{8,13}$/.test(phone);
        const addrOk  = address.length >= 10;

        if (!phoneOk) {
          Swal.showValidationMessage('Téléphone invalide (8–13 caractères).');
          return false;
        }
        if (!addrOk) {
          Swal.showValidationMessage('Adresse trop courte (≥ 10 caractères).');
          return false;
        }
        return { phone, address };
      },
      showLoaderOnConfirm: true
    });

    if (!res.isConfirmed) return false;

    const { phone, address } = (res.value || {}) as { phone: string; address: string };
    try {
      await this.auth.updateProfile({ phone, address });
      await showAlert({
        icon: 'success',
        title: 'Profil mis à jour',
        html: 'Vos coordonnées ont été enregistrées.',
        confirmButtonText: 'Continuer',
        showCancelButton: false
      });
      return true;
    } catch (e: any) {
      await showAlert({
        icon: 'error',
        title: 'Erreur',
        html: e?.error?.error || 'Impossible de sauvegarder les informations.',
        confirmButtonText: 'OK',
        showCancelButton: false
      });
      return false;
    }
  }
}
