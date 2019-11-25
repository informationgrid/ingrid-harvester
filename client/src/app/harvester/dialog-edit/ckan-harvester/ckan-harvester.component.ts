import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {CkanSettings} from '../../../../../../server/app/importer/ckan/ckan.settings';
import {FormControl, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-ckan-harvester',
  templateUrl: './ckan-harvester.component.html',
  styleUrls: ['./ckan-harvester.component.scss']
})
export class CkanHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: CkanSettings;

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

}
