// app-newsletter.component.ts
import {Component} from '@angular/core';
@Component({
  standalone:true,
  selector:'app-newsletter',
  template:`
  <form class="nl" (submit)="subscribe($event)">
    <div class="left">
      <h3>Inscrivez-vous à la newsletter</h3>
      <p class="muted">Promos, nouveautés et guides — 1 à 2 mail par mois.</p>
    </div>
    <div class="right">
      <input required type="email" placeholder="Votre email">
      <button class="btn btn-primary" type="submit">S’inscrire</button>
    </div>
  </form>
  `,
  styles:[`
  .nl{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;
    background:var(--surface);border:1px solid rgba(255,255,255,.08);
    border-radius:16px;padding:16px}
  input{padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);
    background:var(--card);color:var(--text);min-width:260px}
  @media(max-width:720px){.nl{grid-template-columns:1fr}.right{display:flex;gap:8px;flex-wrap:wrap}}
  `]
})
export class NewsletterComponent{
  subscribe(ev:Event){ ev.preventDefault(); /* TODO: appel API */ alert('Merci !'); }
}
