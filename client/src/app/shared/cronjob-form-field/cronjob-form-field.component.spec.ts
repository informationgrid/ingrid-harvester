import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CronjobFormFieldComponent } from './cronjob-form-field.component';

describe('CronjobFormFieldComponent', () => {
  let component: CronjobFormFieldComponent;
  let fixture: ComponentFixture<CronjobFormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CronjobFormFieldComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CronjobFormFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
