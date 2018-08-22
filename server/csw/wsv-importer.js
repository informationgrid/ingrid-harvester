'use-strict';

let request = require('request-promise'),
    log = require('log4js').getLogger(__filename),
    ElasticSearchUtils = require('./../elastic-utils'),
    settings = require('../elastic.settings.js'),
    mapping = require('../elastic.mapping.js'),
    fs = require('fs'),
    path = require('path'),
    Promise = require('promise'),
    DomParser = require('xmldom').DOMParser;

let GMD = "http://www.isotc211.org/2005/gmd";
let GCO = "http://www.isotc211.org/2005/gco";
let GML = "http://www.opengis.net/gml";
let CSW = "http://www.opengis.net/cat/csw/2.0.2";
let SRV = "http://www.isotc211.org/2005/srv";

let select = require('xpath').useNamespaces({
    "gmd": GMD,
    "gco": GCO,
    "gml": GML,
    "srv": SRV
});

class CswImporter {
    constructor(settings) {
        this.settings = settings;
        this.elastic = new ElasticSearchUtils(settings);
        let method = "GET";
        if (settings.httpMethod) {
            method = settings.httpMethod;
        }

        this.options_csw_search = {
            method: method,
            uri: settings.cswBaseUrl,
            qs: {
                REQUEST: "GetRecords",
                SERVICE: "CSW",
                VERSION: "2.0.2",
                elementSetName: "full",
                resultType: "results",
                outputFormat: "application/xml",
                outputSchema: "http://www.isotc211.org/2005/gmd",
                ElementSetName: "full",
                startPosition: 1,
                maxRecords: 25
            },
            headers: {
                'User-Agent': 'Request-Promise',
                'Content-Type': 'text/xml'
            },
            json: false
        };
        if (settings.proxy) {
            this.options_csw_search.proxy = settings.proxy;
        }
        if (!settings.defaultAttributionLink) {
            this.settings.defaultAttributionLink = `${settings.cswBaseUrl}?REQUEST=GetCapabilities&SERVICE=CSW&VERSION=2.0.2`;
        }
    }

    async run() {
        this.elastic.prepareIndex(mapping, settings)
            .then(() => this.harvest())
            .then(() => this.elastic.sendBulkData(false))
            .then(() => this.elastic.finishIndex())
            .catch(err => log.error("Error during CSW import", err));
    }

    async harvest() {
        let promises = [];
        let filePath = path.join(__dirname, 'getrecords.body.xml');
        log.info(__dirname);
        let xml = fs.readFileSync(filePath, 'utf8');
        let startPosition = this.options_csw_search.qs.startPosition;
        let maxRecords = this.options_csw_search.qs.maxRecords;
        let numMatched = maxRecords;

        while (numMatched > startPosition) {
            let requestBody = new DomParser().parseFromString(xml, "application/xml");

            requestBody.documentElement.setAttribute("startPosition", startPosition);
            requestBody.documentElement.setAttribute("maxRecords", maxRecords);
            this.options_csw_search.body = requestBody.toString();

            let response = await request(this.options_csw_search);
            let harvestTime = new Date(Date.now());
            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(CSW, "SearchResults")[0];
            let numReturned = resultsNode.getAttribute("numberOfRecordsReturned");
            numMatched = resultsNode.getAttribute("numberOfRecordsMatched");

            log.debug(`Received ${numReturned} records from ${this.settings.cswBaseUrl}`);

            promises.push(this.extractRecords(response, harvestTime));

            startPosition += maxRecords;
        }
        await Promise.all(promises)
            .catch(err => log.error('Error extracting records from CSW reply', err));
    }

    async extractRecords(getRecordsResponse, harvestTime) {
        let promises = [];
        let xml = new DomParser().parseFromString(getRecordsResponse, "application/xml");
        let records = xml.getElementsByTagNameNS(GMD, "MD_Metadata");
        let ids = []
        for (let i=0; i<records.length; i++)  {
            ids.push(this.getCharacterStringContent(records[i], "fileIdentifier"));
        }
        let issued = this.elastic.getIssuedDates(ids);
        for(let i=0; i<records.length; i++) {
            promises.push(this.indexRecord(records[i], harvestTime, issued[i]));
        }
        await Promise.all(promises)
            .catch(err => log.error('Error indexing CSW record', err));
    }

