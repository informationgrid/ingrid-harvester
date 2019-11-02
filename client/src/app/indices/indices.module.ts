import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IndicesListComponent } from './indices-list/indices-list.component';
import {RouterModule, Routes} from '@angular/router';
import {HarvesterComponent} from '../harvester/harvester.component';
import {MatButtonModule, MatIconModule, MatListModule} from '@angular/material';

const routes: Routes = [
  {
    path: '',
    component: IndicesListComponent
  }
];

@NgModule({
  declarations: [IndicesListComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ]
})
export class IndicesModule { }
