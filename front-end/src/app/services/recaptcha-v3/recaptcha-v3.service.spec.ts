import { TestBed } from '@angular/core/testing';

import { RecaptchaV3Service } from './recaptcha-v3.service';

describe('RecaptchaV3Service', () => {
  let service: RecaptchaV3Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecaptchaV3Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
