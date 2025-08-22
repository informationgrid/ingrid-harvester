/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

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

  cronControl
  toggleControl

  constructor() {}
  
  ngOnInit(): void {
    this.cronControl = this.form.get(this.formKey).get(this.cronKeyName);
    this.toggleControl = this.form.get(this.formKey).get(this.activeKeyName);
    this.translateCronExpression(this.cronControl.value)
    this.handleToggleSwitch();

  }

  handleToggleSwitch(): void {
    this.toggleControl.valueChanges.subscribe((checked) => {
      this.cronControl.setValidators([this.customValidation]);
      // Next lines disabled because form field will be deleted if disabled
      // if (checked) {
      //   this.cronControl.ensable()
      // } else {
      //   this.cronControl.disable()
      // }
      this.cronControl.updateValueAndValidity();
    });
  }

  customValidation(control: AbstractControl) {
    const isValid = control.value == "" ? true : isValidCron(control.value);
    return isValid ? null : { customError: 'Kein gültiger Ausdruck.' };
  }


  translateCronExpression(cronExpression: string) {

    this.cronControl.setValidators([this.customValidation]);    
    try {
      if (!isValidCron(cronExpression)) {
        throw new Error('Kein gültiger Ausdruck');
      }
      this.cronTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
    } catch (e) {
      if( cronExpression == "" ) this.toggleControl.setValue(false);
      this.cronTranslation = 'Kein gültiger Ausdruck';
    }
    if (!this.toggleControl.value) {
      this.cronTranslation = 'Planung ausgeschaltet';
      return;
    }
  }

  clearInput() {
    this.cronControl.setValue('');
    this.translateCronExpression("");
  }
}