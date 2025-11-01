// src/app/pages/admin/admin.routes.ts
import {Routes} from '@angular/router';
import {AdminShellComponent} from './shell/admin-shell/admin-shell.component';

export const ADMIN_ROUTES: Routes = [
    {
        path: '',
        component: AdminShellComponent,
        children: [
            {
                path: '',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.AdminDashboardComponent)
            },
            {
                path: 'categories',
                loadComponent: () => import('./admin-categories/admin-categories.component').then(m => m.AdminCategoriesComponent)
            },
            {
                path: 'categories/:id',
                loadComponent: () =>
                    import('./admin-category-detail/admin-category-detail.component')
                        .then(m => m.AdminCategoryDetailComponent),
            }  ,  {
                path: 'sous-categories',
                loadComponent: () =>
                    import('./admin-subcategories/admin-subcategories.component')
                        .then(m => m.AdminSubcategoriesComponent),
            }  , {
                path: 'sous-categories/:id',
                loadComponent: () =>
                    import('./admin-subcategory-detail/admin-subcategory-detail.component' ).then(m => m.AdminSubcategoryDetailComponent),
          }  ,    {


                path: 'brands',
                loadComponent: () =>
                    import('./admin-brands/admin-brands.component').then(m =>m.AdminBrandsComponent)

            }  ,
          {
            path: 'produits',
            loadComponent: () => import('./admin-products/admin-products.component').then(m => m.AdminProductsComponent)
          }, {
            path: 'produits/:id',
            loadComponent: () => import('./admin-product-detail/admin-product-detail.component').then(m=>m.ProductDetailComponent)
          },  {
            path: 'contacts',
          loadComponent: () => import('./admin-contacts/admin-contacts.component').then(m => m.AdminContactsComponent)
          }, {
            path: 'commandes',
          loadComponent: () => import('./admin-orders/admin-orders.component').then(m => m.AdminOrdersComponent)
          }, {
            path: 'utilisateurs',
          loadComponent: () => import('./admin-users/admin-users.component').then(m => m.AdminUsersComponent)
          }, {
            path: 'avis',
          loadComponent: () => import('./admin-ratings/admin-ratings.component').then(m => m.RatingsComponent)
          },
        ]
    }
];
