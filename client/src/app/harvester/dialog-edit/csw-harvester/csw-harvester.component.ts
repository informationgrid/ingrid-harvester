import {Component, Input, OnDestroy} from '@angular/core';
import {CswSettings} from '../../../../../../server/importer/csw/csw.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
// import {CswSettings} from '@server/importer/csw/csw.importer';

@Component({
  selector: 'app-csw-harvester',
  templateUrl: './csw-harvester.component.html',
  styleUrls: ['./csw-harvester.component.scss']
})
export class CswHarvesterComponent implements OnDestroy {

  @Input() model: CswSettings;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

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
