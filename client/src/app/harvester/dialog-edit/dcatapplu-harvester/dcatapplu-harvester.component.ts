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
import { DcatappluSettings } from '../../../../../../server/app/importer/dcatapplu/dcatapplu.settings';
import { MatChipInputEvent } from '@angular/material/chips';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

@Component({
  selector: 'app-dcatapplu-harvester',
  templateUrl: './dcatapplu-harvester.component.html',
  styleUrls: ['./dcatapplu-harvester.component.scss']
})
export class DcatappluHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: DcatappluSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  constructor() { }

  ngOnInit() {
    this.form.addControl('catalogUrl', new UntypedFormControl(this.getModelField('catalogUrl', '')));
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
