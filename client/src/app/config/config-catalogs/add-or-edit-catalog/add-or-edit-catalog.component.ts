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
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Catalog } from '../../../../../../server/app/model/dcatApPlu.model';

@Component({
    selector: 'app-add-or-edit-catalog',
    templateUrl: './add-or-edit-catalog.component.html',
    styleUrls: ['./add-or-edit-catalog.component.scss'],
    standalone: false
})
export class AddOrEditCatalogComponent implements OnInit {

  catalog: Catalog;

  catalogForm: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) private data: Catalog,
      public dialogRef: MatDialogRef<AddOrEditCatalogComponent>, private formBuilder: FormBuilder) {
    this.buildForm(data);
  }

  ngOnInit() {
    if (this.data == null) {
      this.catalog = {
        description: '',
        identifier: null,
        publisher: {
          name: '',
        },
        title: ''
      };
    }
    else {
      this.catalog = structuredClone(this.data);
    }
  }

  private buildForm(catalog: Catalog) {
    this.catalogForm = this.formBuilder.group({
      description: [catalog?.description, Validators.required],
      identifier: [catalog?.identifier, Validators.required, AddOrEditCatalogComponent.identifierValidator],
      publisher: this.formBuilder.group({
        name: [catalog?.publisher?.['name']],
      }),
      title: [catalog?.title, Validators.required]
    });
  }

  submit(value: any) {
    const result = {
      ...this.catalog,
      ...value
    };
    this.dialogRef.close(result);
  }

  /**
   * Check for valid ES index name
   * 
   * @param control 
   * @returns 
   */
  public static identifierValidator(control: FormControl) {
    const value: string = control.value;
    let isValid = true;
    isValid &&= !['"', '*', '+', '/', '\\', '|', '?', '#', '>', '<', ':', ' '].some(c => value.includes(c));
    isValid &&= !value.startsWith('_') && !value.startsWith('-');
    isValid &&= value == value.toLowerCase();
    isValid &&= value.length <= 255;
    return of(isValid ? null : { 'naming-rules': `Identifier "${value}" ist kein gültiger Elasticsearch Indexname` });
  }
}
