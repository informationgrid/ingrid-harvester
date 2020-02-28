import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import {DcatHarvesterComponent} from './dcat-harvester.component';

describe('DcatHarvesterComponent', () => {
  let component: DcatHarvesterComponent;
  let fixture: ComponentFixture<DcatHarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DcatHarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DcatHarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
