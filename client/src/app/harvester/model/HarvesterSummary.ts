export class HarvesterSummary {
  numberOfDocs: number;
  numberOfErrors: number;
  numberOfWarnings: number;
  lastExecution: Date;
  nextExecution: Date;
  duration?: number;
}
