import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {LogComponent} from './log.component';
import {ScrollingModule} from '@angular/cdk/scrolling';

const routes: Routes = [
  {
    path: '',
    component: LogComponent
  }
];

@NgModule({
  declarations: [LogComponent],
  imports: [
    CommonModule,
    ScrollingModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    LogComponent
  ]
})
export class LogModule { }
