import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CswHarvesterComponent } from './csw-harvester.component';

describe('CswHarvesterComponent', () => {
  let component: CswHarvesterComponent;
  let fixture: ComponentFixture<CswHarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CswHarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CswHarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
