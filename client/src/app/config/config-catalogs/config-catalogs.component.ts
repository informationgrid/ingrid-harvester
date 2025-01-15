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

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, map, Observable } from 'rxjs';
import { Catalog } from '../../../../../server/app/model/dcatApPlu.model';
import { ConfigService } from '../config.service';
import { AddOrEditCatalogComponent } from './add-or-edit-catalog/add-or-edit-catalog.component';
import { DeleteCatalogComponent } from './delete-catalog/delete-catalog.component';

@Component({
  selector: 'app-config-catalogs',
  templateUrl: './config-catalogs.component.html',
  styleUrls: ['./config-catalogs.component.scss']
})
export class ConfigCatalogsComponent implements OnInit {

  catalogsWrapper: Observable<{ catalog: Catalog, count: any }[]>;

  constructor(private configService: ConfigService, private dialog: MatDialog) { }

  ngOnInit() {
    this.updateData();
  }
  
  updateData() {
    this.catalogsWrapper = combineLatest([this.configService.getCatalogs(), this.configService.getCatalogSizes()]).pipe(
      map(([catalogs, numDatasets]) =>
        catalogs.map(catalog => ({
          catalog,
          count: numDatasets[catalog.id] ?? 0
        }))
      )
    );
  }

  addOrEditCatalog(catalog: Catalog) {
    this.dialog.open(AddOrEditCatalogComponent, {
      data: catalog
    }).afterClosed().subscribe(result => {
      if (result) {
        this.configService.addOrEditCatalog(result).subscribe(() => this.updateData());
      }
    });
  }

  deleteCatalog(catalog: Catalog) {
    this.dialog.open(DeleteCatalogComponent, {
      data: {
        catalog,
        catalogsWrapper: this.catalogsWrapper
      }
    }).afterClosed().subscribe(result => {
      console.log('A ' + result);
      if (result) {
        this.configService.removeCatalog(catalog, result.target).subscribe(() => this.updateData());
      }
    });
  }
}
