/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2022 wemove digital solutions GmbH
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

import {Component, OnInit} from '@angular/core';
import {ConfigService} from '../config.service';
import {HarvesterService} from '../../harvester/harvester.service';
import {UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {of} from 'rxjs';
import {GeneralSettings} from '@shared/general-config.settings';
import cronstrue from 'cronstrue/i18n';
import { isValidCron } from 'cron-validator';

@Component({
  selector: 'app-config-general',
  templateUrl: './config-general.component.html',
  styleUrls: ['./config-general.component.scss']
})
export class ConfigGeneralComponent implements OnInit {

  configForm: UntypedFormGroup;

  constructor(private formBuilder: UntypedFormBuilder, private configService: ConfigService, private harvesterService: HarvesterService) {
  }

  ngOnInit() {
    this.reset();
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
      elasticSearchUrl: [settings.elasticSearchUrl, Validators.required, ConfigGeneralComponent.elasticUrlValidator],
      elasticSearchPassword: [settings.elasticSearchPassword],
      alias: [settings.alias, Validators.required, ConfigGeneralComponent.noWhitespaceValidator],
      numberOfShards: [settings.numberOfShards],
      numberOfReplicas: [settings.numberOfReplicas],
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


    this.urlCheckTranslate(settings.urlCheck.pattern);
    this.indexCheckTranslate(settings.indexCheck.pattern);
    this.indexBackupCronTranslate(settings.indexBackup.cronPattern);
  }


  urlCheckTranslation: string;
  indexCheckTranslation: string;
  indexBackupCronTranslation: string;
  showInfo = false;
  showBackupCronInfo = false;

  urlCheckTranslate(cronExpression: string) {
    try {
      if (!isValidCron(cronExpression)) {
        throw new Error('Kein gültiger Ausdruck');
      }
      this.urlCheckTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
    } catch (e) {
      this.urlCheckTranslation = 'Kein gültiger Ausdruck';
    }

    if (!this.configForm.get('urlCheck.active').value) {
      this.urlCheckTranslation = 'Planung ausgeschaltet';
      return;
    }
  }

  clearUrlCheckInput() {
    this.configForm.get('urlCheck.pattern').setValue('');
    this.urlCheckTranslate('');
  }

  indexCheckTranslate(cronExpression: string) {
    try {
      if (!isValidCron(cronExpression)) {
        throw new Error('Kein gültiger Ausdruck');
      }
      this.indexCheckTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
    } catch (e) {
      this.indexCheckTranslation = 'Kein gültiger Ausdruck';
    }

    if (!this.configForm.get('indexCheck.active').value) {
      this.indexCheckTranslation = 'Planung ausgeschaltet';
      return;
    }
  }

  clearIndexCheckInput() {
    this.configForm.get('indexCheck.pattern').setValue('');
    this.indexCheckTranslate('');
  }


  indexBackupCronTranslate(cronExpression: string) {
    try {
      if (!isValidCron(cronExpression)) {
        throw new Error('Kein gültiger Ausdruck');
      }
      this.indexBackupCronTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
    } catch (e) {
      this.indexBackupCronTranslation = 'Kein gültiger Ausdruck';
    }

    if (!this.configForm.get('indexBackup.active').value) {
      this.indexBackupCronTranslation = 'Planung ausgeschaltet';
      return;
    }
  }

  clearIndexBackupCronInput() {
    this.configForm.get('indexBackup.cronPattern').setValue('');
    this.indexBackupCronTranslate('');
  }
}
