import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {CswSettings} from '../../../../../../server/app/importer/csw/csw.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
import {FormControl, FormGroup} from '@angular/forms';
// import {CswSettings} from '@server/importer/csw/csw.importer';

@Component({
  selector: 'app-csw-harvester',
  templateUrl: './csw-harvester.component.html',
  styleUrls: ['./csw-harvester.component.scss']
})
export class CswHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: CswSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
    this.form.addControl('httpMethod', new FormControl(this.model.httpMethod));
    this.form.addControl('getRecordsUrl', new FormControl(this.model.getRecordsUrl));
    this.form.addControl('recordFilter', new FormControl(this.model.recordFilter));

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
