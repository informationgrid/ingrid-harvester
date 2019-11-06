import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IndicesListComponent} from './indices-list/indices-list.component';
import {RouterModule, Routes} from '@angular/router';
import {MatIconModule, MatListModule} from '@angular/material';
import {SharedModule} from '../shared/shared.module';

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
    SharedModule
  ]
})
export class IndicesModule {
}
