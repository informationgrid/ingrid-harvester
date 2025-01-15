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

import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, Subscription } from 'rxjs';
import { Catalog } from '../../../../../../server/app/model/dcatApPlu.model';

@Component({
  selector: 'app-delete-catalog',
  templateUrl: './delete-catalog.component.html',
  styleUrls: ['./delete-catalog.component.scss']
})
export class DeleteCatalogComponent implements OnDestroy, OnInit {

  catalog: Catalog;
  catalogsWrapper: Observable<any[]>;
  count: number;
  move: boolean = false;
  target: string = null;
  countSubscription: Subscription;

  constructor(@Inject(MAT_DIALOG_DATA) private data: { catalog: Catalog, catalogsWrapper: Observable<any[]> }) { }

  ngOnInit() {
    this.catalog = this.data.catalog;
    this.catalogsWrapper = this.data.catalogsWrapper;
    this.countSubscription = this.catalogsWrapper.subscribe((wrapper) => {
      this.count = wrapper.find(({ catalog, count }) => catalog.id == this.catalog.id)['count'] ?? 0;
    });
  }

  resolveTarget() {
    return { target: this.move ? this.target : null };
  }

  ngOnDestroy() {
    this.countSubscription.unsubscribe();
  }
}
