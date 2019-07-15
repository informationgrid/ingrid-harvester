import {ExcelSettings} from '../../../../../server/importer/excel/excel.settings';
import {CkanSettings} from '../../../../../server/importer/ckan/ckan.settings';
import {CswSettings} from '../../../../../server/importer/csw/csw.settings';

export type Harvester = ExcelSettings | CkanSettings | CswSettings;

/*export class Harvester {
  id: string;
  name: string;
  description: string;
  type: 'EXCEL' | 'CKAN' | 'CSW';
  summary: HarvesterSummary;
}*/
