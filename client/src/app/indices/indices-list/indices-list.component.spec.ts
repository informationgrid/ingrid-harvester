import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicesListComponent } from './indices-list.component';

describe('IndicesListComponent', () => {
  let component: IndicesListComponent;
  let fixture: ComponentFixture<IndicesListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IndicesListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IndicesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
