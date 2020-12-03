import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringUrlcheckComponent } from './monitoring-urlcheck.component';

describe('MonitoringUrlCheckComponent', () => {
  let component: MonitoringUrlcheckComponent;
  let fixture: ComponentFixture<MonitoringUrlcheckComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringUrlcheckComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringUrlcheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
