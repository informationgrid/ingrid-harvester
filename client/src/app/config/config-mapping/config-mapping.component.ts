/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
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

import { Component, OnInit } from '@angular/core';
import {ConfigService, MappingDistribution} from "../config.service";
import {MatDialog} from "@angular/material/dialog";
import {AddMappingItemComponent} from "./add-mapping-item/add-mapping-item.component";
import {map, tap} from "rxjs/operators";

@Component({
  selector: 'app-config-mapping',
  templateUrl: './config-mapping.component.html',
  styleUrls: ['./config-mapping.component.scss']
})
export class ConfigMappingComponent implements OnInit {

  types = this.configService.getMapping().pipe(
    // map(items => items.sort(this.compareFunction)),
    tap(result => this.formatOptions = result.map( item => item.name))
  );
  private formatOptions: string[];
  private compareFunction = (a: MappingDistribution, b: MappingDistribution) => a.name.localeCompare(b.name);

  constructor(private configService: ConfigService, private dialog: MatDialog) { }

  ngOnInit() {
  }

  deleteItem(type: string, item: string) {
    this.configService.removeMapping({
      source: item,
      target: type
    }).subscribe( () => {
      this.types = this.configService.getMapping();
    });
  }

  addItem() {
    this.dialog.open(AddMappingItemComponent, {
      data: this.formatOptions
    }).afterClosed().subscribe(result => {
      if (result) {
        this.configService.addMapping(result).subscribe(() => {
          this.types = this.configService.getMapping();
        });
      }
    })
  }

}
