import {Component, OnInit, Input} from '@angular/core';
import {ImportLogMessage} from "../../../../../server/app/model/import.result";

@Component({
  selector: 'app-importer-detail',
  templateUrl: './importer-detail.component.html',
  styleUrls: ['./importer-detail.component.scss']
})
export class ImporterDetailComponent implements OnInit {

  @Input() data: ImportLogMessage;
  @Input() cronActive = false;

  constructor() {
  }

  ngOnInit() {
  }

  getProgressValue() {
    if (this.data.progress) {
      return (this.data.progress.current / this.data.progress.total) * 100
    } else {
      return 0;
    }
  }

  getNextExecutionTime(data: ImportLogMessage) {
    return null;
  }
}
