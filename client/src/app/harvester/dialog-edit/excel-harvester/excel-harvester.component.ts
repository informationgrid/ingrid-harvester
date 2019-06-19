import {Component, Input, OnDestroy} from '@angular/core';

@Component({
  selector: 'app-excel-harvester',
  templateUrl: './excel-harvester.component.html',
  styleUrls: ['./excel-harvester.component.scss']
})
export class ExcelHarvesterComponent implements OnDestroy {

  @Input() model: any;

  constructor() { }

  ngOnDestroy(): void {
  }

}
