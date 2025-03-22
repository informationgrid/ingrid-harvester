/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

import { historyChart } from '../../charts/reuseableChart';
import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UntypedFormBuilder } from '@angular/forms';



@Component({
  selector: 'app-dialog-history',
  templateUrl: './dialog-history.component.html',
  styleUrls: ['./dialog-history.component.scss']
})
export class DialogHistoryComponent implements OnInit, AfterViewInit {

  dialogTitle = 'Harvester Historie: ';

  data;

  chart;

  constructor(@Inject(MAT_DIALOG_DATA) public history: any,
              public dialogRef: MatDialogRef<DialogHistoryComponent>,
              private formBuilder: UntypedFormBuilder) {
    this.data = history;
    this.dialogTitle += this.data.harvester
    Chart.register(...registerables);
  }

  ngOnInit() {
  }
  
  ngOnDestroy(): void {
    // Destroy chart instance when the component is destroyed
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  ngAfterViewInit() {
    if (this.chart) {
      this.chart.destroy(); // Destroy the existing chart instance
    }
    this.chart = historyChart('chart', this.data.history)
  }

}