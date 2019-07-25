import {DefaultElasticsearchSettings, ElasticSearchUtils, ElasticSettings} from "../utils/elastic.utils";
import {elasticsearchMapping} from "../elastic.mapping";
import {elasticsearchSettings} from "../elastic.settings";
import {IndexDocument} from "../model/index.document";
import {CswMapper} from "./csw.mapper";
import {Summary} from "../model/summary";
import {getLogger} from "log4js";
import {CswParameters, RequestDelegate} from "../utils/http-request.utils";
import {OptionsWithUri} from "request-promise";
import {DefaultImporterSettings, ImporterSettings} from "../importer";

let log = require('log4js').getLogger(__filename),
    logSummary = getLogger('summary'),
    logRequest = getLogger('requests'),
    DomParser = require('xmldom').DOMParser;

export type CswSettings = {
    getRecordsUrl: string,
    eitherKeywords: string[],
    httpMethod: "GET" | "POST",
    defaultAttribution?: string,
    defaultAttributionLink?: string,
    recordFilter?: string
} & ElasticSettings & ImporterSettings;

export class CswSummary extends Summary {
    opendata = 0;
    missingLinks = 0;
    missingPublishers = 0;
    missingLicense = 0;
    ok = 0;

    additionalSummary() {
        logSummary.info(`Number of records with at least one mandatory keyword: ${this.opendata}`);
        logSummary.info(`Number of records with missing links: ${this.missingLinks}`);
        logSummary.info(`Number of records with missing license: ${this.missingLicense}`);
        logSummary.info(`Number of records with missing publishers: ${this.missingPublishers}`);
        logSummary.info(`Number of records imported as valid: ${this.ok}`);
    }
}

export class CswImporter {
    private readonly settings: CswSettings;
    elastic: ElasticSearchUtils;
    private readonly requestDelegate: RequestDelegate;

    private readonly summary: CswSummary;

    static defaultSettings: CswSettings = {
        ...DefaultElasticsearchSettings,
        ...DefaultImporterSettings,
        ...{
            getRecordsUrl: '',
            eitherKeywords: [],
            httpMethod: "GET"
        }
    };


    constructor(settings, requestDelegate?: RequestDelegate) {
        // merge default settings with configured ones
        settings = {...CswImporter.defaultSettings, ...settings};

        if (requestDelegate) {
            this.requestDelegate = requestDelegate;
        } else {
            let requestConfig = CswImporter.createRequestConfig(settings);
            this.requestDelegate = new RequestDelegate(requestConfig, CswImporter.createPaging(settings));
        }

        this.settings = settings;

        this.summary = new CswSummary(settings);

        this.elastic = new ElasticSearchUtils(settings, this.summary);
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
                .catch(err => {
                    this.summary.appErrors.push(err);
                    log.error('Error during CSW import', err);
                    return this.summary;
                });
        }
    }

    async harvest() {

        let numMatched = 0;
        while (true) {
            log.debug('Requesting documents ...');
            let response = await this.requestDelegate.doRequest();
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(CswMapper.CSW, 'SearchResults')[0];
            if (resultsNode) {
                let numReturned = resultsNode.getAttribute('numberOfRecordsReturned');
                numMatched = resultsNode.getAttribute('numberOfRecordsMatched');

                log.debug(`Received ${numReturned} records from ${this.settings.getRecordsUrl}`);
                await this.extractRecords(response, harvestTime)
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

    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, 'application/xml');
        let records = xml.getElementsByTagNameNS(CswMapper.GMD, 'MD_Metadata');
        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(CswMapper.getCharacterStringContent(records[i], 'fileIdentifier'));
        }

        let now = new Date(Date.now());
        let issued;
        if (this.settings.dryRun) {
            issued = ids.map(() => now);
        } else {
            issued = await this.elastic.getIssuedDates(ids);
        }
        for (let i = 0; i < records.length; i++) {
            this.summary.numDocs++;

            if (log.isDebugEnabled()) {
                log.debug(`Import document ${i + 1} from ${records.length}`);
            }
            if (logRequest.isDebugEnabled()) {
                logRequest.debug("Record content: ", records[i].toString());
            }

            const uuid = CswMapper.getCharacterStringContent(records[i], 'fileIdentifier');
            let mapper = this.getMapper(this.settings, records[i], harvestTime, issued[i], this.summary);

            let doc: any = await IndexDocument.create(mapper).catch(e => {
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

    static createRequestConfig(settings: CswSettings): OptionsWithUri {
        let requestConfig: OptionsWithUri = {
            method: settings.httpMethod || "GET",
            uri: settings.getRecordsUrl,
            json: false,
            headers: RequestDelegate.cswRequestHeaders(),
            proxy: settings.proxy || null
        };

        if (settings.httpMethod === "POST") {
            requestConfig.body = `<?xml version="1.0" encoding="UTF-8"?>
            <GetRecords xmlns="http://www.opengis.net/cat/csw/2.0.2"
                        xmlns:gmd="http://www.isotc211.org/2005/gmd"
                        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                        xmlns:ogc="http://www.opengis.net/ogc"
                        xsi:schemaLocation="http://www.opengis.net/cat/csw/2.0.2"
            
                        service="CSW"
                        version="2.0.2"
                        resultType="results"
                        outputFormat="application/xml"
                        outputSchema="http://www.isotc211.org/2005/gmd"
                        startPosition="${settings.startPosition}"
                        maxRecords="${settings.maxRecords}">
                <Query typeNames="gmd:MD_Metadata">
                    <ElementSetName typeNames="">full</ElementSetName>
                    ${settings.recordFilter ? `
                    <Constraint version=\"1.1.0\">
                        ${settings.recordFilter}
                    </Constraint>` : ''}
                </Query>
            </GetRecords>`

        } else {
            requestConfig.qs = <CswParameters>{
                request: 'GetRecords',
                SERVICE: 'CSW',
                VERSION: '2.0.2',
                resultType: 'results',
                outputFormat: 'application/xml',
                outputSchema: 'http://www.isotc211.org/2005/gmd',
                typeNames: 'gmd:MD_Metadata',
                CONSTRAINTLANGUAGE: 'FILTER',
                startPosition: settings.startPosition,
                maxRecords: settings.maxRecords,
                CONSTRAINT_LANGUAGE_VERSION: '1.1.0',
                elementSetName: 'full',
                constraint: settings.recordFilter
            };
        }

        return requestConfig;
    }

    static createPaging(settings: CswSettings) {
        return {
            startFieldName: 'startPosition',
            startPosition: settings.startPosition,
            numRecords: settings.maxRecords
        }
    }
}
