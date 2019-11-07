import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfigComponent} from './config.component';
import {MatButtonModule} from "@angular/material/button";
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {ReactiveFormsModule} from '@angular/forms';

const configRoutes: Routes = [
  {
    path: '',
    component: ConfigComponent
  }
];

@NgModule({
  declarations: [ConfigComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(configRoutes),
        SharedModule,
        MatButtonModule,
        ReactiveFormsModule
    ],
  exports: [
    ConfigComponent
  ]
})
export class ConfigModule { }
