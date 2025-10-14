import {Component, EventEmitter, Input, Output, inject, OnInit} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {NgxSliderModule, Options} from '@angular-slider/ngx-slider';
import { BrandService } from '../../../services/brand/brand.service';
import { Brand } from '../../../interfaces/brand';
import { getUrl } from '../../../shared/constant/function';
import {DecimalPipe, CommonModule} from '@angular/common';

type FiltersForm = FormGroup<{
  brand: FormControl<string | null>;
  brandId: FormControl<string | null>;
}>;

@Component({
  selector: 'app-product-filters',
  standalone: true,
  templateUrl: './product-filters.component.html',
  styleUrls: ['./product-filters.component.css'],
  imports: [
    CommonModule,          // <— important pour *ngIf/*ngFor
    ReactiveFormsModule,
    DecimalPipe,
    NgxSliderModule
  ]
})
export class ProductFiltersComponent implements OnInit {
  @Input({ required: true }) form!: FiltersForm;
  @Input() minValue = 0;
  @Input() maxValue = 10000;
  @Input() options!: Options;
  @Input() showTextBrand = false;
  @Output() minValueChange = new EventEmitter<number>();
  @Output() maxValueChange = new EventEmitter<number>();
  @Output() filterChange = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  private brandApi = inject(BrandService);
  brands: Brand[] = [];

  protected readonly getUrl = getUrl;

  ngOnInit() {
    // true => uniquement actives (selon ton service)
    this.brandApi.list(true).subscribe(list => this.brands = list || []);
  }

  selectBrand(id: string) {
    const cur = this.form.value.brandId;

    this.form.patchValue({ brandId: cur === id ? null : id }, { emitEvent: true });
    this.filterChange.emit();
  }

  trackByBrand = (_: number, b: Brand) => b._id;

  onMinChange(v: number) { this.minValue = v; this.minValueChange.emit(v); }
  onMaxChange(v: number) { this.maxValue = v; this.maxValueChange.emit(v); }
  onReset() {
    this.form.patchValue({ brandId: null, brand: null }, { emitEvent: true });
    this.reset.emit();
  }
}
