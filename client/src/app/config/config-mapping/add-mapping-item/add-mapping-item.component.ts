import {Component, Inject, OnInit} from '@angular/core';
import {MappingItem} from '@shared/mapping.model';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";

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
  filteredOptions: string[];

  constructor(@Inject(MAT_DIALOG_DATA) private options: string[]) { }

  ngOnInit() {
    this.filterOptions(null);
  }

  filterOptions(text: string) {
    if (!text || text.trim().length === 0) {
      this.filteredOptions = this.options;
    } else {
      const textLowerCase = text.toLowerCase();
      this.filteredOptions = this.options.filter(option => option.toLowerCase().indexOf(textLowerCase) === 0)
    }
  }
}
