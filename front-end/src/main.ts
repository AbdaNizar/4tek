import {bootstrapApplication} from '@angular/platform-browser';
import {provideRouter, Routes} from '@angular/router';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {AppComponent} from './app/app.component';
import {CartComponent} from './app/pages/cart/cart.component';
import {ProductDetailComponent} from './app/pages/product-detail/product-detail.component';
import {apiInterceptor} from './app/core/api.interceptor';
import {AdminDashboardComponent} from './app/pages/admin/dashboard/dashboard.component';
import {LoginComponent} from './app/pages/admin/login/login.component';
import {adminGuard} from './app/core/admin.guard';
import {authInterceptor} from './app/core/auth.interceptor';
import {PublicLayoutComponent} from './app/layout/public-layout/public-layout.component';
import {AdminLayoutComponent} from './app/layout/admin-layout/admin-layout.component';
import {OauthCompleteComponent} from './app/pages/oauth-complete/oauth-complete.component';
import {AdminCategoryDetailComponent} from './app/pages/admin/admin-category-detail/admin-category-detail.component';
import {AdminCategoriesComponent} from './app/pages/admin/admin-categories/admin-categories.component';
import {adminCanMatch} from './app/guards/admin.can-match.guard';
import {ProductListComponent} from './app/pages/product-list/product-list.component';


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

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor, authInterceptor]))
  ]
}).catch(console.error);
