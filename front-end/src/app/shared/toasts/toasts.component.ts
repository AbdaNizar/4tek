import {Component, inject} from '@angular/core';
import {NgFor, NgClass} from '@angular/common';
import {ToastService} from '../../services/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-toasts',
  imports: [NgFor, NgClass],
  template: `
    <div class="toasts">
      <div *ngFor="let t of toast.list()" class="toast" [ngClass]="t.kind">
        <span class="dot"></span>{{ t.text }}
      </div>
    </div>`,
  styles: [`
    .toasts {
      position: fixed;
      right: 30px;
      top: 90px;
      display: grid;
      gap: 10px;
      z-index: 9999
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(18, 24, 38, .96);
      border: 1px solid rgba(255, 255, 255, .08);
      padding: 10px 12px;
      border-radius: 12px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, .35);
      color: #e5e7eb;
      min-width: 220px;
      animation: fadeIn .550s ease;
    }

    .toast.success {
      border-color: rgba(16, 185, 129, .35)
    }

    .toast.error {
      border-color: rgba(239, 68, 68, .35)
    }

    .toast.info {
      border-color: rgba(34, 211, 238, .35)
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%
    }

    .success .dot {
      background: rgba(16, 185, 129, 0.53)
    }

    .error .dot {
      background: rgba(239, 68, 68, 0.68)
    }

    .info .dot {
      background: rgba(34, 211, 238, 0.66)
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-6px)
      }
      to {
        opacity: 1;
        transform: translateY(0)
      }
    }
  `]
})
export class ToastsComponent {
  toast = inject(ToastService);
}
