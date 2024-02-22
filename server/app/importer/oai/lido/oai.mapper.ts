/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2023 wemove digital solutions GmbH
 * ==================================================
 * Licensed under the EUPL, Version 1.2 or - as soon they will be
 * approved by the European Commission - subsequent versions of the
 * EUPL (the "Licence");
 *
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 * ==================================================
 */

/**
 * A mapper for ISO-XML documents harvested over CSW.
 */
import { License } from '@shared/license.model';
import { getLogger } from 'log4js';
import { throwError } from 'rxjs';
import * as xpath from 'xpath';
import { ImporterSettings } from '../../../importer.settings';
import { Agent, Contact, Organization, Person } from '../../../model/agent';
import { DateRange } from '../../../model/dateRange';
import { Distribution } from '../../../model/distribution';
import { Summary } from '../../../model/summary';
import { DcatPeriodicityUtils } from '../../../utils/dcat.periodicity.utils';
import { RequestDelegate, RequestOptions } from '../../../utils/http-request.utils';
import { UrlUtils } from '../../../utils/url.utils';
import { XPathElementSelect } from '../../../utils/xpath.utils';
import { BaseMapper } from '../../base.mapper';
import { oaiXPaths } from '../oai.paths';
import { OaiSettings } from '../oai.settings';
import { Event, Link, Record, Relation, Repository, Resource, Subject } from './lido.model';
import * as MiscUtils from '../../../utils/misc.utils';
import { GeoJsonUtils } from '../../../utils/geojson.utils';

export class OaiMapper extends BaseMapper {
    public getSettings(): ImporterSettings {
        return this.settings;
    }
    public getSummary(): Summary {
        return this.summary;
    }
    _getTitle(): string {
        throw new Error('Method not implemented.');
    }
    _getDescription(): string {
        throw new Error('Method not implemented.');
    }
    _getPublisher(): Promise<Person[] | Organization[]> {
        throw new Error('Method not implemented.');
    }
    _getThemes(): string[] {
        throw new Error('Method not implemented.');
    }
    _getModifiedDate(): Date {
        throw new Error('Method not implemented.');
    }
    _getAccessRights(): string[] {
        throw new Error('Method not implemented.');
    }
    _getDistributions(): Promise<Distribution[]> {
        throw new Error('Method not implemented.');
    }
    _getGeneratedId(): string {
        throw new Error('Method not implemented.');
    }
    _getMetadataSource() {
        throw new Error('Method not implemented.');
    }
    _isRealtime(): boolean {
        throw new Error('Method not implemented.');
    }
    _getSpatial() {
        throw new Error('Method not implemented.');
    }
    _getSpatialText(): string {
        throw new Error('Method not implemented.');
    }
    _getTemporal(): DateRange[] {
        throw new Error('Method not implemented.');
    }
    _getCitation(): string {
        throw new Error('Method not implemented.');
    }
    _getKeywords(): string[] {
        throw new Error('Method not implemented.');
    }
    _getAccrualPeriodicity(): string {
        throw new Error('Method not implemented.');
    }
    _getContactPoint(): Promise<Contact> {
        throw new Error('Method not implemented.');
    }
    _getCreator(): Person | Person[] {
        throw new Error('Method not implemented.');
    }
    _getHarvestedData(): string {
        return this.record.toString();
    }
    _getIssued(): Date {
        throw new Error('Method not implemented.');
    }
    _getMetadataHarvested(): Date {
        throw new Error('Method not implemented.');
    }
    _getSubSections(): any[] {
        throw new Error('Method not implemented.');
    }
    _getGroups(): string[] {
        throw new Error('Method not implemented.');
    }
    _getOriginator(): Agent[] {
        throw new Error('Method not implemented.');
    }
    _getLicense(): Promise<License> {
        throw new Error('Method not implemented.');
    }
    _getUrlCheckRequestConfig(uri: string): RequestOptions {
        throw new Error('Method not implemented.');
    }

    static select = <XPathElementSelect>xpath.useNamespaces(oaiXPaths.lido.prefixMap);

