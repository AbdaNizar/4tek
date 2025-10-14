import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.css']
})
export class ContactUsComponent {
  phone = 'tel:+21600000000';
  whatsapp = 'https://wa.me/21600000000';
  messenger = 'https://m.me/votrepage';
  email = 'mailto:contact@4tek.com';
}
