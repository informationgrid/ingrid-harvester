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

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DatabaseConfiguration, ElasticsearchConfiguration, GeneralSettings } from '@shared/general-config.settings';
import { MappingItem } from '@shared/mapping.model';
import { Observable } from 'rxjs';
import { Catalog } from '../../../../server/app/model/dcatApPlu.model';

export interface MappingDistribution {
  name: string;
  items: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private http: HttpClient) {
  }

  fetch(): Observable<GeneralSettings> {
    return this.http.get<any>('rest/api/config/general');
  }

  getProfileName(): Observable<string> {
    return this.http.get('rest/api/config/profile', { responseType: 'text' });
  }

  getCatalogs(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>('rest/api/config/catalogs');
  }

  getCatalogSizes(): Observable<any[]> {
    return this.http.get<any[]>('rest/api/config/catalogsizes');
  }

  addOrEditCatalog(catalog: Catalog) {
    return this.http.post<Catalog>('rest/api/config/catalogs', catalog);
  }

  enableCatalog(catalog: Catalog, enable: boolean) {
    const options = { params: new HttpParams()
      .set('enable', enable)
    };
    return this.http.put<Catalog>(`rest/api/config/catalogs/${catalog.identifier}`, null, options);
  }

  removeCatalog(catalog: Catalog, target: string) {
    const options = { params: new HttpParams() };
    if (target) {
      options.params = options.params.set('target', target);
    }
    return this.http.delete(`rest/api/config/catalogs/${catalog.identifier}`, options);
  }

  getMapping(): Observable<MappingDistribution[]> {
    return this.http.get<MappingDistribution[]>('rest/api/config/mapping/distribution');
  }

  getMappingFileContent(): Observable<any> {
    return this.http.get<any>('rest/api/config/mapping/filecontent');
  }

  addMapping(mapping: MappingItem) {
    return this.http.post<any>('rest/api/config/mapping/distribution', mapping);
  }

  uploadMappings(file: File): Observable<void> {
    return this.http.post<void>('rest/api/config/mapping/filecontent ', file);
  }

  removeMapping(mapping: MappingItem) {
    const httpParams = new HttpParams()
      .set('source', mapping.source)
      .set('target', mapping.target);

    const options = {params: httpParams};
    return this.http.delete('rest/api/config/mapping/distribution', options);
  }

  checkDbConnection(data: Partial<DatabaseConfiguration>): Observable<boolean> {
    return this.http.post<boolean>('rest/api/config/dbcheck', data);
  }

  checkEsConnection(data: Partial<ElasticsearchConfiguration>): Observable<boolean> {
    return this.http.post<boolean>('rest/api/config/escheck', data);
  }

  save(data: GeneralSettings): Observable<void> {
    return this.http.post<void>('rest/api/config/general', data);
  }

  uploadGeneralConfig(file: File): Observable<void> {
    return this.http.post<void>('rest/api/config/general', file);
  }

  /**
   * Download a file.
   * @param data - Array Buffer data
   */
  static downLoadFile(fileName: string, data: any) {
    const blob = new Blob([data], {type: 'application/octet-stream'});
    const url = window.URL.createObjectURL(blob);

    // create a temporary link to download data with a given file name
    const linkElement = document.createElement('a');
    document.body.appendChild(linkElement);
    linkElement.style.display = 'none';
    linkElement.href = url;
    linkElement.download = fileName;

    // do not actually download file during test
    // @ts-ignore
    if (window.Cypress) {
      return;
    }

    linkElement.click();
    window.URL.revokeObjectURL(url);
    linkElement.remove();
  }
}
