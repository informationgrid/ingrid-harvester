import {ElasticSearchUtils} from "../utils/elastic-utils";
import {elasticsearchMapping} from "../elastic.mapping";
import {elasticsearchSettings} from "../elastic.settings";
import {UrlUtils} from "../utils/url-utils";
import {Utils} from "../utils/common-utils";
import {IndexDocument} from "../model/index-document";
import {CswMapper} from "./csw-mapper";

let request = require('request-promise'),
    log = require('log4js').getLogger(__filename),
    DomParser = require('xmldom').DOMParser;


export class CswUtils {
    private settings: any;
    private elastic: ElasticSearchUtils;
    private options_csw_search: any;
    private summary: any;

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
        if (settings.printSummary) {
            this.summary = {
                numMatched: 0,
                opendata: 0,
                missingLinks: 0,
                missingLicense: 0,
                ok: 0
            };
        }
    }

    async run() {
        if (this.settings.dryRun) {
            log.debug('Dry run option enabled. Skipping index creation.');
            await this.harvest();
            log.debug('Skipping finalisation of index for dry run.');
        } else {
            this.elastic.prepareIndex(elasticsearchMapping, elasticsearchSettings)
                .then(() => this.harvest())
                .then(() => this.elastic.sendBulkData(false))
                .then(() => this.elastic.finishIndex())
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

        if (this.settings.printSummary) {
            log.info(`Number of matched records: ${this.summary.numMatched}`);
            log.info(`Number of records with 'opendata' keyword: ${this.summary.opendata}`);
            log.info(`Number of records with missing links: ${this.summary.missingLinks}`);
            log.info(`Number of records license: ${this.summary.missingLicense}`);
            log.info(`Number of records imported without problems: ${this.summary.ok}`);
        }
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
            promises.push(
                //this.indexRecord(records[i], harvestTime, issued[i])
                IndexDocument.create(new CswMapper(this.settings, records[i], harvestTime, issued[i]))
            );
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing CSW record', err));
    }

    async indexRecord(record, harvestTime, issued) {
        let target: any = {};

        let uuid = CswMapper.getCharacterStringContent(record, 'fileIdentifier');


        log.debug(`Processing record with id '${uuid}' and title '${title}'`);


        await this.extractContacts(target, record); // creator, publisher, contactPoint
        target.theme = ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary

        this.extractAccessRights(target, idInfo);

        let cswLink = this.settings.getRecordsUrlFor(uuid);
        let existingExtras = target.extras;
        target.extras = {
            metadata: {
                harvested: harvestTime,
                issued: issued,
                modified: new Date(Date.now()),
                source: {
                    raw_data_source: cswLink,
                    portal_link: this.settings.defaultAttributionLink
                },
                harvesting_errors: []
            },
            subgroups: subgroups,
            harvested_data: record.toString()
        };
        if (existingExtras.creators) target.extras.creators = existingExtras.creators;


        if (this.settings.defaultAttribution) target.extras.metadata.source.attribution = this.settings.defaultAttribution;

        await this.extractLicense(target.extras, idInfo, {uuid: uuid, title: title});
        this.extractTemporal(target.extras, idInfo, {uuid: uuid, title: title});

        // Sanity checks
        if (!abstract) {
            let msg = 'Dataset doesn\'t have an abstract.';
            log.warn(`${msg} It will not be displayed in the portal. Id: '${uuid}', title: '${title}', source: '${this.settings.getRecordsUrl}'`);

            target.extras.metadata.isValid = false;
            target.extras.metadata.harvesting_errors.push(msg);
        }

        if (dists.length === 0) {
            let msg = 'Dataset has no links for download/access.';
            if (this.settings.printSummary) this.summary.missingLinks++;
            log.warn(`${msg} It will not be displayed in the portal. Id: '${uuid}', title: '${title}', source: '${this.settings.getRecordsUrl}'`);

            target.extras.metadata.isValid = false;
            target.extras.metadata.harvesting_errors.push(msg);
        }

        Utils.postProcess(target);

        if (target.extras.metadata.isValid !== false && dists.length > 0 && this.settings.printSummary) {
            this.summary.ok++;
        }

        await this.elastic.addDocToBulk(target, uuid);
    }

    async extractContacts(target, record) {
        target.extras = {
            creators: []
        };
        let creators = [];
        let publishers = [];
        let others = [];
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i=0; i<queries.length; i++) {
            let contacts = select('./gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty', record);
            for (let j = 0; j < contacts.length; j++) {
                let contact = contacts[j];
                let role = select('./gmd:role/gmd:CI_RoleCode/@codeListValue', contact, true).textContent;

                let name = select('./gmd:individualName/gco:CharacterString', contact, true);
                let org = select('./gmd:organisationName/gco:CharacterString', contact, true);
                let delPt = select('./gmd:contactInfo/*/gmd:address/*/gmd:deliveryPoint', contact);
                let region = select('./gmd:contactInfo/*/gmd:address/*/gmd:administrativeArea/gco:CharacterString', contact, true);
                let country = select('./gmd:contactInfo/*/gmd:address/*/gmd:country/gco:CharacterString', contact, true);
                let postCode = select('./gmd:contactInfo/*/gmd:address/*/gmd:postalCode/gco:CharacterString', contact, true);
                let email = select('./gmd:contactInfo/*/gmd:address/*/gmd:electronicMailAddress/gco:CharacterString', contact, true);
                let phone = select('./gmd:contactInfo/*/gmd:phone/*/gmd:voice/gco:CharacterString', contact, true);
                let urlNode = select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);
                let url = urlNode ? await UrlUtils.urlWithProtocolFor(urlNode.textContent) : null;


                if (role === 'originator' || role === 'author') {
                    let infos: any = {};
                    if (name) infos.name = name.textContent;
                    if (email) infos.mbox = email.textContent;

                    creators.push(infos);

                    /*
                     * foaf:Person and foaf:Organization are disjoint classes.
                     * Also there are no URL fields for organizations. Use the
                     * extras section to store this information temporarily.
                     */
                    let c: any = {};
                    if (name) c.fullName = name.textContent;
                    if (org) c.organisationName = org.textContent;
                    if (url) c.homepage = url;

                    target.extras.creators.push(c);
                } else if (role === 'publisher') {
                    let infos: any = {};

                    if (name) infos.name = name.textContent;
                    if (url) infos.homepage = url;
                    if (org) infos.organization = org.textContent;

                    publishers.push(infos);
                } else {
                    let infos: any = {};

                    if (contact.getAttribute('uuid')) {
                        infos.hasUID = contact.getAttribute('uuid');
                    }

                    if (name) infos.fn = name.textContent;
                    if (org) infos['organization-name'] = org.textContent;

                    let line1 = delPt.map(n => this.getCharacterStringContent(n));
                    line1 = line1.join(', ');
                    if (line1) infos['street-address'] = line1;

                    if (region) infos.region = region.textContent;
                    if (country) infos['country-name'] = country.textContent;
                    if (postCode) infos['postal-code'] = postCode.textContent;
                    if (email) infos.hasEmail = email.textContent;
                    if (phone) infos.hasTelephone = phone.textContent;
                    if (url) infos.hasURL = url;

                    others.push(infos);
                }
            }
        }
        if (creators.length > 0) target.creator = creators;
        if (publishers.length > 0) target.publisher = publishers;
        //if (others.length > 0) target.contactPoint = others;
        if (others.length > 0) target.contactPoint = others[0]; // TODO index all contacts
    }


    extractTemporal(extras, idInfo, args) {

    }

}
