import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigGeneralComponent } from './config-general.component';

describe('ConfigGeneralComponent', () => {
  let component: ConfigGeneralComponent;
  let fixture: ComponentFixture<ConfigGeneralComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigGeneralComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
