import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringIndexCheckDetailComponent } from './monitoring-indexcheck-detail.component';

describe('MonitoringIndexCheckDetailComponent', () => {
  let component: MonitoringIndexCheckDetailComponent;
  let fixture: ComponentFixture<MonitoringIndexCheckDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringIndexCheckDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringIndexCheckDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
