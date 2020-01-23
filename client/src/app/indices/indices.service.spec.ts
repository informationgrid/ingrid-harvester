import { TestBed } from '@angular/core/testing';

import { IndicesService } from './indices.service';

describe('IndicesService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: IndicesService = TestBed.get(IndicesService);
    expect(service).toBeTruthy();
  });
});
