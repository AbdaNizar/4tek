import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { DecimalPipe, CommonModule } from '@angular/common';
import { Brand } from '../../../interfaces/brand';
import { getUrl } from '../../../shared/constant/function';

type FiltersForm = FormGroup<{
  brand: FormControl<string | null>;
  brandId: FormControl<string | null>;
}>;

@Component({
  selector: 'app-product-filters',
  standalone: true,
  templateUrl: './product-filters.component.html',
  styleUrls: ['./product-filters.component.css'],
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe, NgxSliderModule]
})
export class ProductFiltersComponent implements OnChanges {
  @Input({ required: true }) form!: FiltersForm;

  @Input() minValue = 0;
  @Input() maxValue = 10000;
  @Input() options!: Options;

  @Input() showTextBrand = false;

  // ✅ Only use brands provided by the parent
  @Input() brands: Brand[] = [];

  @Output() minValueChange = new EventEmitter<number>();
  @Output() maxValueChange = new EventEmitter<number>();
  @Output() filterChange = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  protected readonly getUrl = getUrl;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['brands'] && this.form) {
      const cur = this.form.controls.brandId.value;
      if (cur && !this.brands.some(b => b._id === cur)) {
        this.form.patchValue({ brandId: null }, { emitEvent: true });
      }
    }
  }

  selectBrand(id: string | null) {
    console.log(this.brands)
    const cur = this.form.controls.brandId.value;
    const next = cur === id ? null : id;
    this.form.patchValue({ brandId: next }, { emitEvent: true });
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
