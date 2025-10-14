import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OauthCompleteComponent } from './oauth-complete.component';

describe('OauthCompleteComponent', () => {
  let component: OauthCompleteComponent;
  let fixture: ComponentFixture<OauthCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OauthCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OauthCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
