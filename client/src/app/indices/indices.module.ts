import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IndicesListComponent} from './indices-list/indices-list.component';
import {RouterModule, Routes} from '@angular/router';
import {MatIconModule, MatListModule, MatCardModule} from '@angular/material';
import {SharedModule} from '../shared/shared.module';
import {FlexLayoutModule} from "@angular/flex-layout";

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
    FlexLayoutModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    SharedModule
  ]
})
export class IndicesModule {
}
