import {bootstrapApplication} from '@angular/platform-browser';
import {provideRouter, Routes, withInMemoryScrolling} from '@angular/router';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {AppComponent} from './app/app.component';
import {CartComponent} from './app/pages/cart/cart.component';
import {ProductDetailComponent} from './app/pages/product-detail/product-detail.component';
import {apiInterceptor} from './app/core/api.interceptor';
import {LoginComponent} from './app/pages/admin/login/login.component';
import {authInterceptor} from './app/core/auth.interceptor';
import {PublicLayoutComponent} from './app/layout/public-layout/public-layout.component';
import {OauthCompleteComponent} from './app/pages/oauth-complete/oauth-complete.component';
import {adminCanMatch} from './app/guards/admin.can-match.guard';
import {ProductListComponent} from './app/pages/product-list/product-list.component';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';
import {apiPrefixInterceptor} from './app/core/api-prefix.interceptor';
import {MyOrdersComponent} from './app/pages/my-orders/my-orders.component';

const routes: Routes = [

  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./app/pages/home/home.component').then(m => m.HomeComponent) },
      { path: 'categories', loadComponent: () => import('./app/pages/category/category.component').then(m => m.CategoryComponent) },
      { path: 'categories/:id', loadComponent: () => import('./app/pages/category/category.component').then(m => m.CategoryComponent) },
      { path: 'product/:slug', component: ProductDetailComponent },
      { path: 'categories/sub-categories/:id', component: ProductListComponent },
      { path: 'contact', loadComponent: () => import('./app/pages/contact/contact.component').then(m => m.ContactComponent) },
      { path: 'panier', component: CartComponent },
      { path: 'reset-password/:token', loadComponent: () => import('./app/pages/home/home.component').then(m => m.HomeComponent) },
      { path: 'oauth-complete', component: OauthCompleteComponent },
      { path: 'mes-commandes', component: MyOrdersComponent },          // user

    ]
  },
  {
    path: 'admin',
    canMatch: [adminCanMatch],
    data: { hideShell: true },
    loadChildren: () => import('./app/pages/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  { path: 'login',data: { hideShell: true }, component: LoginComponent },

  { path: '**', redirectTo: '' },

];
if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      })
    ),
    provideHttpClient(withInterceptors([apiInterceptor,apiPrefixInterceptor, authInterceptor]))
  ]
}).catch(console.error);
