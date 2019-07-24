import {BrowserModule} from '@angular/platform-browser';
import {RouterModule, Routes} from '@angular/router';
import {APP_INITIALIZER, LOCALE_ID, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {registerLocaleData} from '@angular/common';
import localeDe from '@angular/common/locales/de';
import {HttpClientModule} from '@angular/common/http';
import {Socket, SocketIoConfig, SocketIoModule} from 'ngx-socket-io';
import {FlexLayoutModule} from '@angular/flex-layout';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ConfigService} from './config.service';
import {WrappedSocket} from 'ngx-socket-io/src/socket-io.service';

let config: SocketIoConfig = {url: 'http://localhost:8090/import', options: {}};

registerLocaleData(localeDe);

export function ConfigLoader(configService: ConfigService, socket: Socket) {
  return () => {
    return configService.load('assets/config.json').subscribe();
      /*.then(json => {
        debugger;
        config = {url: json.backendUrl + '/ttt/import', options: {}};
        socket.ioSocket.io.uri = config.url;
        // socket.disconnect(true);
        // socket.connect();
        return config;
      });*/
  };
}

export function MySocketFactory() {
  return () => {
  debugger;
    let config2 = {url: 'yyy/import', options: {}};
    return new WrappedSocket(config2);
  };

}

const appRoutes: Routes = [
  {path: 'config', loadChildren: () => import('./config/config.module').then(mod => mod.ConfigModule)},
  {path: 'harvester', loadChildren: () => import('./harvester/harvester.module').then(mod => mod.HarvesterModule)},
  {path: 'log', loadChildren: () => import('./log/log.module').then(mod => mod.LogModule)},
  {path: '', redirectTo: '/harvester', pathMatch: 'full'}
];

@NgModule({
  declarations: [
    AppComponent
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
    MatIconModule
  ],
  providers: [
    {
      provide: LOCALE_ID,
      useValue: 'de'
    }, {
      provide: APP_INITIALIZER,
      useFactory: ConfigLoader,
      deps: [ConfigService, Socket],
      multi: true
    }, /*{
      provide: SOCKET_CONFIG_TOKEN,
      useFactory: ConfigLoader,
      deps: [ConfigService]
    },*/
    /*{
      provide: WrappedSocket,
      useFactory: MySocketFactory,
      deps: []
    }*/
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
