import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderMenuToggleComponent } from './header-menu-toggle.component';

describe('HeaderMenuToggleComponent', () => {
  let component: HeaderMenuToggleComponent;
  let fixture: ComponentFixture<HeaderMenuToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderMenuToggleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderMenuToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
