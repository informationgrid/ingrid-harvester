import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HarvesterComponent } from './harvester.component';

describe('HarvesterComponent', () => {
  let component: HarvesterComponent;
  let fixture: ComponentFixture<HarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
