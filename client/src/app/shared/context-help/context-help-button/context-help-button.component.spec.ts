import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContextHelpButtonComponent } from './context-help-button.component';

describe('ContextHelpButtonComponent', () => {
  let component: ContextHelpButtonComponent;
  let fixture: ComponentFixture<ContextHelpButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContextHelpButtonComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContextHelpButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
