import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-csw-harvester',
  templateUrl: './csw-harvester.component.html',
  styleUrls: ['./csw-harvester.component.scss']
})
export class CswHarvesterComponent implements OnInit {

  @Input() model: any;

  constructor() { }

  ngOnInit() {
  }

}
