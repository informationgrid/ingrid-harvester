import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMappingItemComponent } from './add-mapping-item.component';

describe('AddMappingItemComponent', () => {
  let component: AddMappingItemComponent;
  let fixture: ComponentFixture<AddMappingItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddMappingItemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddMappingItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
