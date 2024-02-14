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

import {BrowserModule} from '@angular/platform-browser';
import {Router, RouterModule, Routes} from '@angular/router';
import {APP_INITIALIZER, LOCALE_ID, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {registerLocaleData} from '@angular/common';
import localeDe from '@angular/common/locales/de';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ConfigService} from './config.service';
import {environment} from '../environments/environment';
import {UnauthorizedInterceptor} from './security/unauthorized.interceptor';
import {LoginComponent} from './security/login.component';
import {ReactiveFormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule} from '@angular/material/form-field';
import { MAT_CARD_CONFIG } from '@angular/material/card'; 
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {AuthenticationService} from './security/authentication.service';

registerLocaleData(localeDe);

export function ConfigLoader(configService: ConfigService) {
  return () => {
    return configService.load('assets/' + environment.configFile)
      .subscribe();
  };
}

const appRoutes: Routes = [
  {path: 'config', loadChildren: () => import('./config/config.module').then(mod => mod.ConfigModule)},
  {path: 'harvester', loadChildren: () => import('./harvester/harvester.module').then(mod => mod.HarvesterModule)},
  {path: 'monitoring', loadChildren: () => import('./monitoring/monitoring.module').then(mod => mod.MonitoringModule)},
  {path: 'indices', loadChildren: () => import('./indices/indices.module').then(mod => mod.IndicesModule)},
  {path: 'log', loadChildren: () => import('./log/log.module').then(mod => mod.LogModule)},
  {path: 'login', component: LoginComponent},
  {path: '', redirectTo: '/harvester', pathMatch: 'full'}
];

@NgModule({
  declarations: [
    AppComponent, LoginComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes),
    ReactiveFormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  providers: [
    {
      provide: LOCALE_ID,
      useValue: 'de'
    }, {
      provide: APP_INITIALIZER,
      useFactory: ConfigLoader,
      deps: [ConfigService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: UnauthorizedInterceptor,
      deps: [Router, AuthenticationService],
      multi: true
    },
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'outline', floatLabel: 'auto'}},
    {provide: MAT_CARD_CONFIG, useValue: {appearance: 'raised'}},
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
