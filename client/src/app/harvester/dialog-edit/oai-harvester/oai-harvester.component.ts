/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {OaiSettings} from '../../../../../../server/app/importer/oai/oai.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material/chips';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';

@Component({
  selector: 'app-oai-harvester',
  templateUrl: './oai-harvester.component.html',
  styleUrls: ['./oai-harvester.component.scss']
})
export class OaiHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: OaiSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
    this.form.addControl('providerUrl', new UntypedFormControl(this.model.providerUrl));
    this.form.addControl('set', new UntypedFormControl(this.model.set));

    if (!this.model.eitherKeywords) {
      this.model.eitherKeywords = [];
    }
  }

  ngOnDestroy(): void {
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add keyword
    if ((value || '').trim()) {
      this.model.eitherKeywords.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  remove(keyword: string): void {
    const index = this.model.eitherKeywords.indexOf(keyword);

    if (index >= 0) {
      this.model.eitherKeywords.splice(index, 1);
    }
  }
}
