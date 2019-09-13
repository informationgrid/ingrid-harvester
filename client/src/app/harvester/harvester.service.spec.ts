import { TestBed } from '@angular/core/testing';

import { HarvesterService } from './harvester.service';

describe('HarvesterService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: HarvesterService = TestBed.get(HarvesterService);
    expect(service).toBeTruthy();
  });
});
