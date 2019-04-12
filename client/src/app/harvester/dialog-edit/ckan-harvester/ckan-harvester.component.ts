import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-ckan-harvester',
  templateUrl: './ckan-harvester.component.html',
  styleUrls: ['./ckan-harvester.component.scss']
})
export class CkanHarvesterComponent implements OnInit {

  @Input() model: any;

  constructor() { }

  ngOnInit() {
  }

}
