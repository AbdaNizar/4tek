// product-detail.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  NgIf,
  NgFor,
  CurrencyPipe,
  KeyValuePipe,
  SlicePipe,
  DecimalPipe,
  DatePipe,
  UpperCasePipe
} from '@angular/common';
import { ProductService } from '../../services/product/product.service';
import { CartService } from '../../services/cart/cart.service';
import {getUrl, showAlert} from '../../shared/constant/function';
import { Product} from '../../interfaces/product';
import {FormsModule} from '@angular/forms';
import {AuthModalService} from '../../services/authModal/auth-modal.service';
import {AuthService} from '../../services/auth/auth.service';
import {RatingService} from '../../services/rating/rating.service';

@Component({
  standalone: true,
  selector: 'app-product-detail',
  imports: [NgIf, NgFor, FormsModule, CurrencyPipe, KeyValuePipe, SlicePipe, DecimalPipe, DatePipe, UpperCasePipe],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api   = inject(ProductService);
  private cart  = inject(CartService);

  product = signal<Product | null>(null);
  images  = signal<string[]>([]);
  activeIndex = signal(0);
  qty = signal(1);

  // remise en %
  discount = computed(() => {
    const p = this.product();
    if (!p?.oldPrice || !p.price) return null;
    return Math.round((1 - p.price / p.oldPrice) * 100);
  });
  private ratingApi = inject(RatingService);
  protected auth = inject(AuthService);
  private authModal = inject(AuthModalService);

// signals for ratings
  avgRating = signal(0);
  ratingsCount = signal(0);
  ratings = signal<any[]>([]);
  myRating = signal<any | null>(null);
  saving = signal(false);
// === Zoom state ===
  zoomed = false;
  zoomCX = 50; // transform-origin X en %
  zoomCY = 50; // transform-origin Y en %

// form state
  formStars = signal(0);
  formComment = '';
  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.api.getBySlug(slug).subscribe(p => {
      this.product.set(p);
      const cover = p.imageUrl ? [p.imageUrl] : [];
      const gall  = Array.isArray(p.gallery) ? p.gallery : [];
      this.images.set([...cover, ...gall]);
      this.activeIndex.set(0);
      this.loadRatings(p._id);
    });
  }

  selectImage(i: number) { this.activeIndex.set(i); }
  inc() { this.qty.update(v => Math.min(99, v + 1)); }
  dec() { this.qty.update(v => Math.max(1, v - 1)); }

  addToCart() {
    const p = this.product();
    if (!p) return;
    this.cart.add({
      product: p._id,
      name: p.name,
      price: p.price,
      qty: this.qty(),
      imageUrl: this.images()[0] ? getUrl(this.images()[0]) : undefined
    });
  }

  protected readonly getUrl = getUrl;
  protected readonly Math = Math;




private loadRatings(productId: string) {
  this.ratingApi.listForProduct(productId).subscribe(res => {
    this.ratings.set(res.items);
    console.log( this.ratings())
    this.ratingsCount.set(res.count);
    this.avgRating.set(res.avg || 0);
  });

  if (this.auth.isLoggedIn()) {
    this.ratingApi.getMine(productId).subscribe(r => {
      this.myRating.set(r);
      if (r) {
        this.formStars.set(r.stars);
        this.formComment = r.comment || '';
      }
    });
  }
}


setStars(v: number) { this.formStars.set(v); }

askLoginOrRegister() {
  showAlert({
    icon: 'info',
    title: 'Connexion requise',
    html: 'Pour laisser un avis, connecte-toi ou crée un compte.',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: 'Se connecter',
    denyButtonText: 'Créer un compte',
    cancelButtonText: 'Annuler',
  }).then(res => {
    if (res.isConfirmed) {
      this.authModal.open({ mode: 'login', autofocus: true });
    } else if (res.isDenied) {
      this.authModal.open({ mode: 'register', autofocus: true });
    }
  });
}

async submitRating() {
  if (!this.auth.isLoggedIn()) {
    this.askLoginOrRegister();
    return;
  }
  const p = this.product();
  if (!p?._id) return;

  const stars = this.formStars();
  const comment = (this.formComment || '').trim();
  if (stars < 1 || stars > 5) {
    await showAlert({ icon: 'error', title: 'Note invalide', html: 'Choisis entre 1 et 5 étoiles.' });
    return;
  }
  this.saving.set(true);
  this.ratingApi.createOrUpsert({ productId: p._id, stars, comment })
    .subscribe({
      next: async (row) => {
        this.myRating.set(row);
        this.loadRatings(p._id);
        this.saving.set(false);
        await showAlert({
          icon: 'success',
          title: 'Merci pour votre avis',
          html: 'Votre avis est soumis à validation par l’administrateur.'
        });
      },
      error: async (e) => {
        this.saving.set(false);
        await showAlert({ icon: 'error', title: 'Erreur', html: e?.error?.error || 'Impossible d’envoyer l’avis.' });
      }
    });

}


  toggleZoom(e: MouseEvent | TouchEvent) {
    this.zoomed = !this.zoomed;
    if (this.zoomed) this.onZoomMove(e); // positionner direct à l’endroit du clic/touch
  }

  onZoomMove(e: any) {
    if (!this.zoomed) return;
    const target = (e.currentTarget as HTMLElement);
    const rect = target.getBoundingClientRect();

    let clientX: number, clientY: number;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // clamp 5–95 pour éviter de “sortir” aux bords
    const x = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(95, Math.max(5, ((clientY - rect.top) / rect.height) * 100));

    this.zoomCX = x;
    this.zoomCY = y;
  }

}
