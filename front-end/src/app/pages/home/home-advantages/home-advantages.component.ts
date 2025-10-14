import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

interface Advantage {
  icon: string;   // SVG inline ou chemin vers icône
  title: string;
  description: string;
}

@Component({
  standalone: true,
  selector: 'app-home-advantages',
  imports: [NgFor],
  templateUrl: './home-advantages.component.html',
  styleUrls: ['./home-advantages.component.css']
})
export class HomeAdvantagesComponent {
  advantages: Advantage[] = [
    {
      icon: '🚚',
      title: 'Livraison rapide',
      description: 'Recevez vos commandes partout en Tunisie en 24-48h.'
    },
    {
      icon: '💵',
      title: 'Paiement à la livraison',
      description: 'Payez en toute sécurité une fois votre commande reçue.'
    },
    {
      icon: '🔒',
      title: 'Produits garantis',
      description: 'Des articles testés et garantis par notre équipe technique.'
    },
    {
      icon: '📱',
      title: 'Support WhatsApp',
      description: 'Une assistance rapide et directe sur WhatsApp 7j/7.'
    }
  ];
}
