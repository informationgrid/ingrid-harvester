/*
 * ==================================================
 * ingrid-harvester
 * ==================================================
 * Copyright (C) 2017 - 2024 wemove digital solutions GmbH
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
 * A mapper for LIDO XML documents harvested over OAI.
 */
import * as xpath from 'xpath';
import * as GeoJsonUtils from '../../../utils/geojson.utils';
import { getLogger } from 'log4js';
import { oaiXPaths } from '../oai.paths';
import { BaseMapper } from '../../base.mapper';
import { Event, Record, Relation, Repository, Resource, Subject } from './lido.model';
import { ImporterSettings } from '../../../importer.settings';
import { MetadataSource } from '../../../model/index.document';
import { OaiSettings } from '../oai.settings';
import { Summary } from '../../../model/summary';
import { XPathElementSelect } from '../../../utils/xpath.utils';
import { normalizeDateTime } from '../../../utils/misc.utils';

export class OaiMapper extends BaseMapper {

    static select = <XPathElementSelect>xpath.useNamespaces(oaiXPaths.lido.prefixMap);

    static text(path: string, parent: Node): string {
        path = path.replace(/\/@/g, '/@lido:');
        path = path.replace(/\/(?!@)/g, '/lido:');
        return OaiMapper.select(path, parent, true)?.textContent;
    }

    log = getLogger();

    private readonly header: Element;
    public readonly record: Element;
    private harvestTime: any;

    protected readonly idInfo; // : SelectedValue;
    private settings: OaiSettings;
    private readonly uuid: string;
    private summary: Summary;

    constructor(settings, header: Element, record: Element, harvestTime, summary) {
        super();
        this.settings = settings;
        this.header = header;
        this.record = record;
        this.harvestTime = harvestTime;
        this.summary = summary;

        super.init();
    }

