import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringHarvesterComponent } from './monitoring-harvester.component';

describe('MonitoringHarvesterComponent', () => {
  let component: MonitoringHarvesterComponent;
  let fixture: ComponentFixture<MonitoringHarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringHarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringHarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
