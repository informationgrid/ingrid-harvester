import { Injectable } from "@angular/core";
import { Route, Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { routes } from "../app.router";
// import { SessionStore } from "../store/session.store";

@Injectable({
  providedIn: "root",
})
export class MainMenuService {
  private _mainRoutes = routes;

  menu$ = new BehaviorSubject<Route[]>(this.mainRoutes);

  constructor(
    private router: Router,
    // private sessionStore: SessionStore,
  ) {}

  get mainRoutes(): Route[] {
    return this._mainRoutes.filter(
      (item) =>
        item.path !== "" &&
        !item.data?.hideFromMenu &&
        (!item.data?.featureFlag),
    );
  }

  addMenuItem(label: string, path: string, component: any) {
    const routerConfig = this.router.config;
    routerConfig.push({ path: path, component: component });
    this._mainRoutes.push({ data: { title: label }, path: "/" + path });
    this.menu$.next(null);
  }

  removeMenuItem(path: string) {
    let indexToRemove = this.router.config.findIndex(
      (item: any) => item.path === path,
    );
    this.router.config.splice(indexToRemove, 1);

    indexToRemove = this._mainRoutes.findIndex(
      (item: any) => item.path === path,
    );
    this._mainRoutes.splice(indexToRemove, 1);

    this.menu$.next(null);
  }

}