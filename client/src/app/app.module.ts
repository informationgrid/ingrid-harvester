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
import {FlexLayoutModule} from '@angular/flex-layout';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ConfigService} from './config.service';
import {environment} from '../environments/environment';
import {UnauthorizedInterceptor} from './security/unauthorized.interceptor';
import {LoginComponent} from './security/login.component';
import {ReactiveFormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {AuthenticationService} from './security/authentication.service';
import { GoogleChartsModule } from 'angular-google-charts';

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
    FlexLayoutModule,
    HttpClientModule,
    MatToolbarModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    GoogleChartsModule
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
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
