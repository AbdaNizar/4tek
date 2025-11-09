import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUserConsumptionComponent } from './admin-user-consumption.component';

describe('AdminUserConsumptionComponent', () => {
  let component: AdminUserConsumptionComponent;
  let fixture: ComponentFixture<AdminUserConsumptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUserConsumptionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminUserConsumptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
