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

import {Component, OnInit} from '@angular/core';
import {ConfigService} from '../config.service';
import {HarvesterService} from '../../harvester/harvester.service';
import {UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {of} from 'rxjs';
import {GeneralSettings} from '@shared/general-config.settings';

import { delay } from 'rxjs/operators';
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: 'app-config-general',
  templateUrl: './config-general.component.html',
  styleUrls: ['./config-general.component.scss']
})
export class ConfigGeneralComponent implements OnInit {

  configForm: UntypedFormGroup;

  profile: string;

  form;

  constructor(
    private formBuilder: UntypedFormBuilder, 
    private configService: ConfigService, 
    private harvesterService: HarvesterService,
    private route: ActivatedRoute,
  ) {
  }


  ngOnInit() {
    this.reset();
    this.configService.getProfileName().subscribe(data => {
      this.profile = data;
    });
  }

  private static noWhitespaceValidator(control: UntypedFormControl) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return of(isValid ? null : {'whitespace': true});
  }

  private static elasticUrlValidator(control: UntypedFormControl) {
    if (!control.value) {
      return of(null);
    }

    let isValid = false;

    const protocolPart = control.value.split('://');
    if (protocolPart.length === 2) {
      const portPart = protocolPart[1].split(':');
      if (portPart.length === 2) {
        const port = portPart[1];
        isValid = !isNaN(port) && port > 0 && port < 10000;
      }
    }
    return of(isValid ? null : {'elasticUrl': true});
  }

  connectionStatus = {
    success: ['Success', 'Test erfolgreich', 'accent'],
    fail: ['Error', 'Test fehlgeschlagen', 'warn'],
    working: ['cloud_sync', '... wird getestet', 'primary']
  };

  statusIcon(value: string) {
    return this.connectionStatus[value][0];
  }

  statusMsg(value: string) {
    return this.connectionStatus[value][1];
  }

  statusColor(value: string) {
    return this.connectionStatus[value][2];
  }

  checkDbConnection() {
    this.dbConnectionCheck = 'working';
    let checkResult = this.configService.checkDbConnection({
      type: this.configForm.get('database.type').value,
      connectionString: this.configForm.get('database.connectionString').value,
      host: this.configForm.get('database.host').value,
      port: this.configForm.get('database.port').value,
      database: this.configForm.get('database.database').value,
      user: this.configForm.get('database.user').value,
      password: this.configForm.get('database.password').value
    });
    checkResult.pipe(delay(1000)).subscribe(response => {
      this.dbConnectionCheck = response ? 'success' : 'fail';
    });
  }

  checkEsConnection() {
    this.esConnectionCheck = 'working';
    let checkResult = this.configService.checkEsConnection({
      url: this.configForm.get('elasticsearch.url').value,
      version: this.configForm.get('elasticsearch.version').value,
      user: this.configForm.get('elasticsearch.user').value,
      password: this.configForm.get('elasticsearch.password').value
    });
    checkResult.pipe(delay(1000)).subscribe(response => {
      this.esConnectionCheck = response ? 'success' : 'fail';
    });
  }

  save() {
    this.configService.save(this.configForm.value).subscribe();
  }

  reset() {
    this.configService.fetch().subscribe(data => this.buildForm(data));
  }

  private buildForm(settings: GeneralSettings) {

    if (!settings.urlCheck) {
      settings.urlCheck = {
        active: false,
        pattern: ""
      }
    }

    if (!settings.mail) {
      settings.mail = {
        enabled: false,
        mailServer: {
          host: "",
          port: 451,
          secure: false,
          auth: {
            user: "",
            pass: ""
          }
        },
        from: "",
        to: "",
        subjectTag: ""
      }
    }

    this.configForm = this.formBuilder.group({
      database: this.formBuilder.group({
        type: [settings.database.type],
        connectionString: [settings.database.connectionString],
        host: [settings.database.host],
        port: [settings.database.port],
        database: [settings.database.database],
        user: [settings.database.user],
        password: [settings.database.password],
        defaultCatalogIdentifier: [settings.database.defaultCatalogIdentifier]
      }),
      elasticsearch: this.formBuilder.group({
        url: [settings.elasticsearch.url, Validators.required],
        version: [settings.elasticsearch.version],
        user: [settings.elasticsearch.user],
        password: [settings.elasticsearch.password],
        alias: [settings.elasticsearch.alias, Validators.required, ConfigGeneralComponent.noWhitespaceValidator],
        prefix: [settings.elasticsearch.prefix],
        index: [settings.elasticsearch.index],
        numberOfShards: [settings.elasticsearch.numberOfShards],
        numberOfReplicas: [settings.elasticsearch.numberOfReplicas]
      }),
      cronOffset: [settings.cronOffset],
      proxy: [settings.proxy],
      portalUrl: [settings.portalUrl],
      urlCheck: this.formBuilder.group({
        active: [settings.urlCheck.active],
        pattern: [settings.urlCheck.pattern]
      }),
      indexCheck: this.formBuilder.group({
        active: [settings.indexCheck.active],
        pattern: [settings.indexCheck.pattern]
      }),
      mail: this.formBuilder.group({
        enabled: [settings.mail.enabled],
        mailServer: this.formBuilder.group({
          host: [settings.mail.mailServer.host],
          port: [settings.mail.mailServer.port],
          secure: [settings.mail.mailServer.secure],
          auth: this.formBuilder.group({
            user: [settings.mail.mailServer.auth.user],
            pass: [settings.mail.mailServer.auth.pass]
          })
        }),
        from: [settings.mail.from],
        to: [settings.mail.to],
        subjectTag: [settings.mail.subjectTag]
      }),
      indexBackup: this.formBuilder.group({
        active: [settings.indexBackup.active],
        indexPattern: [settings.indexBackup.indexPattern],
        cronPattern: [settings.indexBackup.cronPattern],
        dir: [settings.indexBackup.dir]
      }),
      maxDiff: [settings.maxDiff]
    })
  }

  dbConnectionCheck: string;
  esConnectionCheck: string;
  
}
