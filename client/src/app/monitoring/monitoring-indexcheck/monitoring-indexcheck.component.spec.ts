import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MonitoringIndexCheckComponent } from './monitoring-indexcheck.component';

describe('MonitoringIndexCheckComponent', () => {
  let component: MonitoringIndexCheckComponent;
  let fixture: ComponentFixture<MonitoringIndexCheckComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MonitoringIndexCheckComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitoringIndexCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
