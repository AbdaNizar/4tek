import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { CartComponent } from './app/pages/cart/cart.component';
import { ProductDetailComponent } from './app/pages/product-detail/product-detail.component';
import { LoginComponent } from './app/pages/admin/login/login.component';
import { PublicLayoutComponent } from './app/layout/public-layout/public-layout.component';
import { adminCanMatch } from './app/guards/admin.can-match.guard';
import { ProductListComponent } from './app/pages/product-list/product-list.component';
import { environment } from './environments/environment';
import {APP_INITIALIZER, enableProdMode} from '@angular/core';
import { MyOrdersComponent } from './app/pages/my-orders/my-orders.component';
import {apiPrefixInterceptor} from './app/core/api-prefix.interceptor';
import {credentialsInterceptor} from './app/core/credentials.interceptor';
import {refreshInterceptor} from './app/core/refresh.interceptor';
import {apiInterceptor} from './app/core/api.interceptor';
import {AuthService} from './app/services/auth/auth.service';

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
      { path: 'mes-commandes', component: MyOrdersComponent },
    ]
  },
  {
    path: 'admin',
    canMatch: [adminCanMatch],
    data: { hideShell: true },
    loadChildren: () => import('./app/pages/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  { path: 'login', data: { hideShell: true }, component: LoginComponent },
  { path: '**', redirectTo: '' },
];

if (environment.production) enableProdMode();

function initAuth(auth: AuthService) {
  return () => auth.whenReady(); // bloque le bootstrap jusqu’à /auth/me
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: APP_INITIALIZER, useFactory: initAuth, deps: [AuthService], multi: true },

    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })
    ),
    provideHttpClient(withInterceptors([
      apiInterceptor,
      apiPrefixInterceptor,       // 1) add /v1 and base URL
      credentialsInterceptor,     // 2) send cookies on every request
      refreshInterceptor,         // 3) auto refresh on 401 then retry
    ])),
  ]
}).catch(console.error);
