import { Component, EventEmitter, Output } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";

@Component({
  selector: 'ige-main-header',
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.scss'
})
export class MainHeaderComponent {
  @Output() onLogout = new EventEmitter<void>();

  showShadow: boolean;
  pageTitle: string;

  constructor(
    private router: Router,
  ) {}

  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        const rootPath = this.router.parseUrl(this.router.url).root.children
          .primary?.segments[0]?.path;
        this.showShadow = rootPath !== "dashboard";
        this.pageTitle = rootPath;
      }
    });
  }

  async logout() {
  }

}