    getId(): string {
        return OaiMapper.text('./lidoRecID', this.record);
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
                gte: normalizeDateTime(OaiMapper.text('./eventDate/date/earliestDate', eventNode)),
                lte: normalizeDateTime(OaiMapper.text('./eventDate/date/latestDate', eventNode))
            },
            place: {
                displayPlace: OaiMapper.text('./eventPlace/displayPlace', eventNode),
                geometry: GeoJsonUtils.parse(OaiMapper.select('./lido:eventPlace/lido:place/lido:gml/gml:Point', eventNode, true), null, oaiXPaths.lido.prefixMap),
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

    getTitles(): string[] {
        let titleNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:objectIdentificationWrap/lido:titleWrap/lido:titleSet', this.record);
        return titleNodes.map(titleNode => OaiMapper.text('./appellationValue', titleNode));
    }

    getDescriptions(): string[] {
        let descriptionNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:objectIdentificationWrap/lido:objectDescriptionWrap/lido:objectDescriptionSet', this.record);
        return descriptionNodes.map(descriptionNode => OaiMapper.text('./descriptiveNoteValue', descriptionNode));
    }

    getRelations(): Relation[] {
        let relationNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:objectRelationWrap/lido:relatedWorksWrap/lido:relatedWorkSet', this.record);
        let relations: Relation[] = relationNodes.map(relationNode => ({
            description: OaiMapper.text('./relatedWork/object/objectNote', relationNode),
            id: OaiMapper.text('./relatedWork/object/objectID', relationNode),
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
        let subjectNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:objectRelationWrap/lido:subjectWrap/lido:subjectSet/lido:subject', this.record);
        let subjects: Subject[] = subjectNodes.map(subjectNode => ({
            actor: {
                id: OaiMapper.text('./subjectActor/actor/actorID', subjectNode),
                name: OaiMapper.text('./subjectActor/actor/nameActorSet/appellationValue', subjectNode),
                type: OaiMapper.text('./subjectActor/actor/nameActorSet/actor/@type', subjectNode)
            },
            displayDate: OaiMapper.text('./subjectDate/displayDate', subjectNode),
            period: {
                gte: normalizeDateTime(OaiMapper.text('./subjectDate/date/earliestDate', subjectNode)),
                lte: normalizeDateTime(OaiMapper.text('./subjectDate/date/latestDate', subjectNode))
            },
            place: {
                displayPlace: OaiMapper.text('./subjectPlace/displayPlace', subjectNode),
                geometry: GeoJsonUtils.parse(OaiMapper.select('./lido:subjectPlace/lido:place/lido:gml/gml:Point', subjectNode, true), null, oaiXPaths.lido.prefixMap),
                id: OaiMapper.text('./subjectPlace/place/placeID', subjectNode),
                name: OaiMapper.text('./subjectPlace/place/namePlaceSet/appellationValue', subjectNode)
            },
            keyword: {
                conceptIds: OaiMapper.select('./lido:subjectConcept/lido:conceptID', subjectNode).map(conceptIdNode => ({
                    id: conceptIdNode.textContent,
                    source: conceptIdNode.getAttribute('lido:source'),
                    type: conceptIdNode.getAttribute('lido:type')
                })),
                terms: OaiMapper.select('./lido:subjectConcept/lido:term[@xml:lang="de"]', subjectNode).map(termNode => termNode.textContent)
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
            ids: OaiMapper.select('./lido:recordID', recordNode).map(idNode => ({
                id: idNode.textContent,
                source: idNode.getAttribute('lido:source'),
                type: idNode.getAttribute('lido:type')
            })),
            infos: OaiMapper.select('./lido:recordInfoSet', recordNode).map(infoNode => ({
                created: normalizeDateTime(OaiMapper.select('./lido:recordMetadataDate[@lido:type="http://terminology.lido-schema.org/recordMetadataDate_type/created"]', infoNode, true)?.textContent),
                link: OaiMapper.text('./recordInfoLink', infoNode),
                modified: normalizeDateTime(OaiMapper.select('./lido:recordMetadataDate[@lido:type="http://terminology.lido-schema.org/recordMetadataDate_type/modified"]', infoNode, true)?.textContent),
                type: OaiMapper.text('./@type', infoNode)
            })),
            rights: OaiMapper.select('./lido:recordSource/rightsHolder', recordNode).map(rightsNode => ({
                holder: OaiMapper.text('./legalBodyName/appellationValue', rightsNode),
                licenseName: OaiMapper.text('./legalBodyName/', rightsNode),
                licenseURL: OaiMapper.text('./legalBodyWeblink', rightsNode)
            })),
            sources: OaiMapper.select('./lido:recordSource', recordNode).map(sourceNode => ({
                name: OaiMapper.text('./legalBodyName/appellationValue', sourceNode),
                url: OaiMapper.text('./legalBodyWeblink', sourceNode),
            })),
            type: OaiMapper.text('./recordType/term', recordNode)
        };
    }

    getRepositories(): Repository[] {
        let repositoryNodes = OaiMapper.select('./lido:descriptiveMetadata/lido:objectIdentificationWrap/lido:repositoryWrap/lido:repositorySet', this.record);
        let repositories: Repository[] = repositoryNodes.map(repositoryNode => ({
            id: OaiMapper.text('./repositoryName/legalBodyID', repositoryNode),
            name: OaiMapper.text('./repositoryName/legalBodyName/appellationValue', repositoryNode),
            place: {
                displayPlace: OaiMapper.text('./repositoryLocation/displayPlace', repositoryNode),
                geometry: GeoJsonUtils.parse(OaiMapper.select('./lido:repositoryLocation/lido:gml/gml:Point', repositoryNode, true), null, oaiXPaths.lido.prefixMap),
                id: OaiMapper.text('./repositoryLocation/placeID', repositoryNode),
                name: OaiMapper.text('./repositoryLocation/namePlaceSet/appellationValue', repositoryNode)
            },
            workId: OaiMapper.text('./workID', repositoryNode)
        }));
        return repositories;
    }

    getResources(): Resource[] {
        let resourceNodes = OaiMapper.select('./lido:administrativeMetadata/lido:resourceWrap/lido:resourceSet', this.record);
        let resources: Resource[] = resourceNodes.map(resourceNode => ({
            description: OaiMapper.text('./resourceDescription', resourceNode),
            id: OaiMapper.text('./resourceID', resourceNode),
            links: OaiMapper.select('./lido:resourceRepresentation', resourceNode).map(representationNode => ({
                format: representationNode.getAttribute('lido:type'),
                url: OaiMapper.text('./linkResource', representationNode)
            })),
            rights: OaiMapper.select('./lido:rightsResource', resourceNode).map(rightsNode => ({
                holder: OaiMapper.text('./rightsHolder/legalBodyName/appellationValue', rightsNode),
                licenseURL: OaiMapper.text('./rightsType/conceptID', rightsNode),
                licenseName: OaiMapper.text('./rightsType/term', rightsNode)
            })),
            source: {
                name: OaiMapper.text('./resourceSource/legalBodyName/appellationValue', resourceNode),
                type: resourceNode.getAttribute('lido:type')
            },
            type: OaiMapper.text('./resourceType/term', resourceNode)
        }));
        return resources;
    }

    getSettings(): ImporterSettings {
        return this.settings;
    }

    getSummary(): Summary {
        return this.summary;
    }

    getHarvestedData(): string {
        return this.record.toString();
    }

    getHarvestingDate(): Date {
        return new Date(Date.now());
    }

    // TODO
    getIssued(): Date {
        return null;
    }

    // TODO
    getModified(): Date {
        return null;
    }

    getMetadataSource(): MetadataSource {
        let link = `${this.settings.sourceURL}?verb=GetRecord&metadataPrefix=${this.settings.metadataPrefix}&identifier=${this.getId()}`;
        return {
            source_base: this.settings.sourceURL,
            raw_data_source: link,
            source_type: this.settings.metadataPrefix
        };
    }
}
