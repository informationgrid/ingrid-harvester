import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {DcatSettings} from '../../../../../../server/app/importer/dcat/dcat.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-dcat-harvester',
  templateUrl: './dcat-harvester.component.html',
  styleUrls: ['./dcat-harvester.component.scss']
})
export class DcatHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: DcatSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
    this.form.addControl('catalogUrl', new FormControl(this.getModelField('catalogUrl', '')));

    this.form.addControl('providerPrefix', new FormControl(this.getModelField('providerPrefix', '')));
    this.form.addControl('dcatProviderField', new FormControl(this.getModelField('dcatProviderField', 'creator')));

  }

  private getModelField(field: string, defaultValue: any) {
    let current = this.model;
    const items = field.split('.');

    const exists = items.every(item => {
      current = current[item];
      return current;
    });

    return exists ? current : defaultValue;
  }

  ngOnDestroy(): void {
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }
}
