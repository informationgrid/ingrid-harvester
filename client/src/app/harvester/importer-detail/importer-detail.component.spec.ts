import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImporterDetailComponent } from './import-detail.component';

describe('ImportDetailComponent', () => {
  let component: ImporterDetailComponent;
  let fixture: ComponentFixture<ImporterDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImporterDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImporterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
