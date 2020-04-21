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
