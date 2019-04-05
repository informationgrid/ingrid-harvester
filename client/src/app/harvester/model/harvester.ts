import {HarvesterSummary} from "./HarvesterSummary";
import {HarvesterType} from "./HarvesterType";

export class Harvester {
  id: string;
  name: string;
  description: string;
  type: HarvesterType;
  summary: HarvesterSummary;
}
