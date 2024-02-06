/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { AbstractControl, UntypedFormControl, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Component, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Contact } from '../../../../../../server/app/model/agent';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
// import { Subscription } from 'rxjs';
import { WfsSettings } from '../../../../../../server/app/importer/wfs/wfs.settings';

@Component({
  selector: 'app-wfs-harvester',
  templateUrl: './wfs-harvester.component.html',
  styleUrls: ['./wfs-harvester.component.scss']
})
export class WfsHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: UntypedFormGroup;
  @Input() model: WfsSettings;
  @Input() rulesTemplate: TemplateRef<any>;

  private static ContactValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value?.trim()) {
      return null;
    }
    try {
      const contact = JSON.parse(control.value) as Contact;
      return contact.fn != null ? null : { 'contact': 'Not a valid contact ("fn" is mandatory)' };
    }
    catch (e) {
      return { 'contact': 'Not a valid JSON object' };
    }
  }

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  // private contactMetadataSubscription: Subscription;

  constructor() { }

  ngOnInit() {
    this.form.addControl('httpMethod', new UntypedFormControl(this.model.httpMethod));
    this.form.addControl('getFeaturesUrl', new UntypedFormControl(this.model.getFeaturesUrl));
    this.form.addControl('featuresFilter', new UntypedFormControl(this.model.featureFilter));
    this.form.addControl('version', new UntypedFormControl(this.model.version));
    this.form.addControl('typename', new UntypedFormControl(this.model.typename));
    this.form.addControl('catalogId', new UntypedFormControl(this.model.catalogId));
    this.form.addControl('pluPlanState', new UntypedFormControl(this.model.pluPlanState));
    this.form.addControl('contactCswUrl', new UntypedFormControl(this.model.contactCswUrl));
    this.form.addControl('contactMetadata', new UntypedFormControl(JSON.stringify(this.model.contactMetadata, null, 4), WfsHarvesterComponent.ContactValidator));

    // this is intended to set the model.contactMetadata to a JS object,
    // but the change gets overwritten somewhere on the way to harvester.component.ts
    // as a hack, it is set there instead...
    // this.contactMetadataSubscription = this.form.get('contactMetadata').valueChanges.subscribe(value => {
    //   try {
    //     this.model.contactMetadata = JSON.parse(value);
    //   }
    //   catch (e) {
    //     // swallow
    //   }
    // });
  }

  ngOnDestroy(): void {
    // this.contactMetadataSubscription.unsubscribe();
  }
}
