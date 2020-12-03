import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {GeneralSettings} from '@shared/general-config.settings';
import {MappingItem} from '@shared/mapping.model';

export interface MappingDistribution {
  name: string;
  items: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {

  constructor(private http: HttpClient) {
  }


}
