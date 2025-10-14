import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionSeparatorComponent } from './section-separator.component';

describe('SectionSeparatorComponent', () => {
  let component: SectionSeparatorComponent;
  let fixture: ComponentFixture<SectionSeparatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionSeparatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectionSeparatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
