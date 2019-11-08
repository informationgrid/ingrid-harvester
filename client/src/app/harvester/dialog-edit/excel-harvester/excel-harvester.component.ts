import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-excel-harvester',
  templateUrl: './excel-harvester.component.html',
  styleUrls: ['./excel-harvester.component.scss']
})
export class ExcelHarvesterComponent implements OnInit, OnDestroy {

  @Input() form: FormGroup;
  @Input() model: any;

  constructor() {
  }

  ngOnInit(): void {
    this.form.addControl('filePath', new FormControl(this.model ? this.model.filePath : ''));
  }

  ngOnDestroy(): void {
  }

}
