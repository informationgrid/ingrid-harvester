import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {OaiSettings} from '../../../../../../server/app/importer/oai/oai.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-oai-harvester',
  templateUrl: './oai-harvester.component.html',
  styleUrls: ['./oai-harvester.component.scss']
})
export class OaiHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: OaiSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
    this.form.addControl('providerUrl', new FormControl(this.model.providerUrl));
    this.form.addControl('set', new FormControl(this.model.set));

    if (!this.model.eitherKeywords) {
      this.model.eitherKeywords = [];
    }
  }

  ngOnDestroy(): void {
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add keyword
    if ((value || '').trim()) {
      this.model.eitherKeywords.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  remove(keyword: string): void {
    const index = this.model.eitherKeywords.indexOf(keyword);

    if (index >= 0) {
      this.model.eitherKeywords.splice(index, 1);
    }
  }
}
