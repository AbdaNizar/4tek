import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubnavMegaComponent } from './subnav-mega.component';

describe('SubnavMegaComponent', () => {
  let component: SubnavMegaComponent;
  let fixture: ComponentFixture<SubnavMegaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubnavMegaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubnavMegaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
