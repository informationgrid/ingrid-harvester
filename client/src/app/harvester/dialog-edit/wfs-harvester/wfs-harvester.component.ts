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
import {DefaultXpathSettings, WfsSettings} from '../../../../../../server/app/importer/wfs/wfs.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatLegacyChipInputEvent as MatChipInputEvent} from '@angular/material/legacy-chips';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';

@Component({
  selector: 'app-wfs-harvester',
  templateUrl: './wfs-harvester.component.html',
  styleUrls: ['./wfs-harvester.component.scss']
})
export class WfsHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: WfsSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
    this.form.addControl('httpMethod', new UntypedFormControl(this.model.httpMethod));
    this.form.addControl('getFeaturesUrl', new UntypedFormControl(this.model.getFeaturesUrl));
    this.form.addControl('featuresFilter', new UntypedFormControl(this.model.featureFilter));
    this.form.addControl('version', new UntypedFormControl(this.model.version));
    this.form.addControl('typename', new UntypedFormControl(this.model.typename));
    this.form.addControl('catalogId', new UntypedFormControl(this.model.catalogId));

    if (!this.model.xpaths) {
      this.model.xpaths = DefaultXpathSettings.xpaths;
    }
    this.form.addControl('xpaths',
      new UntypedFormGroup({
        capabilities: new UntypedFormGroup({
          // abstract: new FormControl(this.model.xpaths.capabilities.abstract),
          language: new UntypedFormControl(this.model.xpaths.capabilities.language),
          // serviceProvider: new FormControl(this.model.xpaths.capabilities.serviceProvider),
          // title: new FormControl(this.model.xpaths.capabilities.title)
        }),
        description: new UntypedFormControl(this.model.xpaths.description),
        featureParent: new UntypedFormControl(this.model.xpaths.featureParent),
        name: new UntypedFormControl(this.model.xpaths.name),
        pluPlanState: new UntypedFormControl(this.model.xpaths.pluPlanState),
        pluProcedureStartDate: new UntypedFormControl(this.model.xpaths.pluProcedureStartDate),
        spatial: new UntypedFormControl(this.model.xpaths.spatial)
      })
    );

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
