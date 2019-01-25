import {ElasticSearchUtils} from "../utils/elastic-utils";
import {elasticsearchMapping} from "../elastic.mapping";
import {elasticsearchSettings} from "../elastic.settings";
import {IndexDocument} from "../model/index-document";
import {CswMapper} from "./csw-mapper";
import {Summary} from "../model/summary";
import {getLogger} from "log4js";

let request = require('request-promise'),
    log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    DomParser = require('xmldom').DOMParser;


export class CswUtils {
    private settings: any;
    elastic: ElasticSearchUtils;
    private options_csw_search: any;
    private summary: Summary = {
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
            logSummary.info(`Number of matched records: ${this.summary.numMatched}`);
            logSummary.info(`Number of records with 'opendata' keyword: ${this.summary.opendata}`);
            logSummary.info(`Number of records with missing links: ${this.summary.missingLinks}`);
            logSummary.info(`Number of records license: ${this.summary.missingLicense}`);
            logSummary.info(`Number of records imported without problems: ${this.summary.ok}`);
        }
    };

    constructor(settings) {
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);

        this.options_csw_search = settings.options_csw_search;
        if (settings.proxy) {
            this.options_csw_search.proxy = settings.proxy;
        }
        if (!settings.defaultAttributionLink) {
            this.settings.defaultAttributionLink = `${settings.getRecordsUrl}?REQUEST=GetCapabilities&SERVICE=CSW&VERSION=2.0.2`;
        }
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
        let xmlSupplier = this.settings.getGetRecordsPostBody;
        let startPosition = this.options_csw_search.qs.startPosition;
        let maxRecords = this.options_csw_search.qs.maxRecords;
        let numMatched = startPosition + 1;

        while (numMatched > startPosition) {
            if (xmlSupplier) {
                let xml = xmlSupplier();
                let requestBody = new DomParser().parseFromString(xml, 'application/xml');

                requestBody.documentElement.setAttribute('startPosition', startPosition);
                requestBody.documentElement.setAttribute('maxRecords', maxRecords);
                this.options_csw_search.body = requestBody.toString();
                this.options_csw_search.method = 'POST';
            }

            this.options_csw_search.qs.startPosition = startPosition;
            this.options_csw_search.qs.maxRecords = maxRecords;

            let response = await request(this.options_csw_search);
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(CswMapper.CSW, 'SearchResults')[0];
            if (!resultsNode) {
                log.error(`Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nStart position: ${startPosition}, Max Records: ${maxRecords}, Server response: ${responseDom.toString()}.`);
            } else {
                let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
                numMatched = resultsNode.getAttribute('numberOfRecordsMatched');
                if (this.settings.printSummary) this.summary.numMatched = numMatched;

                log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);

                promises.push(this.extractRecords(response, harvestTime));
            }
            startPosition += maxRecords;
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
            let mapper = new CswMapper(this.settings, records[i], harvestTime, issued[i], this.summary);
            let doc = await IndexDocument.create(mapper);
            if (!mapper.shouldBeSkipped()) {
                promises.push(
                    this.importDataset(doc)
                );
            }
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing CSW record', err));
    }

    async importDataset(doc) {
        if (!this.settings.dryRun) {
            return this.elastic.addDocToBulk(doc, doc.id);
        }
    }

}
