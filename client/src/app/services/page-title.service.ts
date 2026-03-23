import { RouterStateSnapshot, TitleStrategy } from "@angular/router";
import { Injectable } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { TranslocoService } from "@ngneat/transloco";

@Injectable({ providedIn: "root" })
export class PageTitleService extends TitleStrategy {
  constructor(
    private title: Title,
    private transloco: TranslocoService,
  ) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(routerState);

    // Guarantee translations are loaded.
    this.transloco
      .selectTranslate("pageTitle.default")
      .subscribe((defaultTitle) => {
        let pageTitle = defaultTitle;
        if (routeTitle) {
          pageTitle += " | " + this.transloco.translate(routeTitle);
        }
        this.title.setTitle(pageTitle);
      });
  }
}
