import {ElasticSettings} from '../../utils/elastic.setting';
import {ImporterSettings} from '../../importer.settings';

export type ExcelSettings = {
    filePath: string
} & ElasticSettings & ImporterSettings;
