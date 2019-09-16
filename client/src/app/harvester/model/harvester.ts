import {ExcelSettings} from '../../../../../server/app/importer/excel/excel.settings';
import {CkanSettings} from '../../../../../server/app/importer/ckan/ckan.settings';
import {CswSettings} from '../../../../../server/app/importer/csw/csw.settings';

export type Harvester = ExcelSettings | CkanSettings | CswSettings;
