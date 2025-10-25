import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopularCatsCarouselComponent } from './popular-cats-carousel.component';

describe('PopularCatsCarouselComponent', () => {
  let component: PopularCatsCarouselComponent;
  let fixture: ComponentFixture<PopularCatsCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopularCatsCarouselComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopularCatsCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
