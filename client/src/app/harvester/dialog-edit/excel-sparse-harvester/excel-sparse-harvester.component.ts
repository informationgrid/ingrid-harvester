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
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {DefaultCatalogSettings, ExcelSparseSettings} from '../../../../../../server/app/importer/excelsparse/excelsparse.settings';

@Component({
    selector: 'app-excel-sparse-harvester',
    templateUrl: './excel-sparse-harvester.component.html',
    styleUrls: ['./excel-sparse-harvester.component.scss'],
    standalone: false
})
export class ExcelSparseHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: ExcelSparseSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  constructor() {
  }

  ngOnInit(): void {
    if (!this.model.catalog) {
      this.model.catalog = DefaultCatalogSettings.catalog;
    }

    this.form.addControl('catalog',
      new UntypedFormGroup({
        description: new UntypedFormControl(this.model.catalog.description),
        language: new UntypedFormControl(this.model.catalog.language),
        title: new UntypedFormControl(this.model.catalog.title)
      })
    );
    this.form.addControl('filePath', new UntypedFormControl(this.model ? this.model.filePath : ''));
  }

  ngOnDestroy(): void {
  }

}
