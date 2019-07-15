import {BrowserModule} from '@angular/platform-browser';
import {RouterModule, Routes} from '@angular/router';
import {LOCALE_ID, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {MatIconModule} from "@angular/material/icon";
import {MatListModule} from "@angular/material/list";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatToolbarModule} from "@angular/material/toolbar";
import {HarvesterModule} from "./harvester/harvester.module";
import {registerLocaleData} from "@angular/common";
import localeDe from '@angular/common/locales/de'
import {ConfigModule} from "./config/config.module";
import {HttpClientModule} from "@angular/common/http";
import {SocketIoConfig, SocketIoModule} from 'ngx-socket-io';
import {FlexLayoutModule} from '@angular/flex-layout';
import {LogComponent} from './log/log.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

const config: SocketIoConfig = {url: 'http://localhost:8080/import', options: {}};

registerLocaleData(localeDe);

const appRoutes: Routes = [
  { path: 'config', loadChildren: () => import('./config/config.module').then(mod => mod.ConfigModule) },
  { path: 'harvester', loadChildren: () => import('./harvester/harvester.module').then(mod => mod.HarvesterModule) },
  { path: 'log', component: LogComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    LogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes),
    SocketIoModule.forRoot(config),
    FlexLayoutModule,
    HttpClientModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    HarvesterModule,
    ConfigModule
  ],
  providers: [
    {
      provide: LOCALE_ID,
      useValue: 'de'
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
