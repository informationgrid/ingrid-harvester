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

import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, tap} from 'rxjs/operators';
import {AuthenticationService} from './authentication.service';
import {Router} from '@angular/router';
import {inject, Injectable, Injector} from "@angular/core";

@Injectable()
export class UnauthorizedInterceptor implements HttpInterceptor {

  private auth: AuthenticationService;
  private router = inject(Router);

  constructor(
    private injector: Injector,
  ) {
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.auth) {
      this.auth = this.injector.get(AuthenticationService);
    }
    return this.handleRequest(request, next);
  }

  private handleRequest(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            // Only clear local session and redirect to login, but don't log out from Keycloak.
            // This is because the token could not be refreshed (refresh token expired)
            // or the session is just gone.
            this.auth.logout(false).subscribe(() => this.router.navigate(['login']));
          }
        }
        throw err;
      })
    );
  }
}
