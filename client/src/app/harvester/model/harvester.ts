import {HarvesterSummary} from "./HarvesterSummary";

export class Harvester {
  id: string;
  name: string;
  description: string;
  type: 'EXCEL' | 'CKAN' | 'CSW';
  summary: HarvesterSummary;
}
