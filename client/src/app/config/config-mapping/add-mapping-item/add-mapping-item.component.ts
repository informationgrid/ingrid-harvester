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

import {Component, Inject, OnInit} from '@angular/core';
import {MappingItem} from '@shared/mapping.model';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";

@Component({
  selector: 'app-add-mapping-item',
  templateUrl: './add-mapping-item.component.html',
  styleUrls: ['./add-mapping-item.component.scss']
})
export class AddMappingItemComponent implements OnInit {

  data: MappingItem = {
    source: '',
    target: ''
  };
  filteredOptions: string[];

  constructor(@Inject(MAT_DIALOG_DATA) private options: string[]) { }

  ngOnInit() {
    this.filterOptions(null);
  }

  filterOptions(text: string) {
    if (!text || text.trim().length === 0) {
      this.filteredOptions = this.options;
    } else {
      const textLowerCase = text.toLowerCase();
      this.filteredOptions = this.options.filter(option => option.toLowerCase().indexOf(textLowerCase) === 0)
    }
  }
}
