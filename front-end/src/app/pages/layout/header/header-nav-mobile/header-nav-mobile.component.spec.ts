import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderNavMobileComponent } from './header-nav-mobile.component';

describe('HeaderNavMobileComponent', () => {
  let component: HeaderNavMobileComponent;
  let fixture: ComponentFixture<HeaderNavMobileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderNavMobileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderNavMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
