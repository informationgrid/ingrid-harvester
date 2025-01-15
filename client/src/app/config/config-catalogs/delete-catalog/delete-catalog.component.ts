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
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Catalog } from '../../../../../../server/app/model/dcatApPlu.model';

@Component({
  selector: 'app-delete-catalog',
  templateUrl: './delete-catalog.component.html',
  styleUrls: ['./delete-catalog.component.scss']
})
export class DeleteCatalogComponent implements OnInit {

  catalog: Catalog;

  constructor(@Inject(MAT_DIALOG_DATA) private data: Catalog) { }

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
      this.catalog = this.data;
    }
  }
}
