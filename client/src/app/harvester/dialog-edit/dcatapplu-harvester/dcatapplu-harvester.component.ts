/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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
import {DcatSettings} from '../../../../../../server/app/importer/dcat/dcat.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatLegacyChipInputEvent as MatChipInputEvent} from '@angular/material/legacy-chips';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';

@Component({
  selector: 'app-dcatapplu-harvester',
  templateUrl: './dcatapplu-harvester.component.html',
  styleUrls: ['./dcatapplu-harvester.component.scss']
})
export class DcatappluHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: DcatSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
    this.form.addControl('catalogUrl', new UntypedFormControl(this.getModelField('catalogUrl', '')));

    this.form.addControl('providerPrefix', new UntypedFormControl(this.getModelField('providerPrefix', '')));
    this.form.addControl('dcatappluProviderField', new UntypedFormControl(this.getModelField('dcatappluProviderField', 'creator')));

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

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }
}
