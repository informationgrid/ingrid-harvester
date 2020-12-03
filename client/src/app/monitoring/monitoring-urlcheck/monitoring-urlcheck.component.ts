import {Component, OnInit} from '@angular/core';
import {MonitoringService} from '../monitoring.service';
import {HarvesterService} from '../../harvester/harvester.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {forkJoin, of} from 'rxjs';
import {GeneralSettings} from '@shared/general-config.settings';

@Component({
  selector: 'app-monitoring-urlcheck',
  templateUrl: './monitoring-urlcheck.component.html',
  styleUrls: ['./monitoring-urlcheck.component.scss']
})
export class MonitoringUrlcheckComponent implements OnInit {

  configForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private configService: MonitoringService, private harvesterService: HarvesterService) {
  }

  ngOnInit() {

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


  private buildForm(settings: GeneralSettings) {
    if(!settings.mail)
    {
      settings.mail={
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
      elasticSearchUrl: [settings.elasticSearchUrl, Validators.required, MonitoringUrlcheckComponent.elasticUrlValidator],
      alias: [settings.alias, Validators.required, MonitoringUrlcheckComponent.noWhitespaceValidator],
      numberOfShards: [settings.numberOfShards],
      numberOfReplicas: [settings.numberOfReplicas],
      cronOffset: [settings.cronOffset],
      proxy: [settings.proxy],
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
  }
}
