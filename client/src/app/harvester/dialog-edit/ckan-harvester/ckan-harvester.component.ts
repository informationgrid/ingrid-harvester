import {Component, Input, OnDestroy} from '@angular/core';
import {CkanSettings} from '../../../../../../server/importer/ckan/ckan.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';

@Component({
  selector: 'app-ckan-harvester',
  templateUrl: './ckan-harvester.component.html',
  styleUrls: ['./ckan-harvester.component.scss']
})
export class CkanHarvesterComponent implements OnDestroy {

  @Input() model: CkanSettings;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() { }

  ngOnDestroy(): void {
  }

  add(type: 'filterTags' | 'filterGroups', event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add keyword
    if ((value || '').trim()) {
      this.model[type].push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  remove(type: 'filterTags' | 'filterGroups', keyword: string): void {
    const index = this.model[type].indexOf(keyword);

    if (index >= 0) {
      this.model[type].splice(index, 1);
    }
  }

}