    static text(path: string, parent: Node): string {
        return this.select(path.replace(/\/(?!@)/g, '/lido:'), parent, true)?.textContent;
    }

    static attr(path: string, parent: Node): string {
        return this.select(path.replace(/\/(?!@)/g, '/lido:'), parent, true)?.textContent;
    }

    private log = getLogger();

    private readonly record: any;
    private harvestTime: any;

    protected readonly idInfo; // : SelectedValue;
    private settings: OaiSettings;
    private readonly uuid: string;
    private summary: Summary;

    constructor(settings, record, harvestTime, summary) {
        super();
        this.settings = settings;
        this.record = record;
        this.harvestTime = harvestTime;
        this.summary = summary;

        this.uuid = OaiMapper.select('./lido:lidoRecID', record, true).textContent;

        super.init();
    }

    getEvents(): Event[] {
        let eventNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:eventWrap/lido:eventSet/lido:event', this.record);
        let events: Event[] = eventNodes.map(eventNode => ({
            actor: {
                displayName: OaiMapper.text('./eventActor/displayActorInRole', eventNode),
                id: OaiMapper.text('./eventActor/actorInRole/actor/actorID', eventNode),
                role: {
                    id: OaiMapper.text('./eventActor/actorInRole/roleActor/conceptID', eventNode),
                    term: OaiMapper.text('./eventActor/actorInRole/roleActor/conceptID', eventNode)
                },
                name: OaiMapper.text('./eventActor/actorInRole/actor/nameActorSet/appellationValue', eventNode)
            },
            description: {
                noteId: OaiMapper.text('./eventDescriptionSet/descriptiveNoteID', eventNode),
                source: OaiMapper.text('./eventDescriptionSet/descriptiveNoteID/@source', eventNode)
            },
            displayDate: OaiMapper.text('./eventDate/displayDate', eventNode),
            period: {
                gte: new Date(OaiMapper.text('./eventDate/date/earliestDate', eventNode)),
                lte: new Date(OaiMapper.text('./eventDate/date/latestDate', eventNode))
            },
            place: {
                displayPlace: OaiMapper.text('./eventPlace/displayPlace', eventNode),
                id: OaiMapper.text('./eventPlace/place/placeID', eventNode),
                name: OaiMapper.text('./eventPlace/place/namePlaceSet/appellationValue', eventNode)
            },
            type: {
                id: OaiMapper.text('./eventType/conceptID', eventNode),
                term: OaiMapper.text('./eventType/term', eventNode)
            }
        }));
        return events;
    }

    getRelations(): Relation[] {
        let relationNodes = OaiMapper.select('./lido:lido/lido:descriptiveMetadata/lido:objectRelationWrap/lido:relatedWorksWrap/lido:relatedWorkSet', this.record);
        let relations: Relation[] = relationNodes.map(relationNode => ({
            description: OaiMapper.text('./relatedWork/object/objectID', relationNode),
            id: OaiMapper.text('./relatedWork/object/objectNote', relationNode),
            relationType: {
                id: OaiMapper.text('./relatedWorkRelType/conceptID', relationNode),
                term: OaiMapper.text('./relatedWorkRelType/term', relationNode)
            },
            type: OaiMapper.text('./relatedWork/object/objectNote/@type', relationNode)
        }));
        return relations;
    }

    /**
     * Subject Sets
     * 
     * Wrapper for display and index elements for one set of subject information.
     * If an object / work has multiple parts or otherwise has separate, multiple subjects, repeat this element and use 
     * Extent Subject in the Subject element. This element may also be repeated to distinguish between subjects that 
     * reflect what an object / work is *of* (description and identification) from what it is *about* (interpretation).
     * 
     * @returns 
     */
    getSubjects(): Subject[] {
        let subjectNodes = OaiMapper.select('./lido:lido/lido:descriptiveMetadata/lido:objectRelationWrap/lido:subjectWrap/lido:subjectSet/lido:subject', this.record);
        let subjects: Subject[] = subjectNodes.map(subjectNode => ({
            actor: {
                id: OaiMapper.text('./subjectActor/actor/actorID', subjectNode),
                name: OaiMapper.text('./subjectActor/actor/nameActorSet/appellationValue', subjectNode),
                type: OaiMapper.text('./subjectActor/actor/nameActorSet/actor/@type', subjectNode)
            },
            displayDate: OaiMapper.text('./subjectDate/displayDate', subjectNode),
            period: {
                gte: new Date(OaiMapper.text('./subjectDate/date/earliestDate', subjectNode)),
                lte: new Date(OaiMapper.text('./subjectDate/date/latestDate', subjectNode))
            }
        }));
        return subjects;
    }

