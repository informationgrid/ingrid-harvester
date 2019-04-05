import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogLogComponent } from './dialog-log.component';

describe('DialogLogComponent', () => {
  let component: DialogLogComponent;
  let fixture: ComponentFixture<DialogLogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogLogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
