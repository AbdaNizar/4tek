import { Injectable, signal } from '@angular/core';

export type Toast = { id: number; text: string; kind?: 'success'|'error'|'info' };

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _list = signal<Toast[]>([]);
  list = this._list.asReadonly();
  private seq = 1;

  show(text: string, kind: Toast['kind'] = 'info', ms = 2500) {
    const id = this.seq++;
    const toast = { id, text, kind };
    this._list.update(arr => [...arr, toast]);
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number) {
    this._list.update(arr => arr.filter(t => t.id !== id));
  }
}
