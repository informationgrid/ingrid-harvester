import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {CkanSettings} from '../../../../../../server/app/importer/ckan/ckan.settings';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
import {FormControl, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-ckan-harvester',
  templateUrl: './ckan-harvester.component.html',
  styleUrls: ['./ckan-harvester.component.scss']
})
export class CkanHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: CkanSettings;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() {
  }

  ngOnInit(): void {
    this.form.addControl('ckanBaseUrl', new FormControl(this.model ? this.model.ckanBaseUrl : '', Validators.required));
    this.form.addControl('defaultLicense', new FormGroup({
        id: new FormControl(this.model && this.model.defaultLicense ? this.model.defaultLicense.id : ''),
        title: new FormControl(this.model && this.model.defaultLicense ? this.model.defaultLicense.title : ''),
        url: new FormControl(this.model && this.model.defaultLicense ? this.model.defaultLicense.url : '')
      })
    );
  }

  ngOnDestroy(): void {
  }

  add(type: 'filterTags' | 'filterGroups' | 'dateSourceFormats', event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add keyword
    if ((value || '').trim()) {
      if (!this.model[type]) this.model[type] = [];
      this.model[type].push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  remove(type: 'filterTags' | 'filterGroups' | 'dateSourceFormats', keyword: string): void {
    const index = this.model[type].indexOf(keyword);

    if (index >= 0) {
      this.model[type].splice(index, 1);
    }
  }

}
