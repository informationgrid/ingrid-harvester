import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule, UntypedFormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { isValidCron } from 'cron-validator';
import cronstrue from 'cronstrue/i18n';

@Component({
  selector: 'harvester-cronjob-form-field',
  templateUrl: './cronjob-form-field.component.html',
  styleUrl: './cronjob-form-field.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatSlideToggleModule, 
    MatFormFieldModule,
    MatIconModule,
    MatLabel,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CronjobFormFieldComponent {
  @Input() title: string;
  @Input() form: UntypedFormGroup;
  @Input() formKey: string;
  @Input() activeKeyName: string;
  @Input() cronKeyName: string;

  cronTranslation: string;
  showInfo = false;

  constructor() {}
  
  ngOnInit(): void {
    this.translateCronExpression(this.form.get(this.formKey).get(this.cronKeyName).value)
    this.handleToggleSwitch();
  }

  handleToggleSwitch(): void {
    const cronControl = this.form.get(this.formKey).get(this.cronKeyName);
    const toggleControl = this.form.get(this.formKey).get(this.activeKeyName);

    toggleControl.valueChanges.subscribe((checked) => {
      cronControl.setValidators([Validators.required, this.customValidation]);        
      cronControl.updateValueAndValidity();
    });
  }
  customValidation(control: AbstractControl) {
    const isValid = isValidCron(control.value);
    return isValid ? null : { customError: 'Kein gültiger Ausdruck.' };
  }


  translateCronExpression(cronExpression: string) {
    const cronControl = this.form.get(this.formKey).get(this.cronKeyName);
    cronControl.setValidators([Validators.required, this.customValidation]);    
    try {
      if (!isValidCron(cronExpression)) {
        throw new Error('Kein gültiger Ausdruck');
      }
      this.cronTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
    } catch (e) {
      this.cronTranslation = 'Kein gültiger Ausdruck';
    }
    if (!this.form.get(this.formKey).get(this.activeKeyName).value) {
      this.cronTranslation = 'Planung ausgeschaltet';
      return;
    }
  }

  clearInput() {
    this.form.get(this.formKey).get('pattern').setValue('');
    this.translateCronExpression("");
  }
}