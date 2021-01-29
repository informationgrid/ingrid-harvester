import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringUrlCheckComponent } from './monitoring-urlcheck.component';

describe('MonitoringUrlCheckComponent', () => {
  let component: MonitoringUrlCheckComponent;
  let fixture: ComponentFixture<MonitoringUrlCheckComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringUrlCheckComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringUrlCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
