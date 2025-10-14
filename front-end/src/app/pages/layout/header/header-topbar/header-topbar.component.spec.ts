import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderTopbarComponent } from './header-topbar.component';

describe('HeaderTopbarComponent', () => {
  let component: HeaderTopbarComponent;
  let fixture: ComponentFixture<HeaderTopbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderTopbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderTopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
