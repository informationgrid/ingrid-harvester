import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogHistoryComponent } from './dialog-history.component';

describe('DialogHistoryComponent', () => {
  let component: DialogHistoryComponent;
  let fixture: ComponentFixture<DialogHistoryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogHistoryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
