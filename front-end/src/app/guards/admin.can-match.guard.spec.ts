import { TestBed } from '@angular/core/testing';
import { CanMatchFn } from '@angular/router';

import { adminCanMatchGuard } from './admin.can-match.guard';

describe('adminCanMatchGuard', () => {
  const executeGuard: CanMatchFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => adminCanMatchGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
