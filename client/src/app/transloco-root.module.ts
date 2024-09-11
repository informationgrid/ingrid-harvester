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

import { HttpClient } from "@angular/common/http";
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
  TranslocoModule,
} from "@ngneat/transloco";
import { Injectable, isDevMode, NgModule } from "@angular/core";
import { catchError, map } from "rxjs/operators";
import { combineLatest, of } from "rxjs";
import { deepMerge } from "./services/utils";

@Injectable({ providedIn: "root" })
export class TranslocoHttpLoader implements TranslocoLoader {
  constructor(
    private http: HttpClient,
  ) {}

  getTranslation(lang: string) {
        const assetsDir = "assets";
        const sources = [
          this.http.get<Translation>(`${assetsDir}/i18n/${lang}.json`),
          this.http
            .get<Translation>(`${assetsDir}/i18n/${lang}.json`)
            .pipe(catchError(() => of({}))),
        ];
        return combineLatest(sources).pipe(
          map((files) => deepMerge(files[0], files[1], files[2])),
        );
  }
}

@NgModule({
  exports: [TranslocoModule],
  providers: [
    provideTransloco({
      config: {
        availableLangs: ["de"],
        defaultLang: "de",
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },

      loader: TranslocoHttpLoader,
    }),
  ],
})
export class TranslocoRootModule {}