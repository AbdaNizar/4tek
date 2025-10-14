import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderBrandComponent } from './header-brand.component';

describe('HeaderBrandComponent', () => {
  let component: HeaderBrandComponent;
  let fixture: ComponentFixture<HeaderBrandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderBrandComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderBrandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
