import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SparqlHarvesterComponent } from './sparql-harvester.component';

describe('SparqlHarvesterComponent', () => {
  let component: SparqlHarvesterComponent;
  let fixture: ComponentFixture<SparqlHarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SparqlHarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SparqlHarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
