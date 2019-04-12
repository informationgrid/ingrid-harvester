import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-excel-harvester',
  templateUrl: './excel-harvester.component.html',
  styleUrls: ['./excel-harvester.component.scss']
})
export class ExcelHarvesterComponent implements OnInit {

  @Input() model: any;

  constructor() { }

  ngOnInit() {
  }

}
