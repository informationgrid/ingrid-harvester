import {Component, Input, OnDestroy} from '@angular/core';

@Component({
  selector: 'app-ckan-harvester',
  templateUrl: './ckan-harvester.component.html',
  styleUrls: ['./ckan-harvester.component.scss']
})
export class CkanHarvesterComponent implements OnDestroy {

  @Input() model: any;

  constructor() { }

  ngOnDestroy(): void {
    delete this.model.ckanBaseUrl;
  }

}
