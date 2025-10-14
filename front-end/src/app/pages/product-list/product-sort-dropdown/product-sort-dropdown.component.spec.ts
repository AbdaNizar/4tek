import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductSortDropdownComponent } from './product-sort-dropdown.component';

describe('ProductSortDropdownComponent', () => {
  let component: ProductSortDropdownComponent;
  let fixture: ComponentFixture<ProductSortDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductSortDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductSortDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