    async indexRecord(record, harvestTime, issued) {
        let target = {};

        let uuid = this.getCharacterStringContent(record, "fileIdentifier");

        let idInfo = select('./gmd:identificationInfo', record, true);
        let title = this.getCharacterStringContent(idInfo, "title");
        let abstract = this.getCharacterStringContent(idInfo, "abstract");

        log.debug(`Processing record with id '${uuid}' and title '${title}'`);

        target.title = title;
        target.description = abstract;

        let keywords = [];
        select('.//gmd:descriptiveKeywords/*/gmd:keyword/gco:CharacterString', record).forEach(node => {
            keywords.push(node.textContent);
        });
        if (!keywords.includes('opendata')) {
            // Don't index metadata-sets without the `opendata' keyword
            log.info(`Keyword 'opendata' not found. Item will be ignored. ID: '${uuid}', Title: '${title}', Source: '${this.settings.cswBaseUrl}'.`);
            return;
        }

        this.extractContacts(target, record); // creator, publisher, contactPoint
        target.keywords = keywords;
        target.theme = ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary

        let created = select('./gmd:dateStamp/gco:Date|gco:DateTime', record, true).textContent;
        target.issued = created;
        this.extractModifiedDate(target, idInfo);

        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        let freq = select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', idInfo);
        if (freq.length > 0) {
            target.accrualPeriodicity = freq[0].getAttribute('codeListValue');
        }

        let dists = [];
        let srvIdent = select('./srv:SV_ServiceIdentification', idInfo, true);
        if (srvIdent) {
            let format = select('.//srv:serviceType/gco:LocalName', srvIdent, true).textContent;
            let serviceLinks = [];
            select('./srv:containsOperations/*/srv:connectPoint/*/gmd:linkage/gmd:URL', srvIdent).forEach(node => {
                let url = node.textContent;
                if (!serviceLinks.includes(url)) {
                    serviceLinks.push(url);
                }
            });

            serviceLinks.forEach(url => {
                dists.push({
                    format: format,
                    accessURL: url
                });
            });
        }

        select('./gmd:distributionInfo/gmd:MD_Distribution', record).forEach(node => {
            let id = node.getAttribute('id');
            if (!id) id = node.getAttribute('uuid');

            let formats = [];
            let urls = [];

            select('.//gmd:MD_Format/gmd:name/gco:CharacterString', node).forEach(fmt => {
                if (!formats.includes(fmt.textContent)) formats.push(fmt.textContent);
            });
            select('.//gmd:MD_DigitalTransferOptions/gmd:onLine/*/gmd:linkage/gmd:URL', node).forEach(url => {
                if (!urls.includes(url.textContent)) urls.push(url.textContent);
            });

            // Combine formats in a single slash-separated string
            let format = formats.join(',');
            urls.forEach(url => {
                let dist = {};

                // Set id only if there is a single resource
                if (urls.length === 1) dist.id = id;

                dist.format = format;
                dist.accessURL = url;

                dists.push(dist);
            });
        });
        target.distribution = dists;

        let gmdEncoded = encodeURIComponent(GMD);
        let cswLink = `${this.settings.cswBaseUrl}?REQUEST=GetRecordById&SERVICE=CSW&VERSION=2.0.2&ElementSetName=full&outputSchema=${gmdEncoded}&Id=${uuid}`;
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
            subgroups: this.settings.defaultMcloudSubgroup,
            harvested_data: record.toString()
        };
        if (this.settings.defaultAttribution) target.extras.metadata.source.attribution = this.settings.defaultAttribution;

        this.extractLicense(target.extras, idInfo, {uuid: uuid, title: title});
        this.extractTemporal(target.extras, idInfo, {uuid: uuid, title: title});

