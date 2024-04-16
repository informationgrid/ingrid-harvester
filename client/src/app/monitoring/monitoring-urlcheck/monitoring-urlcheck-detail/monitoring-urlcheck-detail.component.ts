/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
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

import {AfterViewInit, Component, Inject, OnInit, ViewChild} from '@angular/core';
import {Harvester} from '@shared/harvester';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import { Chart } from 'chart.js';
import {STATUS_CODES} from 'http';
import {ConfigService} from "../../../config/config.service";
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';


@Component({
  selector: 'app-monitoring-urlcheck-detail',
  templateUrl: './monitoring-urlcheck-detail.component.html',
  styleUrls: ['./monitoring-urlcheck-detail.component.scss']
})
export class MonitoringUrlcheckDetailComponent implements OnInit {

  @ViewChild(CdkVirtualScrollViewport, {static: false})
  viewPort: CdkVirtualScrollViewport;

  dialogTitle = 'UrlCheck Details';

  data ;

  portalUrl;


  constructor(@Inject(MAT_DIALOG_DATA) public details: any,
              public dialogRef: MatDialogRef<MonitoringUrlcheckDetailComponent>,
              private configService: ConfigService) {

      this.data = details;
      this.data.status.sort((a, b) => {
        if(!isNaN(a.code) === !isNaN(b.code)){
          if(a.code === b.code) return 0;
          return (a.code < b.code)?-1:1;
        } else if(!isNaN(a.code)){
          return -1
        } else if(!isNaN(b.code)){
          return 1
        } else {
          return 0;
        }
      });

      let timeStampDate = new Date(details.timestamp);
      this.dialogTitle = timeStampDate.getDate().toString().padStart(2, '0')+'.'+(timeStampDate.getMonth()+1).toString().padStart(2, '0')+'.'+timeStampDate.getFullYear();


    this.configService.fetch().subscribe(data => {
      this.portalUrl = data.portalUrl.trim();
      if(!this.portalUrl) this.portalUrl = "https://mcloud.de/";
      if(!this.portalUrl.endsWith('/')) this.portalUrl += '/';
    });
  }

  ngOnInit() {

  }

  getLabelForStatus(status){
    switch(status){
      case '200' : return ' - OK';
      case '400' : return ' - Bad Request';
      case '401' : return ' - Unauthorized';
      case '403' : return ' - Forbidden';
      case '404' : return ' - Not Found';
      case '405' : return ' - Method Not Allowed';
      case '500' : return ' - Internal Server Error';
      case '501' : return ' - Not Implemented';
      case '502' : return ' - Bad Gateway';
      case '503' : return ' - Service Unavailable';
      case '504' : return ' - Gateway Timeout';
    }
  }

  goToPortal(accessURL){
    window.open(this.portalUrl+'web/guest/suche/-/results/suche/relevance/0?_mcloudsearchportlet_query='+encodeURIComponent('distribution.accessURL:"'+accessURL+'"'), '_blank');
  }
}
