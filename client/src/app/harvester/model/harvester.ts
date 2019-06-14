import {HarvesterSummary} from './HarvesterSummary';
import {ExcelSettings} from '../../../../../server/importer/excel/excel.importer';
import {CkanSettings} from '../../../../../server/importer/ckan/ckan.importer';
import {CswSettings} from '../../../../../server/importer/csw/csw.importer';

export type Harvester = ExcelSettings | CkanSettings | CswSettings;

/*export class Harvester {
  id: string;
  name: string;
  description: string;
  type: 'EXCEL' | 'CKAN' | 'CSW';
  summary: HarvesterSummary;
}*/
