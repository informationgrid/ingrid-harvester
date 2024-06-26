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

import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {CkanSettings} from '../../../../../../server/app/importer/ckan/ckan.settings';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-ckan-harvester',
  templateUrl: './ckan-harvester.component.html',
  styleUrls: ['./ckan-harvester.component.scss']
})
export class CkanHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: CkanSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  constructor() {
  }

  ngOnInit(): void {
    this.form.addControl('ckanBaseUrl', new UntypedFormControl(this.getModelField('ckanBaseUrl', ''), Validators.required));
    this.form.addControl('markdownAsDescription', new UntypedFormControl(this.getModelField('markdownAsDescription', false)));
    this.form.addControl('defaultLicense', new UntypedFormGroup({
        id: new UntypedFormControl(this.getModelField('defaultLicense.id', '')),
        title: new UntypedFormControl(this.getModelField('defaultLicense.title', '')),
        url: new UntypedFormControl(this.getModelField('defaultLicense.url', ''))
      })
    );

    this.form.addControl('groupChilds', new UntypedFormControl(this.getModelField('groupChilds', false)));

    this.form.addControl('requestType',
      new UntypedFormControl(this.getModelField('requestType', 'ListWithResources')));
    this.form.addControl('additionalSearchFilter',
      new UntypedFormControl(this.getModelField('additionalSearchFilter', '')));

    this.form.addControl('providerPrefix',
      new UntypedFormControl(this.getModelField('providerPrefix', '')));
    this.form.addControl('providerField',
      new UntypedFormControl(this.getModelField('providerField', 'organization')));

    const rule = new UntypedFormControl(this.getModelField('rules.containsDocumentsWithData', false));
    const ruleBlacklist = new UntypedFormControl({
      value: this.getModelField('rules.containsDocumentsWithDataBlacklist', ''),
      disabled: !rule.value
    }, Validators.required);

    this.form.addControl('rules', new UntypedFormGroup({
      containsDocumentsWithData: rule,
      containsDocumentsWithDataBlacklist: ruleBlacklist
    }));
  }

  private getModelField(field: string, defaultValue: any) {
    let current = this.model;
    const items = field.split('.');

    const exists = items.every(item => {
      current = current[item];
      return current;
    });

    return exists ? current : defaultValue;
  }

  ngOnDestroy(): void {
  }
}
