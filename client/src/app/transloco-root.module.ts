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