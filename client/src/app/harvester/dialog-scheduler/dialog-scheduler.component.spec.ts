import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogSchedulerComponent } from './dialog-scheduler.component';

describe('DialogSchedulerComponent', () => {
  let component: DialogSchedulerComponent;
  let fixture: ComponentFixture<DialogSchedulerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogSchedulerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogSchedulerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
