import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeAdvantagesComponent } from './home-advantages.component';

describe('HomeAdvantagesComponent', () => {
  let component: HomeAdvantagesComponent;
  let fixture: ComponentFixture<HomeAdvantagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeAdvantagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeAdvantagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
