// src/app/components/toasts/toasts.component.ts
import { Component, inject } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-toasts',
  imports: [NgFor, NgClass],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      <div *ngFor="let t of toast.list()" class="toast" [ngClass]="t.kind">
        <span class="dot" aria-hidden="true"></span>
        <span class="text">{{ t.text }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      /* Permet de cliquer au travers du conteneur, sauf sur les toasts eux-mêmes */
      pointer-events: none;
      --header-height: 90px; /* ajuste si ton header est plus haut */
    }

    /* ====== CONTAINER (toujours sous le header) ====== */
    .toasts {
      position: fixed;
      z-index: 9999;
      top: calc(60px + env(safe-area-inset-top, 0px) + 12px);
      right: 16px;
      display: grid;
      gap: 10px;
      max-width: min(520px, 92vw);
    }

    /* Largeur fluide au mobile et centrage horizontal */
    @media (max-width: 640px) {
      .toasts {
        left: 12px;
        right: 12px;
        margin: 0 auto;
        max-width: min(100px, 92vw);
      }
    }

    /* ====== TOAST ====== */
    .toast {
      pointer-events: auto; /* clickable */
      display: grid;
      grid-template-columns: 10px 1fr;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 14px;
      backdrop-filter: blur(12px) saturate(140%);
      -webkit-backdrop-filter: blur(12px) saturate(140%);
      background:
        radial-gradient(100% 120% at -10% -20%, rgba(34,211,238,.08), transparent 60%),
        rgba(18, 24, 38, .90);
      border: 1px solid rgba(255, 255, 255, .10);
      box-shadow:
        0 10px 30px rgba(0,0,0,.35),
        inset 0 1px 0 rgba(255,255,255,.06);
      color: #e6eaf2;
      min-width: 240px;
      animation: slideFadeIn .35s cubic-bezier(.2,.6,.3,1) both;
      will-change: transform, opacity;
    }

    .text {
      font-size: 14px;
      line-height: 1.35;
      letter-spacing: .2px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      box-shadow: 0 0 0 3px rgba(255,255,255,.06) inset;
    }

    /* Variantes */
    .toast.success { border-color: rgba(16,185,129,.35) }
    .toast.error   { border-color: rgba(239,68,68,.35) }
    .toast.info    { border-color: rgba(34,211,238,.35) }

    .success .dot { background: #10b981; }
    .error   .dot { background: #ef4444; }
    .info    .dot { background: #22d3ee; }

    /* Effet hover (desktop) */
    @media (hover:hover) {
      .toast:hover {
        transform: translateY(-1px);
        box-shadow:
          0 14px 36px rgba(0,0,0,.42),
          inset 0 1px 0 rgba(255,255,255,.08);
      }
    }

    /* Animation entrée */
    @keyframes slideFadeIn {
      from { opacity: 0; transform: translateY(-8px) }
      to   { opacity: 1; transform: translateY(0) }
    }

    /* Respecte l’option “réduire les animations” */
    @media (prefers-reduced-motion: reduce) {
      .toast { animation: none; }
    }
  `]
})
export class ToastsComponent {
  toast = inject(ToastService);
}
