import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigMappingComponent } from './config-mapping.component';

describe('ConfigMappingComponent', () => {
  let component: ConfigMappingComponent;
  let fixture: ComponentFixture<ConfigMappingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigMappingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
