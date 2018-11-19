'use-strict';

let request = require('request-promise'),
    log = require('log4js').getLogger(__filename),
    ElasticSearchUtils = require('./../elastic-utils'),
    Utils = require('./../common-utils'),
    UrlUtils = require('./../url-utils'),
    settings = require('../elastic.settings.js'),
    mapping = require('../elastic.mapping.js'),
    Promise = require('promise'),
    DomParser = require('xmldom').DOMParser;

const GMD = "http://www.isotc211.org/2005/gmd";
const GCO = "http://www.isotc211.org/2005/gco";
const GML = "http://www.opengis.net/gml";
const CSW = "http://www.opengis.net/cat/csw/2.0.2";
const SRV = "http://www.isotc211.org/2005/srv";

let select = require('xpath').useNamespaces({
    "gmd": GMD,
    "gco": GCO,
    "gml": GML,
    "srv": SRV
});

class CswUtils {
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
            this.elastic.prepareIndex(mapping, settings)
                .then(() => this.harvest())
                .then(() => this.elastic.sendBulkData(false))
                .then(() => this.elastic.finishIndex())
                .catch(err => log.error("Error during CSW import", err));
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
                let requestBody = new DomParser().parseFromString(xml, "application/xml");

                requestBody.documentElement.setAttribute("startPosition", startPosition);
                requestBody.documentElement.setAttribute("maxRecords", maxRecords);
                this.options_csw_search.body = requestBody.toString();
                this.options_csw_search.method = 'POST';
            }

            this.options_csw_search.qs.startPosition = startPosition;
            this.options_csw_search.qs.maxRecords = maxRecords;

            let response = await request(this.options_csw_search);
            let harvestTime = new Date(Date.now());

            let responseDom = new DomParser().parseFromString(response);
            let resultsNode = responseDom.getElementsByTagNameNS(CSW, "SearchResults")[0];
            if (!resultsNode) {
                log.error(`Error while fetching CSW Records. Will continue to try and fetch next records, if any.\nStart position: ${startPosition}, Max Records: ${maxRecords}, Server response: ${responseDom.toString()}.`);
            } else {
                let numReturned = resultsNode.getAttribute("numberOfRecordsReturned");
                numMatched = resultsNode.getAttribute("numberOfRecordsMatched");
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
        let xml = new DomParser().parseFromString(getRecordsResponse, "application/xml");
        let records = xml.getElementsByTagNameNS(GMD, "MD_Metadata");
        let ids = [];
        for (let i=0; i<records.length; i++)  {
            ids.push(this.getCharacterStringContent(records[i], "fileIdentifier"));
        }

        let now = new Date(Date.now());
        let issued;
        if (this.settings.dryRun) {
            issued = ids.map(id => now);
        } else {
            issued = this.elastic.getIssuedDates(ids);
        }
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
        if (keywords.includes('opendata')) {
            if (this.settings.printSummary) this.summary.opendata++;
        } else {
            // Don't index metadata-sets without the `opendata' keyword
            log.info(`Keyword 'opendata' not found. Item will be ignored. ID: '${uuid}', Title: '${title}', Source: '${this.settings.getRecordsUrl}'.`);
            return;
        }

        await this.extractContacts(target, record); // creator, publisher, contactPoint
        target.keywords = keywords;
        target.theme = ['http://publications.europa.eu/resource/authority/data-theme/TRAN']; // see https://joinup.ec.europa.eu/release/dcat-ap-how-use-mdr-data-themes-vocabulary

        let modified = select('./gmd:dateStamp/gco:Date|./gmd:dateStamp/gco:DateTime', record, true).textContent;
        target.modified = modified;

        // Multiple resourceMaintenance elements are allowed. If present, use the first one
        let freq = select('./*/gmd:resourceMaintenance/*/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode', idInfo);
        if (freq.length > 0) {
            target.accrualPeriodicity = freq[0].getAttribute('codeListValue');
        }

        this.extractAccessRights(target, idInfo);

        let dists = [];
        let urlsFound = [];
        let srvIdent = select('./srv:SV_ServiceIdentification', idInfo, true);
        if (srvIdent) {
            let getCapabilitiesElement = select(
                './srv:containsOperations/srv:SV_OperationMetadata[./srv:operationName/gco:CharacterString[contains(./text(), "GetCapabilities")]]/srv:connectPoint/*/gmd:linkage/gmd:URL',
                srvIdent,
                true);
            let getCapablitiesUrl = getCapabilitiesElement ? getCapabilitiesElement.textContent : null;
            let format = select('.//srv:serviceType/gco:LocalName', srvIdent, true).textContent;
            let serviceLinks = [];
            if (getCapablitiesUrl) {
                let lowercase = getCapablitiesUrl.toLowerCase();
                if (lowercase.match(/\bwms\b/)) format = 'WMS';
                if (lowercase.match(/\bwfs\b/)) format = 'WFS';
                if (lowercase.match(/\bwcs\b/)) format = 'WCS';
                if (lowercase.match(/\bwmts\b/)) format = 'WMTS';
            }
            let urls = select('./srv:containsOperations/*/srv:connectPoint/*/gmd:linkage/gmd:URL', srvIdent);
            for (let i=0; i<urls.length; i++) {
                let node = urls[i];
                let url = await UrlUtils.urlWithProtocolFor(node.textContent);
                if (url && !serviceLinks.includes(url)) {
                    serviceLinks.push(url);
                    urlsFound.push(url);
                }
            }

            serviceLinks.forEach(url => {
                dists.push({
                    format: format,
                    accessURL: url
                });
            });
        }

        let distNodes = select('./gmd:distributionInfo/gmd:MD_Distribution', record);
        for (let i=0; i<distNodes.length; i++) {
            let node = distNodes[i];
            let id = node.getAttribute('id');
            if (!id) id = node.getAttribute('uuid');

            let formats = [];
            let urls = [];

            select('.//gmd:MD_Format/gmd:name/gco:CharacterString', node).forEach(fmt => {
                if (!formats.includes(fmt.textContent)) formats.push(fmt.textContent);
            });
            let nodes = select('.//gmd:MD_DigitalTransferOptions/gmd:onLine/*/gmd:linkage/gmd:URL', node);
            for(let j=0; j<nodes.length; j++) {
                let node = nodes[j];
                let url = node ? await UrlUtils.urlWithProtocolFor(node.textContent) : null;
                if (url && !urls.includes(url)) urls.push(url);
            }

            // Combine formats in a single slash-separated string
            let format = formats.join(',');
            if (!format) format = "Unbekannt";
            // Filter out URLs that have already been found
            urls = urls.filter(item => !urlsFound.includes(item));

            urls.forEach(url => {
                let dist = {};

                // Set id only if there is a single resource
                if (urls.length === 1) dist.id = id;

                dist.format = format;
                dist.accessURL = url;

                dists.push(dist);
            });
        }
        target.distribution = dists;

        let subgroups = [];
        keywords.forEach(k => {
            k = k.trim();
            if (k === 'mcloud_category_roads') subgroups.push('roads');
            if (k === 'mcloud_category_climate') subgroups.push('climate');
            if (k === 'mcloud_category_waters') subgroups.push('waters');
            if (k === 'mcloud_category_railway') subgroups.push('railway');
            if (k === 'mcloud_category_infrastructure') subgroups.push('infrastructure');
            if (k === 'mcloud_category_aviation') subgroups.push('aviation');
        });
        if (subgroups.length === 0) subgroups.push(this.settings.defaultMcloudSubgroup);

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
            let msg = "Dataset doesn't have an abstract.";
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

        Utils.setDisplayContactIn(target);

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
                    let infos = {};
                    if (name) infos.name = name.textContent;
                    if (email) infos.mbox = email.textContent;

                    creators.push(infos);

                    /*
                     * foaf:Person and foaf:Organization are disjoint classes.
                     * Also there are no URL fields for organizations. Use the
                     * extras section to store this information temporarily.
                     */
                    let c = {};
                    if (name) c.fullName = name.textContent;
                    if (org) c.organisationName = org.textContent;
                    if (url) c.homepage = url;

                    target.extras.creators.push(c);
                } else if (role === 'publisher') {
                    let infos = {};

                    if (name) infos.name = name.textContent;
                    if (url) infos.homepage = url;
                    if (org) infos.organization = org.textContent;

                    publishers.push(infos);
                } else {
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

    extractAccessRights(target, idInfo) {
        /*
         * For Open Data, GDI-DE expects access rights to be defined three times:
         * - As text in useLimitation
         * - As text in a useConstraints/otherConstraints combination
         * - As a JSON-snippet in a useConstraints/otherConstraints combination
         *
         * Use limitations can also be defined as separate fields
         * Plus access constraints can be set from the ISO codelist MD_RestrictionCode
         *
         * GeoDCAT-AP of the EU on the other had uses the
         * useLimitation/accessConstraints=otherRestritions/otherConstraints
         * combination and uses the accessRights field to store this information.
         *
         * We use a combination of these strategies:
         * - Use the accessRights field like GeoDCAT-AP but store:
         *    + all the useLimitation items
         *    + all otherConstraints texts for useConstraints/otherConstraints
         *      combinations that are not JSON-snippets.
         */
        // Extract all useLimitation texts
        let limitations = select('./*/gmd:resourceConstraints/*/gmd:useLimitation', idInfo)
            .map(node => this.getCharacterStringContent(node)) // Extract the text
            .filter(text => text) // Filter out falsy items
            .map(text => text.trim());

        // Select 'otherConstraints' elements that have a 'useConstraints' sibling
        let constraints = select('./*/gmd:resourceConstraints/*[./gmd:useConstraints and ./gmd:otherConstraints]/gmd:otherConstraints', idInfo)
            .map(node => this.getCharacterStringContent(node)) // Extract the text
            .filter(text => text) // Filter out null and undefined values
            .map(text => text.trim())
            .filter(text => text && !limitations.includes(text.trim()) && !text.match(/"url"\s*:\s*"([^"]+)"/)); // Keep non-empty (truthy) items that are not defined in useLimitations and are not a JSON-snippet

        // Combine useLimitations and otherConstraints and store in accessRights
        let accessRights = limitations.concat(constraints);
        if (accessRights.length > 0) {
            target.accessRights = accessRights;
        }
    }

    async extractLicense(extras, idInfo, args) {
        let license = await this.getLicense(idInfo);
        if (license) {
            extras.license_title = license.text;
            if (license.id) extras.license_id = license.id;
            if (license.url) extras.license_url = license.url;
        }
        if (!license || !license.id) {
            let msg = 'No license detected for dataset.';
            if (this.settings.printSummary) this.summary.missingLicense++;
            log.warn(`${msg} ${this.getErrorSuffix(args.uuid, args.title)}`);

            extras.license_id = 'Unbekannt';
            extras.metadata.harvesting_errors.push(msg);
        }
    }

    async getLicense(idInfo) {
        let constraints = select('./*/gmd:resourceConstraints/*[./gmd:useConstraints/gmd:MD_RestrictionCode/@codeListValue="license"]', idInfo);
        if (constraints && constraints.length > 0) {
            let license = {};
            for(let j=0; j<constraints.length; j++) {
                let c = constraints[j];
                // Search until id and url are not defined
                let nodes = select('./gmd:otherConstraints', c);
                for (let i = 0; i < nodes.length && (!license.id || !license.url); i++) {
                    let text = this.getCharacterStringContent(nodes[i]);
                    license.text = text;
                    let match = text.match(/"name"\s*:\s*"([^"]+)"/);
                    if (match) {
                        license.id = match[1];
                    } else {
                        delete license.id;
                    }
                    match = text.match(/"url"\s*:\s*"([^"]+)"/);
                    if (match) {
                        license.url = await UrlUtils.urlWithProtocolFor(match[1]);
                    } else {
                        delete license.url;
                    }
                }
            }
            return license;
        }
    }

    extractTemporal(extras, idInfo, args) {
        let suffix = this.getErrorSuffix(args.uuid, args.title);
        let nodes = select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimeInstant/gml:timePosition', idInfo);
        let times = nodes.map(node => node.textContent);
        if (times.length === 1) {
            extras.temporal = times[0];
        } else if (times.length > 1) {
            log.warn(`Multiple time instants defined: [${times.join(", ")}]. ${suffix}`);
            extras.temporal = times;
        }

        nodes = select('./*/gmd:extent/*/gmd:temporalElement/*/gmd:extent//gml:TimePeriod', idInfo);
        if (nodes.length === 1) {
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
            if (node) {
                return node.textContent;
            }
        } else {
            let node = select('./gco:CharacterString', element, true);
            return node.textContent;
        }
    }

    getErrorSuffix(uuid, title) {
        return `Id: '${uuid}', title: '${title}', source: '${this.settings.getRecordsUrl}'.`;
    }

    static get GMD() {
        return GMD;
    }
}

module.exports = CswUtils;
