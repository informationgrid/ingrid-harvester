import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringUrlcheckDetailComponent } from './monitoring-urlcheck-detail.component';

describe('MonitoringUrlcheckDetailComponent', () => {
  let component: MonitoringUrlcheckDetailComponent;
  let fixture: ComponentFixture<MonitoringUrlcheckDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringUrlcheckDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringUrlcheckDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