    // getClassifications(): Classification[] {

    // }

    // getConcept(): Concept {

    // }

    getRecord(): Record {
        let recordNode = OaiMapper.select('./lido:administrativeMetadata/lido:recordWrap', this.record, true);
        return {
            ids: OaiMapper.select('./lido:recordID', this.record).map(idNode => ({
                id: idNode.textContent,
                source: idNode.getAttribute('lido:source'),
                type: idNode.getAttribute('lido:type')
            })),
            info: OaiMapper.select('./lido:recordInfoSet', this.record).map(infoNode => ({
                created: new Date(OaiMapper.text('./recordMetadataDate[lido:type="http://terminology.lido-schema.org/recordMetadataDate_type/created"]', infoNode)),
                link: OaiMapper.text('./recordInfoLink', infoNode),
                modified: new Date(OaiMapper.text('./recordMetadataDate[lido:type="http://terminology.lido-schema.org/recordMetadataDate_type/modified"]', infoNode)),
                type: OaiMapper.text('./@type', infoNode)
            })),
            rights: OaiMapper.select('./lido:recordSource', this.record).map(rightsNode => ({
                holder: OaiMapper.text('./rightsHolder/legalBodyName/appellationValue', rightsNode)
            })),
            sources: OaiMapper.select('./lido:recordSource', this.record).map(sourceNode => ({
                name: OaiMapper.text('./legalBodyName/appellationValue', sourceNode),
                url: OaiMapper.text('./legalBodyWeblink', sourceNode),
            })),
            type: OaiMapper.text('./recordType/term', recordNode)
        };
    }

    getRepositories(): Repository[] {
        let repositoryNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:objectIdentificationWrap/lido:repositoryWrap/lido:repositorySet', this.record);
        let repositories: Repository[] = repositoryNodes.map(repositoryNode => ({
            geometry: GeoJsonUtils.parse(OaiMapper.select('./lido:repositoryLocation/lido:gml/gml:Point', repositoryNode, true), null, oaiXPaths.lido.prefixMap),
            id: OaiMapper.text('./repositoryName/legalBodyID', repositoryNode),
            name: OaiMapper.text('./repositoryName/legalBodyName/appellationValue', repositoryNode),
            workId: OaiMapper.text('./workID', repositoryNode)
        }));
        return repositories;
    }

    getResources(): Resource[] {
        let resourceNodes = OaiMapper.select('./lido:administrativeMetadata/lido:resourceWrap/lido:resourceSet', this.record);
        let resources: Resource[] = resourceNodes.map(resourceNode => ({
            description: OaiMapper.text('./resourceDescription', resourceNode),
            id: OaiMapper.text('./resourceID', resourceNode),
            links: OaiMapper.select('./resourceRepresentation', resourceNode).map(representationNode => ({
                format: OaiMapper.attr('./@type', representationNode),
                url: OaiMapper.text('./linkResource', representationNode)
            })),
            rights: OaiMapper.select('./rightsResource', resourceNode).map(rightsNode => ({
                holder: OaiMapper.text('./rightsHolder/legalBodyName/appellationValue', resourceNode),
                licenseURL: OaiMapper.text('./rightsType/conceptID', resourceNode),
                licenseName: OaiMapper.text('./rightsType/term', resourceNode)
            })),
            source: {
                name: OaiMapper.text('./resourceSource/legalBodyName/appellationValue', resourceNode),
                type: OaiMapper.attr('./@type', resourceNode)
            },
            type: OaiMapper.text('./resourceType/term', resourceNode)
        }));
        return resources;
    }
}
