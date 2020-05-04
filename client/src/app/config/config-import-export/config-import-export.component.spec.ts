import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigImportExportComponent } from './config-import-export.component';

describe('ConfigImportExportComponent', () => {
  let component: ConfigImportExportComponent;
  let fixture: ComponentFixture<ConfigImportExportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigImportExportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigImportExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
