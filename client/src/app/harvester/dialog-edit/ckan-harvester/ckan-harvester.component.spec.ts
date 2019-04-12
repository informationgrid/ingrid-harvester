import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CkanHarvesterComponent } from './ckan-harvester.component';

describe('CkanHarvesterComponent', () => {
  let component: CkanHarvesterComponent;
  let fixture: ComponentFixture<CkanHarvesterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CkanHarvesterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CkanHarvesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
