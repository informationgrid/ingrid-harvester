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

import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Harvester } from '@shared/harvester';
import { Subject, takeUntil } from 'rxjs';
import { AddOrEditCatalogComponent } from '../../config/config-catalogs/add-or-edit-catalog/add-or-edit-catalog.component';
import { ConfigService } from '../../config/config.service';

@Component({
    selector: 'app-dialog-edit',
    templateUrl: './dialog-edit.component.html',
    styleUrls: ['./dialog-edit.component.scss'],
    standalone: false
})
export class DialogEditComponent implements OnInit {

  dialogTitle = 'Neuen Harvester anlegen';

  harvesterForm: UntypedFormGroup;

  profile: string;

  indices = this.configService.getCatalogs();

  private ngUnsubscribe = new Subject<void>();

  constructor(@Inject(MAT_DIALOG_DATA) public harvester: Harvester,
              public dialogRef: MatDialogRef<DialogEditComponent>,
              private formBuilder: UntypedFormBuilder,
              private configService: ConfigService) {
      if (harvester.id !== -1) {
        this.dialogTitle = 'Harvester bearbeiten';
      }
      this.buildForm(harvester);
  }

  ngOnInit() {
    this.configService.getProfileName()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(data => {
        this.profile = data;
    });
    // use harvester catalogId also as iPlugId
    this.harvesterForm.get('catalogId')?.valueChanges
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(value => {
        this.harvesterForm.patchValue({ iPlugId: value });
    });
  }

  private buildForm(harvester: Harvester) {
    this.harvesterForm = this.formBuilder.group({
      type: [{value: harvester.type, disabled: harvester.id !== -1}, Validators.required],
      description: [harvester.description, Validators.required],
      priority: [harvester.priority],
      iPlugId: [harvester.iPlugId],
      partner: [harvester.partner],
      provider: [harvester.provider],
      datatype: [harvester.datatype],
      dataSourceName: [harvester.dataSourceName],
      boost: [harvester.boost],
      defaultDCATCategory: [harvester.defaultDCATCategory],
      defaultMcloudSubgroup: [harvester.defaultMcloudSubgroup],
      defaultAttribution: [harvester.defaultAttribution],
      defaultAttributionLink: [harvester.defaultAttributionLink],
      maxRecords: [harvester.maxRecords, Validators.min(1)],
      startPosition: [harvester.startPosition, Validators.min(0)],
      catalogId: [harvester.catalogId, Validators.required, AddOrEditCatalogComponent.identifierValidator],
      customCode: [harvester.customCode],
      rules: this.formBuilder.group({
        containsDocumentsWithData: [harvester.rules.containsDocumentsWithData],
        containsDocumentsWithDataBlacklist: [harvester.rules.containsDocumentsWithDataBlacklist]
      })
    });

    this.toggleDisableRule(harvester.rules.containsDocumentsWithData);
  }

  submit(value: any) {
    const result = {
      ...this.harvester,
      ...value
    };
    // remove temporary properties (starting with '_')
    Object.keys(result).filter(key => key.startsWith('_')).forEach(key => delete result[key]);
    this.dialogRef.close(result);
  }

  toggleDisableRule(isChecked) {
    if (isChecked) {
      this.harvesterForm.get('rules.containsDocumentsWithDataBlacklist').enable();
    } else {
      this.harvesterForm.get('rules.containsDocumentsWithDataBlacklist').disable();
    }
  }

  toLowerCase(text: string) {
    const field = this.harvesterForm.get('rules.containsDocumentsWithDataBlacklist');
    if (field.value !== text.toLowerCase()) {
      field.setValue(text.toLowerCase());
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
