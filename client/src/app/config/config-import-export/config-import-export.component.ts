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
 *  http://ec.europa.eu/idabc/eupl5
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

import {Component, OnInit} from '@angular/core';
import {ConfigService} from '../config.service';
import {HarvesterService} from '../../harvester/harvester.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {forkJoin, of} from 'rxjs';
import {GeneralSettings} from '@shared/general-config.settings';
import {ConfigGeneralComponent} from "../config-general/config-general.component";
import {ConfigModule} from "../config.module";

@Component({
  selector: 'app-config-import-export',
  templateUrl: './config-import-export.component.html',
  styleUrls: ['./config-import-export.component.scss']
})
export class ConfigImportExportComponent implements OnInit {

  configForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private configService: ConfigService, private harvesterService: HarvesterService) {
  }

  ngOnInit() {
  }

  exportConfigs() {
    forkJoin([
      this.harvesterService.getHarvester(),
      this.configService.getMappingFileContent(),
      this.configService.fetch()
    ]).subscribe(result => {
      ConfigService.downLoadFile('config.json', JSON.stringify(result[0], null, 2));
      ConfigService.downLoadFile('mappings.json', JSON.stringify(result[1], null, 2));
      ConfigService.downLoadFile('config-general.json', JSON.stringify(result[2], null, 2));
    });
  }

  exportGeneralConfig() {
    forkJoin([
      this.configService.fetch()
    ]).subscribe(result => {
      ConfigService.downLoadFile('config-general.json', JSON.stringify(result[0], null, 2));
    });
  }

  exportMappingConfig() {
    forkJoin([
      this.configService.getMappingFileContent()
    ]).subscribe(result => {
      ConfigService.downLoadFile('mappings.json', JSON.stringify(result[0], null, 2));
    });
  }

  exportHarvesterConfig() {
    forkJoin([
      this.harvesterService.getHarvester()
    ]).subscribe(result => {
      ConfigService.downLoadFile('config.json', JSON.stringify(result[0], null, 2));
    });
  }

  importMappings(files: FileList){
    this.configService.uploadMappings(files[0]).subscribe();
  }

  importHarvester(files: FileList){
    this.harvesterService.uploadHarvesterConfig(files[0]).subscribe();
  }

  importGeneralConfig(files: FileList){
    this.configService.uploadGeneralConfig(files[0]).subscribe();
  }
}
