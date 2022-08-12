

function optional(nodeName: string, variable: any, mapper?: Function) {
    if (!variable) {
        return '';
    }
    if (Array.isArray(variable)) {
        if (mapper) {
            return variable.map(v => mapper(variable)).join(' ');
        }
        else {
            return variable.map(v => `<${nodeName}>${v}</${nodeName}>`).join(' ');
        }
    }
    else {
        return `<${nodeName}>${variable}</${nodeName}>`;
    }
}

interface Agent {
    name: string,
    type?: string
}

interface Catalog {
    description: string,
    homepage?: string,
    issued?: string,
    language?: string,
    modified?: string,
    publisher: Agent,
    records?: Record[],
    themeTaxonomy?: string,
    title: string
}

interface Contact {
    address: string,
    country: string,
    email: string,
    locality: string,
    orgName: string,
    phone: string,
    postalCode: string
}

interface Distribution {
    accessUrl: string, description?: string, downloadURL?: string, format?: string, issued?: string, modified?: string, period?: { start?: string, end?: string }, pluDoctype?: string, title?: string
}

interface ProcessStep {
    distributions?: any,
    identifier?: string,
    period?: { start?: string, end?: string },
    type: string
}

interface Record {
    issued?: string,
    modified?: string,
    primaryTopic: string,
    title: string
}
    
interface DcatApPlu {
    catalog: Catalog, 
    contactPoint: Contact, 
    contributors?: Agent[],
    descriptions: string[], 
    distributions?: Distribution[],
    geographicName?: string,
    identifier: string,
    issued?: Date,
    lang,
    locationXml: string,
    maintainers?: Agent[],
    modified: Date,
    namespaces: object,
    planState: string,
    pluPlanType?: string,
    pluPlanTypeFine?: string,
    pluProcedureState: string,
    pluProcedureType?: string,
    pluProcessSteps?: ProcessStep[],
    procedureStartDate: string,
    publisher: Agent,
    relation: string,
    title: string
}

export class DcatApPluFactory {

    static createXml({ catalog, contactPoint, contributors, descriptions, distributions, geographicName, identifier, issued, lang, locationXml, maintainers, modified, namespaces, planState, pluPlanType, pluPlanTypeFine, pluProcedureState, pluProcedureType, pluProcessSteps, procedureStartDate, publisher, relation, title }: DcatApPlu): string {
        return `<?xml version="1.0"?>
        <rdf:RDF ${Object.entries(namespaces).map(([ns, uri]) => `${ns}:xmlns="${uri}"`).join(' ')}>
            <dcat:Catalog>
                <dcterms:description>${catalog.description}</dcterms:description>
                <dcterms:title>${catalog.title}</dcterms:title>
                ${DcatApPluFactory.xmlFoafAgent('dcterms:publisher', catalog.publisher)}
                ${optional('dcat:themeTaxonomy', catalog.themeTaxonomy)}
                ${optional('dcterms:issued', catalog.issued)}
                ${optional('dcterms:language', catalog.language)}
                ${optional('dcterms:modified', catalog.modified)}
                ${optional('foaf:homepage', catalog.homepage)}
                ${optional('', catalog.records, DcatApPluFactory.xmlRecord)}
            </dcat:Catalog>
            <dcat:Dataset rdf:about="https://some.tld/features/${identifier}">
                ${DcatApPluFactory.xmlContact(contactPoint)}
                ${descriptions.map(description => `<dcterms:description xml:lang="${lang}">${description}</dcterms:description>`).join(' ')}
                <dcterms:identifier>${identifier}</dcterms:identifier>
                <dcterms:title xml:lang="${lang}">${title}</dcterms:title>
                <plu:PlanState>${planState}</plu:PlanState>
                <plu:pluProcedureState rdf:resource="${pluProcedureState}" />
                <plu:procedureStartDate rdf:resource="${procedureStartDate}" />
                <dcterms:spatial>
                    <dcat:Location>
                        <dcat:bbox>${'/.../gml:boundedBy/...'}</dcat:bbox>
                        <locn:geometry>${locationXml}</locn:geometry>
                        <dcat:centroid>{leer oder berechnen?}</dcat:centroid>
                        <locn:geographicName>${geographicName}</locn:geographicName>
                    </dcat:Location>
                </dcterms:spatial>
                ${DcatApPluFactory.xmlFoafAgent('dcterms:publisher', publisher)}
                ${maintainers ? maintainers.map(maintainer => DcatApPluFactory.xmlFoafAgent('dcatde:maintainer', maintainer)).join(' ') : ''}
                ${contributors ? contributors.map(contributor => DcatApPluFactory.xmlFoafAgent('dctermscontributor', contributor)).join(' ') : ''}
                ${distributions ? distributions.map(distribution => DcatApPluFactory.xmlDistribution(distribution)) : ''}
                ${optional('dcterms:issued', issued)}
                ${optional('dcterms:modified', modified)}
                ${optional('dcterms:relation', relation)}
                ${pluPlanType ? `<plu:pluPlanType rdf:resource="${pluPlanType}" />` : ''}
                ${pluPlanTypeFine ? `<plu:pluPlanTypeFine rdf:resource="${pluPlanTypeFine}" />` : ''}
                ${pluProcedureType ? `<plu:pluProcedureType rdf:resource="${pluProcedureType}" />` : ''}
                ${pluProcessSteps ? pluProcessSteps.map(processStep => DcatApPluFactory.xmlProcessStep(processStep)).join(' ') : ''}
            </dcat:Dataset>
        </rdf:RDF>`;
    }

