import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {SubcategoryService} from '../../../services/subcategory/subcategory.service';
import {SubCategory} from '../../../interfaces/SubCategory';
import {Category} from '../../../interfaces/category';
import {getUrl} from '../../../shared/constant/function';

@Component({
  selector: 'app-admin-subcategory-detail',
  imports: [NgIf, NgFor, DatePipe],
  templateUrl: './admin-subcategory-detail.component.html',
  standalone: true,
  styleUrl: './admin-subcategory-detail.component.css'
})
export class AdminSubcategoryDetailComponent implements OnInit {


  private route = inject(ActivatedRoute);
  private api =  inject(SubcategoryService);

  loading = signal(true);
  subcat = signal<SubCategory | null>(null);
  descExpanded = signal(false);


  toggleDesc(){ this.descExpanded.update(v => !v); }

  parentName = computed(() => {
    const p = this.subcat()?.parent as Category | string | undefined;
    if (!p) return '—';
    return typeof p === 'string' ? p : (p.name || '—');
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    try{
      const data :any  = await this.api.getOne(id).toPromise();
      console.log('data', data);
      this.subcat.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly getUrl = getUrl;
}
