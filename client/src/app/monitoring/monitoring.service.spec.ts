import { TestBed } from '@angular/core/testing';

import { MonitoringService } from './monitoring.service';

describe('MonitoringService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MonitoringService = TestBed.get(MonitoringService);
    expect(service).toBeTruthy();
  });
});
