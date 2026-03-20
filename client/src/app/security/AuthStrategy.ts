import {Observable} from "rxjs";

export interface AuthStrategy {
  login(username?: string, password?: string): Observable<any>;
  logout(): Observable<any>;
}

export enum AuthMethod {
  LOCAL = 'local',
  KEYCLOAK = 'keycloak'
}

export type Role = 'admin' | 'editor' | 'viewer';
