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

import { Component, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, UntypedFormGroup } from '@angular/forms';
import { JsonSettings } from '../../../../../../server/app/importer/json/json.settings';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-json-harvester',
  templateUrl: './json-harvester.component.html',
  styleUrls: ['./json-harvester.component.scss']
})
export class JsonHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: JsonSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  private settingsArraySubscription: Subscription;

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.form.addControl('sourceURL', new FormControl<string>(this.model.sourceURL));
    this.form.addControl('idProperty', new FormControl<string>(this.model.idProperty));
    this.form.addControl('_settingsArray', this.formBuilder.array([], [JsonHarvesterComponent.noDuplicateKeysValidator, JsonHarvesterComponent.noEmptyKeysValidator]));

    if (this.model.additionalSettings) {
      Object.entries(this.model.additionalSettings).forEach(([key, value]) => this.addSetting(key, value));
    }
    this.settingsArraySubscription = this.settingsArray.valueChanges.subscribe(() => this.sync());
  }

  get settingsArray() {
    return this.form.controls["_settingsArray"] as FormArray;
  }

  addSetting(key?: string, value?: string) {
    const setting = this.formBuilder.group({
        key: [key ?? ''],
        value: [value ?? '']
    });
    this.settingsArray.push(setting);
  }

  removeSetting(idx: number) {
    this.settingsArray.removeAt(idx);
  }

  sync() {
    this.model.additionalSettings = this.settingsArray.controls.reduce((map, control) => {
      const group = control as FormGroup;
      map[group.value.key] = group.value.value;
      return map;
    }, {});
  }

  ngOnDestroy(): void {
    if (this.settingsArraySubscription) {
      this.settingsArraySubscription.unsubscribe();
    }
  }

  private static noDuplicateKeysValidator(control: FormArray) {
    const settingsArray = control.value;
    let found = [];
    for (let entry of settingsArray) {
      if (found.includes(entry.key)) {
        return { 'naming-rules': `Die Eigenschaft ${entry.key} ist mehrfach definiert` };
      }
      found.push(entry.key);
    }
    return null;
  }

  private static noEmptyKeysValidator(control: FormArray) {
    const settingsArray = control.value;
    let emptyPropIdx = settingsArray.findIndex(entry => !entry.key?.trim());
    if (emptyPropIdx >= 0) {
      return { 'naming-rules': `Die Eigenschaft an Stelle ${emptyPropIdx} hat keinen Namen` };
    }
    return null;
  }
}
