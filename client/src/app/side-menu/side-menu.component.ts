import { Component, OnInit } from "@angular/core";
import { Observable, map } from "rxjs";
import { NavigationEnd, Route, Router } from "@angular/router";
import { animate, style, transition, trigger } from "@angular/animations";
import { MainMenuService } from "../menu/main-menu.service";

@Component({
  selector: 'ige-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.scss',
  animations: [
    trigger("toggle", [
      transition("collapsed => expanded", [
        style({ width: 56 }),
        animate("300ms ease-in", style({ width: 300 })),
      ]),
      transition("* => collapsed", [
        style({ width: 300 }),
        animate("300ms ease-out", style({ width: 56 })),
      ]),
    ]),
  ],
})
export class SideMenuComponent implements OnInit {

  showDrawer: Observable<boolean>;

  menuItems: Observable<Route[]> = this.menuService.menu$.pipe(
    map((routes) => routes.filter((route) => route.data.partOfMenu == true)),
  );

  menuIsExpanded = true;

  currentRoute: string;
  toggleState = "collapsed";
  private collapsed = false;
  titleCollapsButton = "Verkleinern"

  constructor(
    private router: Router,
    private menuService: MainMenuService,
  ) {}

  ngOnInit() {
    console.log(this.menuItems)
    this.router.events.subscribe((event) => this.handleCurrentRoute(event));

    // // display the drawer if the user has at least one catalog assigned
    // this.showDrawer = this.configService.$userInfo.pipe(
    //   map((info) => info?.assignedCatalogs?.length > 0),
    // );
  }

  private handleCurrentRoute(event: any) {
    if (event instanceof NavigationEnd) {
      const urlPath = event.urlAfterRedirects.split(";")[0].substring(1);
      this.currentRoute = urlPath === "" ? "dashboard" : urlPath;
    }
  }

  toggleSidebar() {
    this.menuIsExpanded = !this.menuIsExpanded
  }

  gotoPage(path: string) {
    this.router.navigate([ "/" + path, ]);
  }
}