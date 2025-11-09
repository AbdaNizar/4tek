import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandStripComponent } from './brand-strip.component';

describe('BrandStripComponent', () => {
  let component: BrandStripComponent;
  let fixture: ComponentFixture<BrandStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandStripComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
