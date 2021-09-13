/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {CkanSettings} from '../../../../../../server/app/importer/ckan/ckan.settings';
import {FormControl, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-ckan-harvester',
  templateUrl: './ckan-harvester.component.html',
  styleUrls: ['./ckan-harvester.component.scss']
})
export class CkanHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: CkanSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  constructor() {
  }

  ngOnInit(): void {
    this.form.addControl('ckanBaseUrl', new FormControl(this.getModelField('ckanBaseUrl', ''), Validators.required));
    this.form.addControl('markdownAsDescription', new FormControl(this.getModelField('markdownAsDescription', false)));
    this.form.addControl('defaultLicense', new FormGroup({
        id: new FormControl(this.getModelField('defaultLicense.id', '')),
        title: new FormControl(this.getModelField('defaultLicense.title', '')),
        url: new FormControl(this.getModelField('defaultLicense.url', ''))
      })
    );

    this.form.addControl('groupChilds', new FormControl(this.getModelField('groupChilds', false)));

    this.form.addControl('requestType',
      new FormControl(this.getModelField('requestType', 'ListWithResources')));
    this.form.addControl('additionalSearchFilter',
      new FormControl(this.getModelField('additionalSearchFilter', '')));

    this.form.addControl('providerPrefix',
      new FormControl(this.getModelField('providerPrefix', '')));
    this.form.addControl('providerField',
      new FormControl(this.getModelField('providerField', 'organization')));

    const rule = new FormControl(this.getModelField('rules.containsDocumentsWithData', false));
    const ruleBlacklist = new FormControl({
      value: this.getModelField('rules.containsDocumentsWithDataBlacklist', ''),
      disabled: !rule.value
    }, Validators.required);

    this.form.addControl('rules', new FormGroup({
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
