import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderNavDesktopComponent } from './header-nav-desktop.component';

describe('HeaderNavDesktopComponent', () => {
  let component: HeaderNavDesktopComponent;
  let fixture: ComponentFixture<HeaderNavDesktopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderNavDesktopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderNavDesktopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
