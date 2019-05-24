import {Component, Input, OnDestroy} from '@angular/core';

@Component({
  selector: 'app-csw-harvester',
  templateUrl: './csw-harvester.component.html',
  styleUrls: ['./csw-harvester.component.scss']
})
export class CswHarvesterComponent implements OnDestroy {

  @Input() model: any;

  constructor() { }

  ngOnDestroy(): void {
    delete this.model.getRecordsUrl;
    delete this.model.httpMethod;
    delete this.model.defaultAttribution;
    delete this.model.defaultAttributionLink;
  }
}
