import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {SparqlSettings} from '../../../../../../server/app/importer/sparql/sparql.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-sparql-harvester',
  templateUrl: './sparql-harvester.component.html',
  styleUrls: ['./sparql-harvester.component.scss']
})
export class SparqlHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: SparqlSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnInit() {
    this.form.addControl('endpointUrl', new FormControl(this.model.endpointUrl));
    this.form.addControl('query', new FormControl(this.model.query));

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
