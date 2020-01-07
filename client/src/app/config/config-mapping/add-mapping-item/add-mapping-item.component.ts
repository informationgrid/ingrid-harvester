import { Component, OnInit } from '@angular/core';
import {MappingItem} from '@shared/mapping.model';

@Component({
  selector: 'app-add-mapping-item',
  templateUrl: './add-mapping-item.component.html',
  styleUrls: ['./add-mapping-item.component.scss']
})
export class AddMappingItemComponent implements OnInit {

  data: MappingItem = {
    source: '',
    target: ''
  };

  constructor() { }

  ngOnInit() {
  }

}
