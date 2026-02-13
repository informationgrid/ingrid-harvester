/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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

import { BrowserModule } from "@angular/platform-browser";
import { Router, RouterModule, Routes } from "@angular/router";
import {
  inject,
  LOCALE_ID,
  NgModule,
  provideAppInitializer,
} from "@angular/core";

import { AppComponent } from "./app.component";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { registerLocaleData } from "@angular/common";
import localeDe from "@angular/common/locales/de";
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { ConfigService } from "./config.service";
import { environment } from "../environments/environment";
import { UnauthorizedInterceptor } from "./security/unauthorized.interceptor";
import { LoginComponent } from "./security/login.component";
import { ReactiveFormsModule } from "@angular/forms";
import { MAT_CARD_CONFIG, MatCardModule } from "@angular/material/card";
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldModule,
} from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { AuthenticationService } from "./security/authentication.service";
import { SideMenuComponent } from "./side-menu/side-menu.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { TranslocoService } from "@ngneat/transloco";
import { TranslocoRootModule } from "./transloco-root.module";
import { MainHeaderComponent } from "./main-header/main-header.component";
import { routes } from "./app.router";
import { provideFormlyCore } from "@ngx-formly/core";
import { withFormlyMaterial } from "@ngx-formly/material";
import { FormlySectionWrapperComponent } from "./formly/wrappers/formly-section-wrapper/formly-section-wrapper.component";
import { FormlyInlineHelpWrapperComponent } from "./formly/wrappers/formly-inline-help-wrapper/formly-inline-help-wrapper.component";
import { FormlyChipTypeComponent } from "./formly/types/formly-chip-type/formly-chip-type.component";
import { FormlyAutocompleteTypeComponent } from "./formly/types/formly-autocomplete-type/formly-autocomplete-type.component";

registerLocaleData(localeDe);

export function ConfigLoader(
  configService: ConfigService,
  translocoService: TranslocoService,
) {
  return () => {
    return configService.load("assets/" + environment.configFile);
    // .subscribe();
  };
}

const appRoutes: Routes = routes;

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    SideMenuComponent,
    MainHeaderComponent,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes),
    ReactiveFormsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatListModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    TranslocoRootModule,
  ],
  providers: [
    {
      provide: LOCALE_ID,
      useValue: "de",
    },
    provideAppInitializer(() => {
      const initializerFn = ConfigLoader(
        inject(ConfigService),
        inject(TranslocoService),
      );
      return initializerFn();
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: UnauthorizedInterceptor,
      deps: [Router, AuthenticationService],
      multi: true,
    },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: "outline", floatLabel: "auto" },
    },
    { provide: MAT_CARD_CONFIG, useValue: { appearance: "raised" } },
    provideHttpClient(withInterceptorsFromDi()),
    provideFormlyCore({
      types: [
        { name: "chip", component: FormlyChipTypeComponent },
        { name: "autocomplete", component: FormlyAutocompleteTypeComponent },
      ],
      wrappers: [
        { name: "section", component: FormlySectionWrapperComponent },
        { name: "inline-help", component: FormlyInlineHelpWrapperComponent },
      ],
      ...withFormlyMaterial(),
    }),
  ],
})
export class AppModule {}
