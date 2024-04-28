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

import { Component, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { ConfigService } from '../../../config/config.service';
import { CswSettings } from '../../../../../../server/app/importer/csw/csw.settings';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatChipInputEvent } from '@angular/material/chips';

@Component({
  selector: 'app-csw-harvester',
  templateUrl: './csw-harvester.component.html',
  styleUrls: ['./csw-harvester.component.scss']
})
export class CswHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: CswSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  profile: string;

  constructor(private configService: ConfigService) { }

  ngOnInit() {
    this.form.addControl('httpMethod', new FormControl(this.model.httpMethod));
    this.form.addControl('getRecordsUrl', new FormControl(this.model.getRecordsUrl));
    this.form.addControl('resolveOgcDistributions', new FormControl(this.model.resolveOgcDistributions));
    this.form.addControl('harvestingMode', new FormControl(this.model.harvestingMode));
    this.form.addControl('maxServices', new FormControl({ value: this.model.maxServices, disabled: this.model.harvestingMode != 'separate' }));
    this.form.addControl('maxConcurrent', new FormControl(this.model.maxConcurrent, Validators.min(1))),
    this.form.addControl('simplifyTolerance', new FormControl(this.model.simplifyTolerance));
    this.form.addControl('pluPlanState', new FormControl(this.model.pluPlanState));
    this.form.addControl('recordFilter', new FormControl(this.model.recordFilter));

    this.model.eitherKeywords ??= [];

    this.configService.getProfileName().subscribe(data => {
      this.profile = data;
    });

    this.harvestingMode.valueChanges.subscribe(harvestingMode => {
      harvestingMode == 'separate' ? this.maxServices.enable() : this.maxServices.disable()
    });
  }

  ngOnDestroy(): void {
  }

  get harvestingMode(): FormControl {
    return this.form.get('harvestingMode') as FormControl;
  }

  get maxServices(): FormControl {
    return this.form.get('maxServices') as FormControl;
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
