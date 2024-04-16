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

import {Component, OnInit, ViewChild} from '@angular/core';
import {IndicesService} from '../indices.service';
import {forkJoin, Observable} from 'rxjs';
import {Index} from '@shared/index.model';
import {tap} from 'rxjs/operators';
import {ConfirmDialogComponent} from '../../shared/confirm-dialog/confirm-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {ConfigService} from "../../config/config.service";
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-indices-list',
  templateUrl: './indices-list.component.html',
  styleUrls: ['./indices-list.component.scss']
})
export class IndicesListComponent implements OnInit {

  @ViewChild(CdkVirtualScrollViewport, {static: false})
  viewPort: CdkVirtualScrollViewport;

  indices: Observable<Index[]>;
  searchResult = this.indicesService.searchResponse$;
  searchResultLines: string[] = [];

  constructor(private dialog: MatDialog, private indicesService: IndicesService) {
  }

  ngOnInit() {
    this.updateIndices();
  }

  deleteIndex(name: string) {
    this.dialog.open(ConfirmDialogComponent, {data: 'Wollen Sie den Index "' + name + '" wirklich löschen?'}).afterClosed().subscribe(result => {
      if (result) {
        this.indicesService.deleteIndex(name).subscribe(() => {
          this.updateIndices();
        });
      }
    });
  }

  exportIndex(name: string) {
    forkJoin([
      this.indicesService.exportIndex(name)
    ]).subscribe(result => {
      ConfigService.downLoadFile(name+'.json', JSON.stringify(result[0], null, 2));
    });
  }

  importIndex(files: FileList) {
    this.indicesService.importIndex(files[0]).subscribe();
  }

  private updateIndices() {
    this.indices = this.indicesService.get()
      .pipe(
        tap(indices => indices.sort((a, b) => a.name.localeCompare(b.name)))
      );
  }

  async sendSearchRequest(indexName: string) {
    this.indicesService.search(indexName);
    this.searchResult.subscribe(data => {
      let formattedJsonString = JSON.stringify(data, null, 4);
      this.searchResultLines = formattedJsonString.split('\n');
    }, (error => console.error('Error getting index:', error)));
  }

  // searchForStringInPreview
}
