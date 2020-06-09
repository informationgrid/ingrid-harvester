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
export class ConfigService {

  constructor(private http: HttpClient) {
  }

  fetch(): Observable<GeneralSettings> {
    return this.http.get<any>('rest/api/config/general');
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
