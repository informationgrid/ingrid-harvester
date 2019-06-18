import {BrowserModule} from '@angular/platform-browser';
import {LOCALE_ID, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import {HarvesterModule} from "./harvester/harvester.module";
import {registerLocaleData} from "@angular/common";
import localeDe from '@angular/common/locales/de'
import {ConfigModule} from "./config/config.module";
import {HttpClientModule} from "@angular/common/http";
import {SocketIoModule, SocketIoConfig} from 'ngx-socket-io';
import {FlexLayoutModule} from '@angular/flex-layout';

const config: SocketIoConfig = {url: 'http://localhost:8080/import', options: {}};

registerLocaleData(localeDe);

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    SocketIoModule.forRoot(config),
    FlexLayoutModule,
    NoopAnimationsModule,
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
