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
import { combineLatest, map, of, reduce, tap, zip } from 'rxjs';
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

  numDatasets = this.configService.getCatalogSizes().pipe();
  // numDatasets;
  catalogs = this.configService.getCatalogs().pipe();

  // catalogs;
    // map(items => items.sort(this.compareFunction)),
    // tap(result => this.formatOptions = result.map( item => item.name))
    // reduce((acc, catalog, index) => {
    //   // acc[catalog[index].id] = await D;
    // }, this.numDatasets)
  // );
  // combined = combineLatest([this.numDatasets, this.catalogs]).pipe(
  //   map(([nums, catalogs]) => ({ element: nums[catalogs] }))
  // );
  // counts = combineLatest([this.catalogs, this.numDatasets])
  // .pipe(
  //   map(([catalogs, numDatasets]) =>
  //     catalogs.sort((c1, c2) => c1.title > c2.title ? 1 : -1).map(catalog => ({
  //       catalog,
  //       count: numDatasets[catalog.id] ?? 0
  //     }))
  //   )
  // );
  // counts2;

  constructor(private configService: ConfigService, private dialog: MatDialog) { }

  ngOnInit() {
    // this.configService.getCatalogs().subscribe(result => {
    //   console.log('s');
    //   console.log(result);
    //   this.catalogs = result;
    // });
    // this.counts2 = combineLatest([this.catalogs, this.numDatasets],
    //   (catalogs, counts) => catalogs.reduce((wrapper, catalog) => ({
    //     catalog,
    //     count: counts[catalog.id] ?? 0
    //   }), {}));
    // zip([this.catalogs, this.numDatasets])
    // .subscribe(([catalogs, numDatasets]) => {
    //   console.log("SUBSCRIPTION");
    //   this.counts2 = of(catalogs.sort((c1, c2) => c1.title > c2.title ? 1 : -1).map(catalog => ({
    //     catalog,
    //     count: numDatasets[catalog.id] ?? 0
    //   })));
    // });
// console.log('numDatasets');
// // this.numDatasets$.subscribe(() => {});
// // this.numDatasets$.pipe(tap(data => this.numDatasets = data));
//     // this.catalogs.forEach(catalog => {
//     //   this.numDatasets[catalog.id] = ;
//     // });
    this.numDatasets = this.configService.getCatalogSizes().pipe();
// console.log('/numDatasets');
  }

  addOrEditCatalog(catalog: Catalog) {
    this.dialog.open(AddOrEditCatalogComponent, {
      data: catalog
    }).afterClosed().subscribe(result => {
      if (result) {
        this.configService.addOrEditCatalog(result).subscribe(() => {
          this.catalogs = this.configService.getCatalogs();
          console.log("updated catalogs");
          console.log(this.catalogs);
        });
      }
    });
  }

  deleteCatalog(catalog: Catalog) {
    this.dialog.open(DeleteCatalogComponent, {
      data: catalog
    }).afterClosed().subscribe(result => {
      if (result) {
        this.configService.removeCatalog(result.catalog, result.target).subscribe(() => {
          this.catalogs = this.configService.getCatalogs();
        });
      }
    });
  }
}
