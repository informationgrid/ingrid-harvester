import {ElasticSearchUtils} from "../utils/elastic-utils";
import {elasticsearchMapping} from "../elastic.mapping";
import {elasticsearchSettings} from "../elastic.settings";
import {IndexDocument} from "../model/index-document";
import {CswMapper} from "./csw-mapper";
import {Summary} from "../model/summary";
import {getLogger} from "log4js";
import {RequestDelegate} from "../utils/http-request-utils";

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    DomParser = require('xmldom').DOMParser;


export class CswUtils {
    private readonly settings: any;
    elastic: ElasticSearchUtils;
    private readonly requestDelegate: RequestDelegate;
    private summary: Summary = {
        appErrors: [],
        numDocs: 0,
        numErrors: 0,
        numMatched: 0,
        opendata: 0,
        missingLinks: 0,
        missingLicense: 0,
        ok: 0,
        print: () => {
            logSummary.info(`---------------------------------------------------------`);
            logSummary.info(`Summary of: ${this.settings.importer}`);
            logSummary.info(`---------------------------------------------------------`);
            logSummary.info(`Number of records: ${this.summary.numDocs}`);
            logSummary.info(`Number of errors: ${this.summary.numErrors}`);
            logSummary.info(`Number of records with 'opendata' keyword: ${this.summary.opendata}`);
            logSummary.info(`Number of records with missing links: ${this.summary.missingLinks}`);
            logSummary.info(`Number of records with missing license: ${this.summary.missingLicense}`);
            logSummary.info(`Number of records imported without problems: ${this.summary.ok}`);
            logSummary.info(`App-Errors: ${this.summary.appErrors.length}`);
            if (this.summary.appErrors.length > 0) {
                logSummary.info(`\t${this.summary.appErrors.map( e => e + '\n\t')}`);
            }
        }
    };

    constructor(settings, requestDelegate: RequestDelegate) {
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);
        this.requestDelegate = requestDelegate;
    }

    async run(): Promise<Summary> {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
            return this.summary;
        } else {
            return this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings)
                .then(() => this.harvest())
                .then(() => this.elastic.sendBulkData(false))
                .then(() => this.elastic.finishIndex())
                .then(() => this.summary)
                .catch(err => log.error('Error during CSW import', err));
        }
    }

    async harvest() {
        let promises = [];

        let numMatched = 0;
        while (true) {
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(CswMapper.CSW, 'SearchResults')[0];
            if (resultsNode) {
                let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
                numMatched = resultsNode.getAttribute('numberOfRecordsMatched');

                log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);

                promises.push(this.extractRecords(response, harvestTime));
            } else {
                log.error(`Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nServer response: ${responseDom.toString()}.`);
            }
            this.requestDelegate.incrementStartRecordIndex();
            /*
              * startRecord was already incremented in the last step, so we can
              * directly use it to check if we need to continue.
              *
              * If there is a problem with the first request, then numMatched is
              * still 0. This will result in no records being harvested. If this
              * behaviour is not desired then the following check should be
              * updated. The easiest solution would be to set numMatched to
              * maxRecords * numRetries
              */
            if (numMatched < this.requestDelegate.getStartRecordIndex()) break;
        }
        await Promise.all(promises)
            .catch(err => log.error('Error extracting records from CSW reply', err));

    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, 'application/xml');
        let records = xml.getElementsByTagNameNS(CswMapper.GMD, 'MD_Metadata');
        let ids = [];
        for (let i=0; i<records.length; i++)  {
            ids.push(CswMapper.getCharacterStringContent(records[i], 'fileIdentifier'));
        }

        let now = new Date(Date.now());
        let issued;
        if (this.settings.dryRun) {
            issued = ids.map(id => now);
        } else {
            issued = this.elastic.getIssuedDates(ids);
        }
        for(let i=0; i<records.length; i++) {
            this.summary.numDocs++;

            const uuid = CswMapper.getCharacterStringContent(records[i], 'fileIdentifier');
            let mapper = this.getMapper(this.settings, records[i], harvestTime, issued[i], this.summary);
            let doc: any = await IndexDocument.create(mapper).catch( e => {
                log.error('Error creating index document', e);
                this.summary.appErrors.push(e.toString());
                mapper.skipped = true;
            });
            if (!mapper.shouldBeSkipped()) {

                if (doc.extras.metadata.isValid && doc.distribution.length > 0) {
                    this.summary.ok++;
                }
                promises.push(
                    this.importDataset(doc, uuid)
                );
            }
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing CSW record', err));
    }

    getMapper(settings, record, harvestTime, issuedTime, summary): CswMapper {
        return new CswMapper(settings, record, harvestTime, issuedTime, summary);
    }

    async importDataset(doc: any, uuid: string) {
        if (!this.settings.dryRun) {
            return this.elastic.addDocToBulk(doc, uuid);
        }
    }

}
