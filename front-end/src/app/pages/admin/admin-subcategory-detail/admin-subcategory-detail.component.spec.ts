import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSubcategoryDetailComponent } from './admin-subcategory-detail.component';

describe('AdminSubcategoryDetailComponent', () => {
  let component: AdminSubcategoryDetailComponent;
  let fixture: ComponentFixture<AdminSubcategoryDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSubcategoryDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminSubcategoryDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
