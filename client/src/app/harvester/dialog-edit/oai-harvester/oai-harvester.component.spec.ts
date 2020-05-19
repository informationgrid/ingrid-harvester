import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OaiHarvesterComponent } from './oai-harvester.component';

describe('OaiHarvesterComponent', () => {
  let component: OaiHarvesterComponent;
  let fixture: ComponentFixture<OaiHarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OaiHarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OaiHarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
