import { ActivatedRouteSnapshot, DetachedRouteHandle, Route, RouteReuseStrategy, RouterModule, Routes } from "@angular/router";
import {LoginComponent} from './security/login.component';
  
  export const routes: Routes = [
    {
        path: 'dashboard', 
        loadChildren: () => import('./monitoring/monitoring.module').then(mod => mod.MonitoringModule),
        data: {
            icon: "Uebersicht",
            partOfMenu: true
        },
    },
    {
        path: 'harvester', 
        loadChildren: () => import('./harvester/harvester.module').then(mod => mod.HarvesterModule),
        data: {
            icon: "Harvester",
            partOfMenu: true
        },
    },
    {
        path: 'config', 
        loadChildren: () => import('./config/config.module').then(mod => mod.ConfigModule),
        data: {
            icon: "Configuration",
            partOfMenu: true
        },
    },
    {
        path: 'indices', 
        loadChildren: () => import('./indices/indices.module').then(mod => mod.IndicesModule),
        data: {
            icon: "Indices",
            partOfMenu: true
        },
    },
    {
        path: 'log', 
        loadChildren: () => import('./log/log.module').then(mod => mod.LogModule),
        data: {
            icon: "Logging",
            partOfMenu: true
        },
    },
    {
        path: 'login', component: LoginComponent,
        data: {
          icon: "Logging",
          partOfMenu: false
        },
    },
    {
        path: '', redirectTo: '/dashboard', pathMatch: 'full'
    }
  ];
  
  // export const appRoutingProviders: any[] = [];
  
  export const routing = RouterModule.forRoot(routes, {
    // preloadingStrategy: PreloadAllModules,
    // relativeLinkResolution: "legacy",
    enableTracing: false,
  });
  



  export class CustomReuseStrategy implements RouteReuseStrategy {
    routesToCache: string[] = [
    ];
  
    private handlers: Map<Route, DetachedRouteHandle> = new Map();
  
    constructor() {
    //   configService.$userInfo
    //     .pipe(filter((user) => user !== null))
    //     .subscribe((user) => {
    //       const catalogId = user.currentCatalog.id;
    //       this.routesToCache = this.routesToCache.map(
    //         (route) => "/" + catalogId + route,
    //       );
    //     });
    }
  
    public shouldDetach(_route: ActivatedRouteSnapshot): boolean {
      return this.routesToCache.some(
        // @ts-ignore
        (definiton) => _route._routerState.url.indexOf(definiton) === 0,
      );
    }
  
    public store(
      route: ActivatedRouteSnapshot,
      handle: DetachedRouteHandle,
    ): void {
      if (!route.routeConfig) return;
      this.handlers.set(route.routeConfig, handle);
    }
  
    public shouldAttach(route: ActivatedRouteSnapshot): boolean {
      return !!route.routeConfig && !!this.handlers.get(route.routeConfig);
    }
  
    public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
      if (!route.routeConfig || !this.handlers.has(route.routeConfig))
        return null;
      return this.handlers.get(route.routeConfig)!;
    }
  
    public shouldReuseRoute(
      future: ActivatedRouteSnapshot,
      curr: ActivatedRouteSnapshot,
    ): boolean {
      return future.routeConfig === curr.routeConfig;
    }
  }
  