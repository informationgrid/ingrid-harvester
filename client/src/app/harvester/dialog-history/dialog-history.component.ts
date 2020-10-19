import {Component, Inject, OnInit} from '@angular/core';
import {Harvester} from '@shared/harvester';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';


@Component({
  selector: 'app-dialog-history',
  templateUrl: './dialog-history.component.html',
  styleUrls: ['./dialog-history.component.scss']
})
export class DialogHistoryComponent implements OnInit {

  dialogTitle = 'Harvester Historie';

  harvesterForm: FormGroup;

  title = 'Browser market shares at a specific website, 2014';
  type = 'LineChart';
  data = [
    ["Jan",  7.0, -0.2, -0.9, 3.9],
    ["Feb",  6.9, 0.8, 0.6, 4.2],
    ["Mar",  9.5,  5.7, 3.5, 5.7],
    ["Apr",  14.5, 11.3, 8.4, 8.5],
    ["May",  18.2, 17.0, 13.5, 11.9],
    ["Jun",  21.5, 22.0, 17.0, 15.2],
    ["Jul",  25.2, 24.8, 18.6, 17.0],
    ["Aug",  26.5, 24.1, 17.9, 16.6],
    ["Sep",  23.3, 20.1, 14.3, 14.2],
    ["Oct",  18.3, 14.1, 9.0, 10.3],
    ["Nov",  13.9,  8.6, 3.9, 6.6],
    ["Dec",  9.6,  2.5,  1.0, 4.8]
  ];
  columnNames = ["Month", "Tokyo", "New York","Berlin", "Paris"];
  options = {
    hAxis: {
      title: 'Month',
      textStyle: {
        color: '#FFFFFF'
      }
    },
    vAxis:{
      title: 'Temperature',
      textStyle: {
        color: '#FFFFFF'
      }
    },
    pointSize:5,
    backgroundColor: '#424242',
    legend: {
      textStyle: {
        color: '#FFFFFF'
      }
    }
  };
  width = 800;
  height = 400;

  constructor(@Inject(MAT_DIALOG_DATA) public harvester: Harvester,
              public dialogRef: MatDialogRef<DialogHistoryComponent>,
              private formBuilder: FormBuilder) {

      //this.buildForm(harvester);



  }

  ngOnInit() {

  }
}