        if (dists.length === 0) {
            let msg = 'Dataset has no links for download/access.';
            log.warn(`${msg} It will not be displayed in the portal. Id: '${uuid}', title: '${title}', source: '${this.settings.cswBaseUrl}'`);

            target.extras.metadata.isValid = false;
            target.extras.metadata.harvesting_errors.push(msg);
        }
        await this.elastic.addDocToBulk(target, uuid);
    }

    extractContacts(target, record) {
        let found = {};
        // Look up contacts for the dataset first and then the metadata contact
        let queries = [
            './gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty',
            './gmd:contact/gmd:CI_ResponsibleParty'
        ];
        for (let i=0; i<queries.length; i++) {
            let contacts = select('./gmd:identificationInfo/*/gmd:pointOfContact/gmd:CI_ResponsibleParty', record);
            for (let j = 0; j < contacts.length; j++) {
                //let contact = select('./gmd:contact/gmd:CI_ResponsibleParty', record, true);
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
                let url = select('./gmd:contactInfo/*/gmd:onlineResource/*/gmd:linkage/gmd:URL', contact, true);

                if (!found.creator && (role === 'originator' || role === 'author')) {
                    let infos = {};
                    if (name) infos.name = name.textContent;
                    if (email) infos.mbox = email.textContent;

                    target.creator = infos;
                    found.creator = true;
                } else if (!found.publisher && role === 'publisher') {
                    let infos = {};

                    if (name) infos.name = name.textContent;
                    if (url) infos.homepage = [url.textContent];
                    if (org) infos.organization = [org.textContent];

                    target.publisher = infos;
                    found.publisher = true;
                } else if (!found.other) {
                    let infos = {};

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
                    if (url) infos.hasURL = url.textContent;

                    target.contactPoint = infos;
                    found.other = true;
                }
            }
        }
    }

    extractModifiedDate(target, idInfo) {
        let dt = select('./*/gmd:citation/*/gmd:date/*[./gmd:dateType/gmd:CI_DateTypeCode/@codeListValue="revision"]/gmd:date/gco:Date|gco:DateTime', idInfo);
        // Multiple dates may be defined (creation, publication, revision).
        // Just use the first found revision date
        if (dt.length > 0) target.modified = dt[0].textContent;
    }

    extractLicense(extras, idInfo, args) {
        let license = this.getLicense(idInfo);
        if (license) {
            extras.license_title = license.text;
            if (license.id) extras.license_id = license.id;
            if (license.url) extras.license_url = license.url;
        }
        if (!license || !license.id) {
            let msg = 'No license detected for dataset.';
            log.warn(`${msg} It will not be displayed in the portal. ${this.getErrorSuffix(args.uuid, args.title)}`);

            extras.metadata.isValid = false;
            extras.metadata.harvesting_errors.push(msg);
        }
    }

    getLicense(idInfo) {
        // Use the first resourceConstraints element with MD_RestrictionCode=license
        let constraints = select('./*/gmd:resourceConstraints/*[./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="license"]', idInfo)[0];
        if (constraints) {
            let text =  this.getCharacterStringContent(constraints, 'otherConstraints');
            let license = { text: text };
            let match = text.match(/"name"\s*:\s*"([^"]+)"/);
            if (match) {
                license.id = match[1];
            }
            match = text.match(/"url"\s*:\s*"([^"]+)"/);
            if (match) {
                license.url = match[1];
            }
            return license;
        }
    }

    extractTemporal(extras, idInfo, args) {
        let suffix = this.getErrorSuffix(args.uuid, args.title);
        let nodes = select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimeInstant/gml:timePosition', idInfo);
        let times = nodes.map(node => node.textContent);
        if (times.length == 1) {
            extras.temporal = times[0];
        } else if (times.length > 1) {
            log.warn(`Multiple time instants defined: [${times.join(", ")}]. ${suffix}`);
            extras.temporal = times;
        }

        nodes = select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimePeriod', idInfo);
        if (nodes.length == 1) {
        } else if (nodes.length > 1) {
            let begin = select('./gml:beginPosition', nodes[0], true);
            let end = select('./gml:endPosition', nodes[0], true);
            if (!begin) {
                begin = select('./gml:begin/*/gml:timePosition', nodes[0], true);
            }
            if (!end) {
                end = select('./gml:end/*/gml:timePosition', nodes[0], true);
            }
            try {
                begin = begin.textContent;
                end = end.textContent;
                extras.temporal_begin = begin;
                extras.temporal_end = end;
            } catch (e) {
                log.error(`Cannot extract time range. ${suffix}`);
            }
            log.warn(`Multiple time extents defined. Using only the first one. ${suffix}`);
        }
    }

    getCharacterStringContent(element, cname) {
        if (cname) {
            let node = select(`.//gmd:${cname}/gco:CharacterString`, element, true);
            return node.textContent;
        } else {
            let node = select('./gco:CharacterString', element, true);
            return node.textContent;
        }
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.cswBaseUrl}'.`;
    }
}

module.exports = CswImporter;