    private static xmlDistribution ({ accessUrl: accessURL, description, downloadURL, format, issued, modified, period, pluDoctype, title } : Distribution): string {
        return `<dcat:Distribution>
            <dcat:accessURL>${accessURL}</dcat:accessURL>
            ${optional('dcterms:description', description)}
            ${optional('dcat:downloadURL', downloadURL)}
            ${optional('dcterms:format', format)}
            ${optional('dcterms:issued', issued)}
            ${optional('dcterms:modified', modified)}
            ${optional('', period, DcatApPluFactory.xmlPeriodOfTime)}
            ${optional('plu:pluDoctype', pluDoctype)}
            ${optional('dcterms:title', title)}
        </dcat:Distribution>`;
    }

    private static xmlFoafAgent(parent: string, { name, type }: Agent): string {
        return `<${parent}><foaf:agent>
            <foaf:name>${name}</foaf:name>
            ${optional('dcterms:type', type)}
        </foaf:agent></${parent}>`;
    }

    private static xmlPeriodOfTime({ start, end }: {start?: string, end?: string }): string {
        return `<dcterms:temporal>
            <dcterms:PeriodOfTime>
                ${optional('dcat:startDate', start)}
                ${optional('dcat:endDate', end)}
            </dcterms:PeriodOfTime>
        </dcterms:temporal>`;
    }

    private static xmlProcessStep({ distributions, identifier, period, type }: ProcessStep): string {
        return `<plu:PluProcessStep>
            <plu:ProcessStepType>${type}</plu:ProcessStepType>
            ${optional('dcterms:identifier', identifier)}
            ${distributions ? distributions.map(distribution => DcatApPluFactory.xmlDistribution(distribution)) : ''}
            ${optional('', period, DcatApPluFactory.xmlPeriodOfTime)}
        </plu:PluProcessStep>`;
    }

    private static xmlRecord({ issued, modified, primaryTopic, title}: Record) {
        return `<dcat:record>
            <dcat:CatalogRecord>
                <dcterms:title>${title}</dcterms:title>
                <foaf:primaryTopic>${primaryTopic}</foaf:primaryTopic>
                ${optional('dcterms:issued', issued)}
                ${optional('dcterms:modified', modified)}
            </dcat:CatalogRecord>
        </dcat:record>`;
    }

    private static xmlContact({ address, country, email, locality, orgName, phone, postalCode }: Contact): string {
        return `<dcat:contactPoint>
            <vcard:Organization>
                <vcard:fn>${orgName}</vcard:fn>
                <vcard:hasPostalCode>${postalCode}</vcard:hasPostalCode>
                <vcard:hasStreetAddress>${address}</vcard:hasStreetAddress>
                <vcard:hasLocality>${locality}</vcard:hasLocality>
                <vcard:hasCountryName>${country}</vcard:hasCountryName>
                <vcard:hasEmail rdf:resource="${email}"/>
                <vcard:hasTelephoneNumber>${phone}</vcard:hasTelephoneNumber>
            </vcard:Organization>
        </dcat:contactPoint>`;
    }
}