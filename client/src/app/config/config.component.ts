import {Component, OnInit} from '@angular/core';
import {ConfigService} from "./config.service";
import {GeneralSettings} from "@shared/general-config.settings";
import {HarvesterService} from '../harvester/harvester.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {of} from 'rxjs';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {

  private configForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private configService: ConfigService, private harvesterService: HarvesterService) {
  }

  ngOnInit() {
    this.reset();

    // @ts-ignore
    this.buildForm({});
  }

  private static noWhitespaceValidator(control: FormControl) {
    const isWhitespace = (control.value || "").trim().length === 0;
    const isValid = !isWhitespace;
    return of(isValid ? null : { "whitespace": true });
  }

  private static elasticUrlValidator(control: FormControl) {
    if (!control.value) return of(null);

    let isValid = false;

    const protocolPart = control.value.split('://');
    if (protocolPart.length === 2) {
      const portPart = protocolPart[1].split(':');
      if (portPart.length === 2) {
        const port = portPart[1];
        isValid = !isNaN(port) && port > 0 && port < 10000;
      }
    }
    return of(isValid ? null : { "elasticUrl": true });
  }

  save() {
    this.configService.save(this.configForm.value).subscribe();
  }

  reset() {
    this.configService.fetch().subscribe(data => this.buildForm(data));
  }

  exportHarvesterConfig() {
    this.harvesterService.getHarvester().subscribe(data => {
      ConfigService.downLoadFile(JSON.stringify(data, null, 2));
    });
  }

  private buildForm(settings: GeneralSettings) {
    this.configForm = this.formBuilder.group({
      elasticSearchUrl: [settings.elasticSearchUrl, Validators.required, ConfigComponent.elasticUrlValidator],
      alias: [settings.alias, Validators.required, ConfigComponent.noWhitespaceValidator],
      proxy: [settings.proxy]
    })
  }
}
