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

import {Component, Inject, OnInit} from '@angular/core';
import {Harvester} from '@shared/harvester';
import {MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef} from '@angular/material/legacy-dialog';
import {UntypedFormBuilder, FormControl, UntypedFormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-dialog-edit',
  templateUrl: './dialog-edit.component.html',
  styleUrls: ['./dialog-edit.component.scss']
})
export class DialogEditComponent implements OnInit {

  dialogTitle = 'Neuen Harvester anlegen';

  harvesterForm: UntypedFormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public harvester: Harvester,
              public dialogRef: MatDialogRef<DialogEditComponent>,
              private formBuilder: UntypedFormBuilder) {
      if (harvester.id !== -1) {
        this.dialogTitle = 'Harvester bearbeiten';
      }
      this.buildForm(harvester);
  }

  ngOnInit() {

  }

  private buildForm(harvester: Harvester) {
    this.harvesterForm = this.formBuilder.group({
      type: [{value: harvester.type, disabled: harvester.id !== -1}, Validators.required],
      description: [harvester.description, Validators.required],
      priority: [harvester.priority],
      index: [harvester.index],
      defaultDCATCategory: [harvester.defaultDCATCategory],
      defaultMcloudSubgroup: [harvester.defaultMcloudSubgroup],
      defaultAttribution: [harvester.defaultAttribution],
      defaultAttributionLink: [harvester.defaultAttributionLink],
      maxRecords: [harvester.maxRecords, Validators.min(1)],
      startPosition: [harvester.startPosition, Validators.min(0)],
      maxConcurrent: [harvester.maxConcurrent, Validators.min(1)],
      customCode: [harvester.customCode],
      rules: this.formBuilder.group({
        containsDocumentsWithData: [harvester.rules.containsDocumentsWithData],
        containsDocumentsWithDataBlacklist:  [harvester.rules.containsDocumentsWithDataBlacklist]
      })
    });

    this.toggleDisableRule(harvester.rules.containsDocumentsWithData);
  }

  submit(value: any) {
    const result = {
      ...this.harvester,
      ...value
    };
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
}
