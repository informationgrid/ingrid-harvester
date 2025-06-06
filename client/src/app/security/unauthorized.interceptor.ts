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

import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Observable, from, throwError} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';
import {AuthenticationService, AuthMethod} from './authentication.service';
import {Router} from '@angular/router';
import {KeycloakService} from './keycloak.service';

export class UnauthorizedInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    public auth: AuthenticationService,
    private keycloakService: KeycloakService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add Authorization header for Keycloak if authenticated
    if (this.auth.currentAuthMethod === AuthMethod.KEYCLOAK) {
      return this.keycloakService.getToken().pipe(
        switchMap(token => {
          if (token) {
            // Clone the request and add the Authorization header
            const authReq = request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            return this.handleRequest(authReq, next);
          }
          return this.handleRequest(request, next);
        }),
        catchError(error => {
          console.error('Error getting Keycloak token', error);
          return this.handleRequest(request, next);
        })
      );
    }

    return this.handleRequest(request, next);
  }

  private handleRequest(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          // do stuff with response if you want
        }
      }),
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            // redirect to the login route based on the current auth method
            this.auth.logout().subscribe(() => this.router.navigate(['login']));
          }
        }
        return throwError(err);
      })
    );
  }
}
