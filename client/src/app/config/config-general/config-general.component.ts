import {Component, OnInit} from '@angular/core';
import {ConfigService} from '../config.service';
import {HarvesterService} from '../../harvester/harvester.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {of} from 'rxjs';
import {GeneralSettings} from '@shared/general-config.settings';
import cronstrue from 'cronstrue/i18n';

@Component({
  selector: 'app-config-general',
  templateUrl: './config-general.component.html',
  styleUrls: ['./config-general.component.scss']
})
export class ConfigGeneralComponent implements OnInit {

  configForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private configService: ConfigService, private harvesterService: HarvesterService) {
  }

  ngOnInit() {
    this.reset();

    // @ts-ignore
    this.buildForm({});

  }

  private static noWhitespaceValidator(control: FormControl) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return of(isValid ? null : {'whitespace': true});
  }

  private static elasticUrlValidator(control: FormControl) {
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
        to: ""
      }
    }

    this.configForm = this.formBuilder.group({
      elasticSearchUrl: [settings.elasticSearchUrl, Validators.required, ConfigGeneralComponent.elasticUrlValidator],
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
        to: [settings.mail.to]
      }),
      maxDiff: [settings.maxDiff]
    })


    this.translate(settings.urlCheck.pattern);
  }


  cronTranslation: string;
  validExpression = true;
  showInfo = false;

  translate(cronExpression: string) {
    try {
      this.cronTranslation = cronstrue.toString(cronExpression, {locale: 'de'});
      this.validExpression = true;
    } catch (e) {
      this.cronTranslation = 'Kein gültiger Ausdruck';
      this.validExpression = false;
    }

    if (!this.configForm.get('urlCheck.active').value) {
      this.cronTranslation = 'Planung ausgeschaltet';
      return;
    }
  }

  clearInput() {
    this.configForm.get('urlCheck.pattern').setValue('');
    this.translate('');
  }
}
