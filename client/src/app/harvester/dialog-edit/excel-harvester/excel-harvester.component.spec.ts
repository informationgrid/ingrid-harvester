import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelHarvesterComponent } from './excel-harvester.component';

describe('ExcelHarvesterComponent', () => {
  let component: ExcelHarvesterComponent;
  let fixture: ComponentFixture<ExcelHarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExcelHarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExcelHarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
