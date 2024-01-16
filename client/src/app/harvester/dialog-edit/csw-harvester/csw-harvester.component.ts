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
import {CswSettings} from '../../../../../../server/app/importer/csw/csw.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatLegacyChipInputEvent as MatChipInputEvent} from '@angular/material/legacy-chips';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import { ConfigService } from '../../../config/config.service';

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
    this.form.addControl('httpMethod', new UntypedFormControl(this.model.httpMethod));
    this.form.addControl('resolveOgcDistributions', new UntypedFormControl(this.model.resolveOgcDistributions));
    this.form.addControl('harvestingMode', new UntypedFormControl(this.model.harvestingMode));
    this.form.addControl('getRecordsUrl', new UntypedFormControl(this.model.getRecordsUrl));
    this.form.addControl('recordFilter', new UntypedFormControl(this.model.recordFilter));
    this.form.addControl('simplifyTolerance', new UntypedFormControl(this.model.simplifyTolerance));
    this.form.addControl('pluPlanState', new UntypedFormControl(this.model.pluPlanState));

    if (!this.model.eitherKeywords) {
      this.model.eitherKeywords = [];
    }

    this.configService.getProfileName().subscribe(data => {
      this.profile = data;
    });
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
