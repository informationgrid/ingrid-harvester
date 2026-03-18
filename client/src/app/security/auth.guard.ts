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

import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthenticationService} from './authentication.service';
import {map} from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthenticationService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map(isAuthenticated => {
      if (!isAuthenticated) {
        router.navigate(['/login']);
        return false;
      }

      const requiredRoles = route.data['roles'] as Array<string>;
      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      const hasRole = requiredRoles.some(role => authService.hasRole(role));
      if (!hasRole) {
        // If user is authenticated but doesn't have the required role,
        // we might want to redirect to a 'forbidden' page or dashboard.
        // For now, let's redirect to dashboard.
        router.navigate(['/dashboard']);
        return false;
      }

      return true;
    })
  );
};
