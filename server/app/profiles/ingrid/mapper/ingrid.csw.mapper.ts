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

import bboxPolygon from '@turf/bbox-polygon';
import type { Geometry } from 'geojson';
import log4js from 'log4js';
import { CswMapper } from "../../../importer/csw/csw.mapper.js";
import * as GeoJsonUtils from "../../../utils/geojson.utils.js";
import * as XpathUtils from "../../../utils/xpath.utils.js";
import { Codelist } from "../utils/codelist.js";
import { ingridMapper, type DocumentKind } from "./ingrid.mapper.js";
import type { Distribution } from "../../../model/distribution.js";
import type { IndexContact, IndexKeyword, IndexReference, IndexSpatial, IndexTemporalItem } from "../../../model/index.document.js";
import type {IngridConformanceResult, IngridDataQuality, IngridDocumentType, IngridLicense, IngridSpatialRepresentation, IngridSpatialRepresentationType, IngridSpecific, IngridTemporal} from "../model/index.document.js";

const log = log4js.getLogger(import.meta.filename);

export class ingridCswMapper extends ingridMapper<CswMapper> {

    protected getDefaultDocumentKind(): DocumentKind {
        return 'ingrid';
    }

    // 'ingrid-deprecated' (the pre-migration IGC/t0xx-column-style shape) is available for CSW-sourced
    // mappers - see ingridMapper.buildIngridDeprecatedDocument() for the shared assembly and the field
    // getters overridden below (getT0/getT01_object/getT011_obj_*/getAddress/getLocation/etc.).
    protected override getDocumentBuilders() {
        return {
            ...super.getDocumentBuilders(),
            'ingrid-deprecated': () => this.buildIngridDeprecatedDocument(),
        };
    }

    getT0() {
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal && temporal.gte === temporal.lte) {
            return this.formatDate(temporal.gte);
        }
        return undefined;
    }

    getT1() {
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal && temporal.gte !== temporal.lte) {
            return temporal.gte ? this.formatDate(temporal.gte) : "00000000";
        }
        return undefined;
    }

    getT2() {
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal && temporal.gte !== temporal.lte) {
            return temporal.lte ? this.formatDate(temporal.lte) : "99999999";
        }
        return undefined;
    }

    getAlternateTitle(): string {
        return this.baseMapper._getAlternateTitle()?.join(" ");
    }

    getAlternateTitleDeprecated(): string[] {
        return this.baseMapper._getAlternateTitle();
    }

    async getDistributionsDeprecated(): Promise<Distribution[]> {
        let distributions = await this.baseMapper.getDistributions();
        return distributions?.filter(distribution => distribution.accessURL);
    }

    getAddress() {
       return this.baseMapper.getAddress();
    }

    getDescription() {
        return this.baseMapper.getDescription();
    }

    getLocation() {
        let result = [];
        let geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        geographicElements?.forEach(geographicElement => {
            let value = this.text("./gmd:EX_GeographicDescription/gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString", geographicElement);
            if(this.hasValue(value)) {
                result.push(value)
            }
            let boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
            boundingBoxes?.forEach(boundingBox => {
                let bound = this.text("./gmd:" + this.getLongLatBoundname("west") + "/gco:Decimal", boundingBox);
                if(bound) {
                    result.push("");
                }
            });
        });
        return this.getSingleEntryOrArray(result);
    }

    private getGeoBound(orientation: string){
        let result = [];
        let geographicElements = CswMapper.select(".//*/gmd:EX_Extent/gmd:geographicElement", this.baseMapper.idInfo);
        geographicElements?.forEach(geographicElement => {
            let boundingBoxes = CswMapper.select("./gmd:EX_GeographicBoundingBox", geographicElement);
            boundingBoxes?.forEach(boundingBox => {
                let bound = this.text("./gmd:" + this.getLongLatBoundname(orientation) + "/gco:Decimal", boundingBox);
                if(bound) {
                    result.push(bound);
                }
            });
        });
        return this.getSingleEntryOrArray(result);
    }

    private getLongLatBoundname(orientation: string){
        if(orientation === "east" || orientation === "west")
            return orientation+"BoundLongitude";
        else
            return orientation+"BoundLatitude";
    }

    getX1() {
        return this.getGeoBound("west");
    }

    getX2() {
        return this.getGeoBound("east");
    }

    getY1() {
        return this.getGeoBound("south");
    }

    getY2() {
        return this.getGeoBound("north");
    }

    getSpatial(): Geometry[] {
        let lowerCorner = `${this.getX1()} ${this.getY1()}`;
        let upperCorner = `${this.getX2()} ${this.getY2()}`;
        try {
            return [GeoJsonUtils.getBoundingBox(lowerCorner, upperCorner, "WGS84")];
        }
        catch (e) {
            log.warn(`Error while parsing bounding box for record ${this.getGeneratedId()}: ${e}`);
            return [];
        }
    }

    getIDF() {
        let idf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<html xmlns=\"http://www.portalu.de/IDF/1.0\">\n  <head/>\n  <body>\n";
        let renamedDom = XpathUtils.renameNodes("gmd:MD_Metadata", "idf:idfMdMetadata", this.baseMapper.record.cloneNode(true));
        renamedDom = XpathUtils.renameNodes("gmd:CI_ResponsibleParty", "idf:idfResponsibleParty", renamedDom);
        idf += renamedDom.toString();
        idf += "\n  </body>\n</html>\n";
        return idf;
    }

    getIso(): string {
        return this.baseMapper.record.toString();
    }

    // ISO MD_SpatialRepresentationTypeCode -> index value (see index-ingrid: ingrid.spatial_representation.types)
    private static readonly SPATIAL_REPRESENTATION_TYPES: Record<string, IngridSpatialRepresentationType> = {
        vector: 'vector',
        grid: 'grid',
        textTable: 'text',
        tin: 'tin',
        stereoModel: 'stereomodel',
        video: 'video',
    };

    // Raster elements, incl. their ISO 19115-2 counterparts (gmi:MI_Georectified, gmi:MI_Georeferenceable)
    private static readonly GRID_ELEMENTS = ['MD_GridSpatialRepresentation', 'MD_Georectified', 'MD_Georeferenceable', 'MI_Georectified', 'MI_Georeferenceable'];
    // length units (@uom) -> factor to metres; EPSG unit codes 9001 m, 9002 ft, 9036 km, 1033 cm, 1025 mm
    private static readonly UOM_TO_METRES: Record<string, number> = {
        'm': 1, 'meter': 1, 'metre': 1, 'meters': 1, 'metres': 1, '9001': 1,
        'km': 1000, 'kilometer': 1000, 'kilometre': 1000, '9036': 1000,
        'cm': 0.01, '1033': 0.01,
        'mm': 0.001, '1025': 0.001,
        'ft': 0.3048, 'foot': 0.3048, 'feet': 0.3048, '9002': 0.3048,
    };

    /**
     * Grid axis resolution in metres (index-ingrid: "in Metern"): any gco:Measure substitute below gmd:resolution
     * (gco:Length, gco:Distance, gco:Scale as written by IGE, ...), converted by @uom. Angles and unknown or missing
     * units are omitted rather than written as metres.
     */
    private getResolutionInMetres(dimension: Element): number | undefined {
        return this.toMetres(CswMapper.select('./gmd:resolution/*', dimension, true) as Element);
    }

    // a gco:Measure (or substitute) converted to metres by @uom; undefined for angles and unknown or missing units
    private toMetres(measure: Element): number | undefined {
        const value = Number(measure?.textContent?.trim());
        const uom = measure?.getAttribute('uom')?.trim().toLowerCase();
        if (!uom || measure.textContent?.trim() === '' || isNaN(value)) return undefined;
        // URN/URL forms such as urn:ogc:def:uom:EPSG::9001 or http://www.opengis.net/def/uom/EPSG/0/9001
        const key = uom.includes('epsg') ? uom.match(/(\d+)$/)?.[1] : uom;
        const factor = ingridCswMapper.UOM_TO_METRES[key];
        return factor ? value * factor : undefined;
    }

    getSpatialRepresentation(): IngridSpatialRepresentation {
        const parseBool = (val: string | undefined) => val != null ? val === 'true' : undefined;
        const parseNum  = (val: string | undefined) => { const n = Number(val); return isNaN(n) || val == null ? undefined : n; };

        const types = new Set<IngridSpatialRepresentationType>();
        // gmd:spatialRepresentationType only exists in gmd:MD_DataIdentification
        for (const code of CswMapper.select('./gmd:MD_DataIdentification/gmd:spatialRepresentationType/gmd:MD_SpatialRepresentationTypeCode/@codeListValue', this.baseMapper.idInfo) ?? []) {
            const type = ingridCswMapper.SPATIAL_REPRESENTATION_TYPES[code.textContent?.trim()];
            if (type) types.add(type);
        }

        const nodes = CswMapper.select('./gmd:spatialRepresentationInfo/*', this.baseMapper.record) ?? [];

        // one entry per gmd:MD_GeometricObjects of all vector elements; topology from the enclosing element
        const vector: IngridSpatialRepresentation['vector'] = [];
        for (const node of nodes.filter(n => n.localName === 'MD_VectorSpatialRepresentation')) {
            types.add('vector');
            const topology = this.text('./gmd:topologyLevel/gmd:MD_TopologyLevelCode/@codeListValue', node) ?? undefined;
            const objects = CswMapper.select('./gmd:geometricObjects/gmd:MD_GeometricObjects', node) ?? [];
            for (const go of objects) {
                vector.push({
                    topology,
                    geometry_type: this.text('./gmd:geometricObjectType/gmd:MD_GeometricObjectTypeCode/@codeListValue', go) ?? undefined,
                    number: parseNum(this.text('./gmd:geometricObjectCount/gco:Integer', go)),
                });
            }
            if (!objects.length && topology) {
                vector.push({ topology });
            }
        }

        // the index holds a single grid: the first raster element
        const gridNodes = nodes.filter(n => ingridCswMapper.GRID_ELEMENTS.includes(n.localName));
        let grid: IngridSpatialRepresentation['grid'];
        if (gridNodes.length) {
            types.add('grid');
            const node = gridNodes[0];
            const name = node.localName;
            const axes = CswMapper.select('./gmd:axisDimensionProperties/gmd:MD_Dimension', node)?.map(dim => ({
                label: this.text('./gmd:dimensionName/gmd:MD_DimensionNameTypeCode/@codeListValue', dim) ?? undefined,
                number: parseNum(this.text('./gmd:dimensionSize/gco:Integer', dim)),
                resolution: this.getResolutionInMetres(dim),
            }));
            const cellCode = this.text('./gmd:cellGeometry/gmd:MD_CellGeometryCode/@codeListValue', node);
            grid = {
                axes: axes?.length ? axes : undefined,
                available_parameters: parseBool(this.text('./gmd:transformationParameterAvailability/gco:Boolean', node)),
                number_dimensions: parseNum(this.text('./gmd:numberOfDimensions/gco:Integer', node)),
                cell_geometry: cellCode || undefined,
                cell_geometry_ref_uri: cellCode ? this.codelistRef('509', this.transformToIgcDomainId(cellCode, '509')) : undefined,
            };
            if (name === 'MD_Georectified' || name === 'MI_Georectified') {
                const pointInPixel = this.text('./gmd:pointInPixel/gmd:MD_PixelOrientationCode', node);
                grid.rectified = {
                    checkpoint_availability: parseBool(this.text('./gmd:checkPointAvailability/gco:Boolean', node)),
                    checkpoint_description: this.text('./gmd:checkPointDescription/gco:CharacterString', node) ?? undefined,
                    // one gml:Point per corner, joined by comma; GML 3.1 or 3.2, gml:pos or the deprecated gml:coordinates (IGE)
                    corner_points: CswMapper.select("./gmd:cornerPoints/*[local-name()='Point']/*[local-name()='pos' or local-name()='coordinates']", node)
                        ?.map(n => n.textContent?.trim()).filter(Boolean).join(',') || undefined,
                    point_in_pixel: pointInPixel || undefined,
                    point_in_pixel_ref_uri: pointInPixel ? this.codelistRef('2100', this.transformToIgcDomainId(pointInPixel, '2100')) : undefined,
                };
            } else if (name === 'MD_Georeferenceable' || name === 'MI_Georeferenceable') {
                grid.referenced = {
                    orientation_parameter_availability: parseBool(this.text('./gmd:orientationParameterAvailability/gco:Boolean', node)),
                    control_point_availability: parseBool(this.text('./gmd:controlPointAvailability/gco:Boolean', node)),
                    // gco:Record content; without gmd:georeferencedParameters the title of the first gmd:parameterCitation
                    parameters: this.text('./gmd:georeferencedParameters/gco:Record', node)?.trim()
                        || this.text('./gmd:parameterCitation/gmd:CI_Citation/gmd:title/gco:CharacterString', node)
                        || undefined,
                };
            }
        }

        if (!types.size && !vector.length && !grid) return undefined;
        return {
            types: types.size ? [...types] : undefined,
            vector: vector.length ? vector : undefined,
            grid,
        };
    }

    getSpecificUsage(): string {
        return this.text("./gmd:MD_DataIdentification/gmd:resourceSpecificUsage/gmd:MD_Usage/gmd:specificUsage/gco:CharacterString", this.baseMapper.idInfo);
    }

    getOrderInfo(): string {
        return this.text("./gmd:distributionInfo/gmd:MD_Distribution/gmd:distributor/gmd:MD_Distributor/gmd:distributionOrderProcess/gmd:MD_StandardOrderProcess/gmd:orderingInstructions/gco:CharacterString", this.baseMapper.record);
    }

    getPurpose(): string {
        return this.text("./gmd:MD_DataIdentification/gmd:purpose/gco:CharacterString", this.baseMapper.idInfo);
    }

    getDatasourceIdentifier(): string {
        return this.text("./gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:identifier/gmd:MD_Identifier/gmd:code/gco:CharacterString", this.baseMapper.idInfo);
    }

    getParentIdentifier(): string {
        return this.text("./gmd:parentIdentifier/gco:CharacterString", this.baseMapper.record);
    }

    getReferences(): IndexReference[] {
        const references: IndexReference[] = [];
        const seenUrls = new Set<string>();

        this.getCapabilitiesURL()?.forEach(url => {
            if (seenUrls.has(url)) return;
            seenUrls.add(url);
            references.push({ url, type: 'Gekoppelte Daten', type_ref_uri: this.codelistRef('2000', '3600') });
        });

        const onlineResources = CswMapper.select('./gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions/gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource', this.baseMapper.record);
        onlineResources?.forEach(onlineResource => {
            const url = this.text('./gmd:linkage/gmd:URL', onlineResource);
            if (!url || seenUrls.has(url)) return;
            seenUrls.add(url);
            const functionCode = this.text('./gmd:function/gmd:CI_OnLineFunctionCode/@codeListValue', onlineResource);
            references.push({
                url,
                title: this.text('./gmd:name/gco:CharacterString', onlineResource) ?? undefined,
                explanation: this.text('./gmd:description/gco:CharacterString', onlineResource) ?? undefined,
                type: functionCode ?? undefined,
                type_ref_uri: functionCode ? this.codelistRef('2000', this.transformToIgcDomainId(functionCode, '2000')) : undefined,
            });
        });

        const mdBrowseGraphics = CswMapper.select('.//gmd:graphicOverview/gmd:MD_BrowseGraphic', this.baseMapper.idInfo);
        mdBrowseGraphics?.forEach(mdBrowseGraphic => {
            const url = this.text('./gmd:fileName/gco:CharacterString', mdBrowseGraphic);
            if (!url || seenUrls.has(url)) return;
            seenUrls.add(url);
            references.push({
                url,
                explanation: this.text('./gmd:fileDescription/gco:CharacterString', mdBrowseGraphic) ?? undefined,
                type: 'previewGraphic',
            });
        });

        return references.length ? references : undefined;
    }

    getDocumentType(): IngridDocumentType {
        let hierarchyLevel = this.getHierarchyLevel()?.toLowerCase();
        if (hierarchyLevel == 'service') {
            return 'InGridGeoService';
        }
        if (hierarchyLevel == 'application') {
            return 'InGridInformationSystem';
        }
        if (hierarchyLevel == 'nongeographicdataset') {
            switch (this.baseMapper.getHierarchyLevelName()) {
                case 'job': return 'InGridSpecialisedTask';
                case 'document': return 'InGridPublication';
                case 'project': return 'InGridProject';
                case 'database': return 'InGridDataCollection';
            }
        }
        return 'InGridGeoDataset';
    }

    getCharacterSet(): string {
        return this.text('./gmd:MD_DataIdentification/gmd:characterSet/gmd:MD_CharacterSetCode/@codeListValue', this.baseMapper.idInfo) || undefined;
    }

    getCrs(): string[] {
        // not via getReferenceSystems() (feeds the deprecated referencesystem_*), which drops gmx:Anchor codes;
        // index-ingrid x-transform: '<codeSpace>:<code>' or the URI alone - for an Anchor its xlink:href
        const rsIdentifiers = CswMapper.select("./gmd:referenceSystemInfo/gmd:MD_ReferenceSystem/gmd:referenceSystemIdentifier/gmd:RS_Identifier", this.baseMapper.record) ?? [];
        const result = rsIdentifiers.map(rsIdentifier => {
            const anchor = CswMapper.select("./gmd:code/gmx:Anchor", rsIdentifier, true) as Element;
            if (anchor) {
                return anchor.getAttribute('xlink:href')?.trim() || anchor.textContent?.trim() || undefined;
            }
            const code = this.text("./gmd:code/gco:CharacterString", rsIdentifier)?.trim();
            const codeSpace = this.text("./gmd:codeSpace/gco:CharacterString", rsIdentifier)?.trim();
            // a URI code stands alone, even with a codeSpace
            return code && codeSpace && !/^https?:\/\//.test(code) ? `${codeSpace}:${code}` : code || undefined;
        }).filter(Boolean);
        return result.length ? [...new Set(result)] : undefined;
    }

    getSpatialResolutionScale(): IngridSpecific['spatial_resolution_scale'] {
        // one gmd:MD_Resolution per value (scale, ground or scan resolution); the first of each kind is taken
        const resolution = "./gmd:MD_DataIdentification/gmd:spatialResolution/gmd:MD_Resolution";
        if (!CswMapper.select(resolution, this.baseMapper.idInfo)?.length) return undefined;
        const parseNum = (val: string | undefined) => { const n = Number(val); return isNaN(n) || val == null ? undefined : n; };
        const distances = (CswMapper.select(`${resolution}/gmd:distance/gco:Distance`, this.baseMapper.idInfo) ?? []) as Element[];
        const isDpi = (distance: Element) => distance.getAttribute('uom')?.trim().toLowerCase() === 'dpi';
        // ground resolution: any unit but dpi, converted to metres (index-ingrid: "in Metern")
        const ground = distances.filter(distance => !isDpi(distance)).map(distance => this.toMetres(distance)).find(value => value != null);
        const scan = distances.filter(isDpi).map(distance => parseNum(distance.textContent?.trim())).find(value => value != null);
        return {
            scale: parseNum(this.text(`${resolution}/gmd:equivalentScale/gmd:MD_RepresentativeFraction/gmd:denominator/gco:Integer`, this.baseMapper.idInfo)),
            resolution_ground: ground,
            resolution_scan: scan,
        };
    }

    getLineage(): IngridSpecific['lineage'] {
        const lineage = CswMapper.select("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage", this.baseMapper.record, true);
        if (!lineage) return undefined;
        return {
            statement: this.text("./gmd:statement/gco:CharacterString", lineage) ?? undefined,
            source: this.text("./gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString", lineage) ?? undefined,
            process_step: this.text("./gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString", lineage) ?? undefined,
        };
    }

    getProcessStepDescription(): string[] {
        const steps = CswMapper.select("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString", this.baseMapper.record);
        const result = steps?.map(s => s.textContent).filter(Boolean);
        return result?.length ? result : undefined;
    }

    getSymbolCatalogue(): IngridSpecific['symbol_catalogue'] {
        const citations = CswMapper.select("./gmd:portrayalCatalogueInfo/gmd:MD_PortrayalCatalogueReference/gmd:portrayalCatalogueCitation/gmd:CI_Citation", this.baseMapper.record);
        const result = citations?.map(citation => ({
            title: this.text("./gmd:title/gco:CharacterString", citation) ?? undefined,
            date: this.text("./gmd:date/gmd:CI_Date/gmd:date/gco:Date", citation) ?? undefined,
            version: this.text("./gmd:edition/gco:CharacterString", citation) ?? undefined,
        }));
        return result?.length ? result : undefined;
    }

    getCodeListReference(): IngridSpecific['codelist_reference'] {
        const citations = CswMapper.select("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:featureCatalogueCitation/gmd:CI_Citation", this.baseMapper.record);
        const result = citations?.map(citation => ({
            title: this.text("./gmd:title/gco:CharacterString", citation) ?? undefined,
            date: this.text("./gmd:date/gmd:CI_Date/gmd:date/gco:Date", citation) ?? undefined,
            version: this.text("./gmd:edition/gco:CharacterString", citation) ?? undefined,
        }));
        return result?.length ? result : undefined;
    }

    getIngridSpatial(): IngridSpecific['spatial'] {
        // datasets use gmd:extent, services srv:extent (as IGE writes them)
        const extent = "./*/*[self::gmd:extent or self::srv:extent]/gmd:EX_Extent";
        // several described extents are joined with ';' like the IGE ISO import
        const descriptions = CswMapper.select(`${extent}/gmd:description/gco:CharacterString`, this.baseMapper.idInfo)
            ?.map(node => node.textContent?.trim()).filter(Boolean);
        const description = descriptions?.length ? descriptions.join(';') : undefined;
        // GML 3.1 or 3.2 (IGE writes gml/3.2), hence local-name(); the datum is named in gml:name (IGE) or gml:identifier
        const verticalCrs = `${extent}/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:verticalCRS/*[local-name()='VerticalCRS']`;
        const unit = this.text(`${verticalCrs}/*[local-name()='verticalCS']/*[local-name()='VerticalCS']/*[local-name()='axis']/*[local-name()='CoordinateSystemAxis']/@uom`, this.baseMapper.idInfo) || undefined;
        const vdatum = this.text(`${verticalCrs}/*[local-name()='verticalDatum']/*[local-name()='VerticalDatum']/*[local-name()='name']`, this.baseMapper.idInfo)
            || this.text(`${verticalCrs}/*[local-name()='verticalDatum']/*[local-name()='VerticalDatum']/*[local-name()='identifier']`, this.baseMapper.idInfo)
            || undefined;
        const minimum = this.text(`${extent}/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:minimumValue/gco:Real`, this.baseMapper.idInfo);
        const maximum = this.text(`${extent}/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:maximumValue/gco:Real`, this.baseMapper.idInfo);
        if (!description && !minimum && !maximum) return undefined;
        const parseNum = (val: string | undefined) => { const n = Number(val); return isNaN(n) || val == null ? undefined : n; };
        return {
            description,
            vertical_extent: (minimum || maximum) ? {
                minimum: parseNum(minimum),
                maximum: parseNum(maximum),
                unit,
                unit_ref_uri: unit ? this.codelistRef('102', this.transformToIgcDomainId(unit, '102')) : undefined,
                vdatum,
                // codelist 101 has no ISO value - resolve by text
                vdatum_ref_uri: vdatum ? this.codelistRef('101', Codelist.getInstance().getIdByUrlOrText('101', undefined, vdatum.trim())) : undefined,
            } : undefined,
        };
    }

    getService(): IngridSpecific['service'] {
        if (this.getHierarchyLevel()?.toLowerCase() !== 'service') return undefined;
        const type = this.text("./srv:SV_ServiceIdentification/srv:serviceType/gco:LocalName", this.baseMapper.idInfo) ?? undefined;
        const versionNodes = CswMapper.select("./srv:SV_ServiceIdentification/srv:serviceTypeVersion/gco:CharacterString", this.baseMapper.idInfo);
        const versions = versionNodes?.map(v => v.textContent).filter(Boolean);
        const operationNodes = CswMapper.select('./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata', this.baseMapper.idInfo);
        const operations = operationNodes?.map(op => ({
            name: this.text("./srv:operationName/gco:CharacterString", op) ?? undefined,
            description: this.text("./srv:operationDescription/gco:CharacterString", op) ?? undefined,
            access_url: this.text("./srv:connectPoint/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", op) ?? undefined,
        }));
        const hasAccessConstraints = this.hasAccessConstraints();
        // TODO: no confirmed ISO source found yet for classifications / environment_description / additional_information / doi
        return {
            type,
            classifications: undefined,
            versions: versions?.length ? versions : undefined,
            operations: operations?.length ? operations : undefined,
            environment_description: undefined,
            service_history: undefined,
            additional_information: undefined,
            has_access_constraints: hasAccessConstraints,
            doi: undefined,
        };
    }

    private joinTexts(xpath: string): string {
        const texts = CswMapper.select(xpath, this.baseMapper.record)?.map(n => n.textContent).filter(Boolean);
        return texts?.length ? texts.join('\n') : undefined;
    }

    getPublication(): IngridSpecific['publication'] {
        if (this.getDocumentType() !== 'InGridPublication') return undefined;
        const citation = CswMapper.select("./*/gmd:citation/gmd:CI_Citation", this.baseMapper.idInfo, true);
        const fromCitation = (xpath: string) => citation ? this.text(xpath, citation) ?? undefined : undefined;
        // author / publisher / place_of_publication use the ISO roles originator / publisher, which real addresses in
        // gmd:citedResponsibleParty share - not unambiguously recoverable
        // document_type: the InGrid Editor writes the English value of codelist 3385 as gmd:resourceFormat (only for
        // publications, not with an active DOI); taken only if it matches 3385 (no ISO value - resolve by text), since
        // other catalogs use gmd:resourceFormat for real formats
        const resourceFormat = this.text("./*/gmd:resourceFormat/gmd:MD_Format/gmd:name/gco:CharacterString", this.baseMapper.idInfo)?.trim();
        const documentTypeId = resourceFormat ? Codelist.getInstance().getIdByUrlOrText('3385', undefined, resourceFormat) : undefined;
        const result = {
            published_in: fromCitation("./gmd:series/gmd:CI_Series/gmd:name/gco:CharacterString"),
            volume: fromCitation("./gmd:series/gmd:CI_Series/gmd:issueIdentification/gco:CharacterString"),
            pages: fromCitation("./gmd:series/gmd:CI_Series/gmd:page/gco:CharacterString"),
            publication_date: fromCitation("./gmd:editionDate/gco:Date"),
            // the InGrid Editor marks the location by this fixed organisationName
            location: fromCitation("./gmd:citedResponsibleParty/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue='resourceProvider'][gmd:organisationName/gco:CharacterString='Contact instructions for the location of resource']/gmd:contactInfo/gmd:CI_Contact/gmd:contactInstructions/gco:CharacterString"),
            isbn: fromCitation("./gmd:ISBN/gco:CharacterString"),
            // "distribute" is an InGrid Editor role, not an ISO CI_RoleCode value
            publishing_house: fromCitation("./gmd:citedResponsibleParty/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue='distribute']/gmd:organisationName/gco:CharacterString"),
            base_data_text: this.joinTexts("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString"),
            bibliographic_data: fromCitation("./gmd:otherCitationDetails/gco:CharacterString"),
            explanation: this.text("./*/gmd:supplementalInformation/gco:CharacterString", this.baseMapper.idInfo) ?? undefined,
            document_type: documentTypeId ? resourceFormat : undefined,
            document_type_ref_uri: this.codelistRef('3385', documentTypeId),
        };
        return Object.values(result).some(v => v != null) ? result : undefined;
    }

    getProject(): IngridSpecific['project'] {
        if (this.getDocumentType() !== 'InGridProject') return undefined;
        // projectManager / projectParticipant are InGrid Editor roles, not ISO CI_RoleCode values
        const party = (role: string) => `./gmd:identificationInfo/*/gmd:citation/gmd:CI_Citation/gmd:citedResponsibleParty/gmd:CI_ResponsibleParty[gmd:role/gmd:CI_RoleCode/@codeListValue='${role}']/gmd:individualName/gco:CharacterString`;
        const result = {
            participants: this.joinTexts(party('projectParticipant')),
            manager: this.joinTexts(party('projectManager')),
            explanation: this.text("./*/gmd:supplementalInformation/gco:CharacterString", this.baseMapper.idInfo) ?? undefined,
        };
        return Object.values(result).some(v => v != null) ? result : undefined;
    }

    getDatabaseCollection(): IngridSpecific['database_collection'] {
        if (this.getDocumentType() !== 'InGridDataCollection') return undefined;
        const citations = CswMapper.select("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:featureCatalogueCitation/gmd:CI_Citation", this.baseMapper.record);
        // the InGrid Editor writes a placeholder citation "unknown" when no category catalog is set
        const categories = citations?.map(citation => ({
            title: this.text("./gmd:title/gco:CharacterString", citation) ?? undefined,
            date: this.text("./gmd:date/gmd:CI_Date/gmd:date/gco:Date|./gmd:date/gmd:CI_Date/gmd:date/gco:DateTime", citation) ?? undefined,
            edition: this.text("./gmd:edition/gco:CharacterString", citation) ?? undefined,
        })).filter(category => category.title !== 'unknown');
        // the InGrid Editor writes each entry as "<parameter> (<moreInfo>)"
        const featureTypes = CswMapper.select("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:featureTypes/gco:LocalName", this.baseMapper.record);
        const content = featureTypes?.map(n => n.textContent).filter(Boolean).map(text => {
            const match = /^(.*) \(([^()]*)\)$/s.exec(text);
            return match ? { parameter: match[1], more_info: match[2] } : { parameter: text };
        });
        const result = {
            catalog_categories: categories?.length ? categories : undefined,
            database_content: content?.length ? content : undefined,
            method: this.joinTexts("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString"),
            explanation: this.text("./*/gmd:supplementalInformation/gco:CharacterString", this.baseMapper.idInfo) ?? undefined,
        };
        return Object.values(result).some(v => v != null) ? result : undefined;
    }

    getInformationSystem(): IngridSpecific['information_system'] {
        if (this.getDocumentType() !== 'InGridInformationSystem') return undefined;
        // service_type / version / information_system are not exported to ISO by the InGrid Editor for this class,
        // service_urls only as gmd:onLine with function "information" - indistinguishable from getReferences()
        const result = {
            system_environment: this.text("./*/gmd:environmentDescription/gco:CharacterString", this.baseMapper.idInfo) ?? undefined,
            history: this.joinTexts("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString"),
            basis_data: this.joinTexts("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString"),
            explanation: this.text("./*/gmd:supplementalInformation/gco:CharacterString", this.baseMapper.idInfo) ?? undefined,
        };
        return Object.values(result).some(v => v != null) ? result : undefined;
    }

    // services only: the outgoing half of the service->dataset coupling, as declared by the service's
    // own srv:operatesOn/srv:coupledResource (bare UUIDs). CswImporter.coupleService() reads it to build
    // the coupling rows; IngridElasticsearchCatalog.resolveCoupling() completes each entry with the
    // coupled dataset's name/document_type/description and adds the dataset-side (IN) entries.
    getCrossReferences(): IngridSpecific['cross_references'] {
        if (this.getHierarchyLevel()?.toLowerCase() !== 'service') return undefined;
        return this.baseMapper.getOperatesOn()?.map(uuid => ({
            uuid,
            reference_type: 'Basisdaten',
            direction: 'OUT' as const,
        }));
    }

    // language of the described dataset (root document field, distinct from the metadata record's own language)
    getLanguage(): string {
        return this.transformGeneric(this.text('./*/gmd:language/gco:CharacterString', this.baseMapper.idInfo), { deu: 'de', ger: 'de', eng: 'en' }, 'de');
    }

    // language of the metadata record itself, as ISO 639-1 (schema: metadata.language)
    getMetadataLanguage(): string {
        return this.transformGeneric(this.baseMapper.getLanguage(), { deu: 'de', ger: 'de', eng: 'en' }, undefined);
    }

    getSpatials(): IndexSpatial[] {
        const geometry = this.baseMapper.getSpatial();
        const toponym = this.getToponyms();
        const bbox = geometry ? this.getBoundingBox(geometry) : undefined;
        if (!bbox && !toponym?.length) {
            return undefined;
        }
        const spatial: IndexSpatial = {};
        if (bbox) {
            spatial.bbox = bbox;
            // build a standard GeoJSON polygon from the bbox, since `baseMapper.getSpatial()` may
            // return the non-standard "Envelope" type (used for plain bounding boxes), which is
            // neither understood by GeoJSON tooling nor part of the schema's geometry.type enum
            spatial.geometry = bboxPolygon(bbox as [number, number, number, number]).geometry;
        }
        if (toponym?.length) {
            spatial.toponym = toponym;
        }
        return [spatial];
    }

    // derive a plain [minX, minY, maxX, maxY] bbox by walking the geometry's coordinate arrays directly,
    // instead of relying on GeoJSON-type-aware tooling that only recognizes standard geometry types
    // (`baseMapper.getSpatial()` can return the non-standard "Envelope" type for plain bounding boxes)
    private getBoundingBox(geometry: any): number[] {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const visit = (coords: any) => {
            if (typeof coords?.[0] === 'number') {
                const [x, y] = coords;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
            else {
                coords?.forEach(visit);
            }
        };
        if (geometry.type === 'GeometryCollection') {
            geometry.geometries?.forEach((g: any) => visit(g.coordinates));
        }
        else {
            visit(geometry.coordinates);
        }
        return isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY) ? [minX, minY, maxX, maxY] : undefined;
    }

    private getToponyms(): string[] {
        const nodes = CswMapper.select('(./srv:SV_ServiceIdentification/srv:extent|./gmd:MD_DataIdentification/gmd:extent)/gmd:EX_Extent/gmd:geographicElement/gmd:EX_GeographicDescription/gmd:geographicIdentifier/gmd:MD_Identifier/gmd:code/gco:CharacterString', this.baseMapper.idInfo);
        const toponyms = nodes?.map(node => node.textContent?.trim()).filter(Boolean);
        return toponyms?.length ? toponyms : undefined;
    }

    /**
     * Delivery points joined by comma, without the post box (index-ingrid x-transform of street / pobox): IGE writes
     * the post box as its own deliveryPoint 'Postbox <number>,<zip> <city>' (AddressModelTransformer.postBoxAddress,
     * recognized by this prefix in the IGE ISO import); the x-transform names the prefix 'Postfach'.
     */
    private getStreet(party: Element): string | undefined {
        const lines = CswMapper.select('./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:deliveryPoint/gco:CharacterString', party)
            ?.map(node => node.textContent?.trim())
            .filter(line => line && !/^(Postbox|Postfach) /.test(line));
        return lines?.length ? lines.join(', ') : undefined;
    }

    async getContacts(): Promise<IndexContact[]> {
        const contactPoints = await this.baseMapper.getContactPoints();
        if (!contactPoints?.length) {
            return undefined;
        }
        // street is read here, not from the shared CswMapper.getContactPoints() (hasStreetAddress is always empty there,
        // fixing it would change other profiles); same parties in the same order as getContactPoints()
        const parties = [
            ...CswMapper.select('./gmd:identificationInfo/gmd:MD_DataIdentification/gmd:pointOfContact/gmd:CI_ResponsibleParty', this.baseMapper.record),
            ...CswMapper.select('./gmd:contact/gmd:CI_ResponsibleParty', this.baseMapper.record),
        ];
        const streets = parties.length === contactPoints.length ? parties.map(party => this.getStreet(party)) : [];
        return contactPoints.map((cp, index) => {
            const communications: IndexContact['communications'] = [];
            if (cp.hasEmail) communications.push({ type: 'email', value: cp.hasEmail });
            if (cp.hasTelephone) communications.push({ type: 'phone', value: cp.hasTelephone });
            if (cp.hasURL) communications.push({ type: 'website', value: cp.hasURL });
            return {
                role: cp.role,
                name: cp.fn,
                communications: communications.length ? communications : undefined,
                street: streets[index],
                code: cp.hasPostalCode,
                locality: cp.hasLocality,
                country: cp.hasCountryName,
                administrative_area: cp.hasRegion,
            };
        });
    }

    getKeywords(): IndexKeyword[] {
        const keywords: IndexKeyword[] = [];
        const seenTerms = new Set<string>();
        const addKeywords = (xpath: string, source: string) => {
            CswMapper.select(xpath, this.baseMapper.idInfo)?.forEach(node => {
                const term = node.textContent?.trim();
                if (term && !seenTerms.has(term)) {
                    seenTerms.add(term);
                    keywords.push({ term, source });
                }
            });
        };
        // check for INSPIRE themes
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - INSPIRE themes, version 1.0']/gmd:keyword/gco:CharacterString", 'inspire');
        // check for GEMET keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - Concepts, version 2.1']/gmd:keyword/gco:CharacterString", 'gemet');
        // check for UMTHES keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='UMTHES Thesaurus']/gmd:keyword/gco:CharacterString", 'umthes');
        // remaining, unclassified keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString", 'frei');
        // ISO topic categories
        addKeywords('./gmd:MD_DataIdentification/gmd:topicCategory/gmd:MD_TopicCategoryCode', 'iso_topic');
        return keywords.length ? keywords : undefined;
    }

    getTemporal(): IngridTemporal {
        const data_temporal: IndexTemporalItem[] = [];
        const dateRanges = this.baseMapper.getTemporal();
        dateRanges?.forEach(range => data_temporal.push({
            date_range: {
                gte: range.gte?.toISOString(),
                lte: range.lte?.toISOString(),
            }
        }));
        this.getCitationDates()?.forEach(item => data_temporal.push(item));

        const status = this.getStatus();
        const maintenance_frequency = this.getMaintenanceFrequency();

        if (!data_temporal.length && !status && !maintenance_frequency) {
            return undefined;
        }
        return {
            data_temporal: data_temporal.length ? data_temporal : undefined,
            status,
            // guarded: Codelist.getId() matches entries without an ISO value when looked up with undefined (523 -> 900001)
            status_ref_uri: status ? this.codelistRef('523', this.transformToIgcDomainId(status, '523')) : undefined,
            maintenance_frequency,
            maintenance_frequency_ref_uri: maintenance_frequency ? this.codelistRef('518', this.transformToIgcDomainId(maintenance_frequency, '518')) : undefined,
        };
    }

    // citation dates (creation/publication/revision) mapped onto the InGrid Index date_type enum
    private getCitationDates(): IndexTemporalItem[] {
        const dateTypeMap: Record<string, 'created' | 'last_updated' | 'first_published'> = {
            creation: 'created',
            revision: 'last_updated',
            publication: 'first_published',
        };
        const dateNodes = CswMapper.select('./gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:date/gmd:CI_Date', this.baseMapper.idInfo);
        return dateNodes?.map(dateNode => {
            const dateText = this.text('./gmd:date/gco:Date|./gmd:date/gco:DateTime', dateNode);
            const date = dateText ? new Date(dateText) : undefined;
            if (!date || isNaN(date.getTime())) {
                return undefined;
            }
            const isoDateType = this.text('./gmd:dateType/gmd:CI_DateTypeCode/@codeListValue', dateNode);
            const date_type = dateTypeMap[isoDateType];
            return date_type ? { date: date.toISOString(), date_type } : { date: date.toISOString() };
        }).filter(Boolean);
    }

    private getStatus(): string {
        return this.text('./gmd:MD_DataIdentification/gmd:status/gmd:MD_ProgressCode/@codeListValue', this.baseMapper.idInfo) || undefined;
    }

    private getMaintenanceFrequency(): string {
        return this.text('./gmd:MD_DataIdentification/gmd:resourceMaintenance/gmd:MD_MaintenanceInformation/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode/@codeListValue', this.baseMapper.idInfo) || undefined;
    }

    getCapabilitiesURL(): string[] {
        let url = this.text(`./srv:SV_ServiceIdentification[
                ./srv:serviceType/gco:LocalName/text() = 'WMS'
                or ./srv:serviceType/gco:LocalName/text() = 'view'
                or ./srv:serviceType/gco:LocalName/text() = 'WMTS'
            ]//srv:containsOperations/srv:SV_OperationMetadata/srv:operationName/gco:CharacterString[text() = 'GetCapabilities']/../../srv:connectPoint//gmd:URL`, this.baseMapper.idInfo);
        return url ? [url] : [];
    }

    getAdditionalHtml(): string {
        let result = [];
        let mdBrowseGraphics = CswMapper.select(".//gmd:graphicOverview/gmd:MD_BrowseGraphic", this.baseMapper.idInfo)
        mdBrowseGraphics?.forEach(mdBrowseGraphic => {
            let fileName = this.text("./gmd:fileName/gco:CharacterString", mdBrowseGraphic);
            let fileDescription = this.text("./gmd:fileDescription/gco:CharacterString", mdBrowseGraphic);
            if (this.hasValue(fileName)) {
                let previewImageHtmlTag = "<img src='" + fileName + "' height='100' class='preview_image' ";
                if (this.hasValue(fileDescription)) {
                    previewImageHtmlTag += "alt='" + fileDescription + "' title='" + fileDescription + "' >";
                } else {
                    previewImageHtmlTag += "alt='"+ fileName + "' >";
                }
                result.push(previewImageHtmlTag);
            }
        });
        return this.getSingleEntryOrArray(result);
    }

    getT01_object() {
        let result = {
            obj_id: this.baseMapper.getGeneratedId(),
            org_obj_id: this.baseMapper.getGeneratedId(),
            obj_class: this.getObjClass(),
            info_note: this.text("./gmd:MD_DataIdentification/gmd:purpose/gco:CharacterString", this.baseMapper.idInfo),
            loc_descr: this.text("./gmd:MD_DataIdentification/gmd:EX_Extent/gmd:description/gco:CharacterString", this.baseMapper.idInfo),
            dataset_alternate_name: this.getAlternateTitleDeprecated(),
            dataset_character_set: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:characterSet/gmd:MD_CharacterSetCode/@codeListValue", this.baseMapper.idInfo), "510"),
            dataset_usage: this.text("./gmd:MD_DataIdentification/gmd:resourceSpecificUsage/gmd:MD_Usage/gmd:specificUsage/gco:CharacterString", this.baseMapper.idInfo),
            data_language_code: this.transformGeneric(this.text("./*/gmd:language/gco:CharacterString", this.baseMapper.idInfo), {"deu":"de", "ger":"de", "eng":"en"}, "de"),
            metadata_character_set: this.transformToIgcDomainId(this.text("./gmd:characterSet/gmd:MD_CharacterSetCode/@codeListValue", this.baseMapper.record), "510"),
            metadata_standard_name: this.text("./gmd:metadataStandardName/gco:CharacterString", this.baseMapper.record),
            metadata_standard_version: this.text("./gmd:metadataStandardVersion/gco:CharacterString", this.baseMapper.record),
            metadata_language_code: this.transformGeneric(this.text("./*/gmd:language/gco:CharacterString", this.baseMapper.idInfo), {"deu":"de", "ger":"de", "eng":"en"}, "de"),
            vertical_extent_minimum: this.text("./*/gmd:extent/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:minimumValue/gco:Real", this.baseMapper.idInfo),
            vertical_extent_maximum: this.text("./*/gmd:extent/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:maximumValue/gco:Real", this.baseMapper.idInfo),
            vertical_extent_unit: this.transformToIgcDomainId(this.text("./*/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:verticalCRS/gml:verticalCRS/gml:verticalCS/gml:VerticalCS/gml:axis/gml:CoordinateSystemAxis/@uom", this.baseMapper.idInfo), "102"),
            vertical_extent_vdatum: this.transformToIgcDomainId(this.text("./*/gmd:EX_Extent/gmd:verticalElement/gmd:EX_VerticalExtent/gmd:verticalCRS/gml:verticalCRS/gml:verticalDatum/gml:VerticalDatum/gml:identifier", this.baseMapper.idInfo), "101"),
            ordering_instructions: this.text("./gmd:distributionInfo/gmd:MD_Distribution/gmd:distributor/gmd:MD_Distributor/gmd:distributionOrderProcess/gmd:MD_StandardOrderProcess/gmd:orderingInstructions/gco:CharacterString", this.baseMapper.record),
            mod_time: this.getModifiedDate(),
            time_status: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:status/gmd:MD_ProgressCode/@codeListValue", this.baseMapper.idInfo), "523"),
            time_type: undefined,
            time_from: undefined,
            time_to: undefined,
            time_descr: this.text("./gmd:MD_DataIdentification/gmd:resourceMaintenance/gmd:MD_MaintenanceInformation/gmd:maintenanceNote/gco:CharacterString", this.baseMapper.idInfo),
            time_period: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:resourceMaintenance/gmd:MD_MaintenanceInformation/gmd:maintenanceAndUpdateFrequency/gmd:MD_MaintenanceFrequencyCode/@codeListValue", this.baseMapper.idInfo), "518")
        };
        let temporal = this.baseMapper.getTemporal()?.[0];
        if (temporal) {
            let hasStart = this.hasValue(temporal.gte?.toString());
            let hasEnd = this.hasValue(temporal.lte?.toString());
            if (hasStart && hasEnd){
                if (temporal.gte.toString() == temporal.lte.toString()) result.time_type = "am"
                else result.time_type = "von"
            }
            else if (hasStart && !hasEnd){
                if (temporal.lte === undefined) {
                    result.time_type = "seit";
                }
                else if (temporal.lte === null) {
                    result.time_type = "seitX";
                }
            }
            else if (!hasStart && hasEnd){
                result.time_type = "bis"
            }
            result.time_from = temporal.gte ? this.formatDate(temporal.gte) : "00000000"
            result.time_to = temporal.lte ? this.formatDate(temporal.lte) : "99999999";
        }
        return result;
    }

    private getObjClass(){
        let hierarchyLevel = this.getHierarchyLevel()
        let hierarchyLevelName = this.baseMapper.getHierarchyLevelName();
        let objectClass = "1";
        if (this.hasValue(hierarchyLevel)) {
            if (hierarchyLevel.toLowerCase() == "service") {
                // "Geodatendienst"
                objectClass = "3";
            } else if (hierarchyLevel.toLowerCase() == "application") {
                // "Dienst / Anwendung / Informationssystem"
                objectClass = "6";
            } else if (hierarchyLevel.toLowerCase() == "nongeographicdataset") {
                if (this.hasValue(hierarchyLevelName)) {
                    if (hierarchyLevelName == "job") {
                        // "Organisation/Fachaufgabe"
                        objectClass = "0";
                    } else if (hierarchyLevelName == "document") {
                        objectClass = "2";
                    } else if (hierarchyLevelName == "project") {
                        objectClass = "4";
                    } else if (hierarchyLevelName == "database") {
                        objectClass = "5";
                    }
                }
            }
        }
        return objectClass;
    }

    getT04Search() {
        let result = [];
        const addKeywords = (xpath: string, type: string) => {
            let keywords = CswMapper.select(xpath, this.baseMapper.idInfo);
            keywords?.forEach(keyword => {
                let value = keyword.textContent?.trim();
                if (this.hasValue(value) && !result.some(r => r.searchterm === value)) {
                    result.push({
                        searchterm: value,
                        type: type,
                    });
                }
            });
        };
        // check for INSPIRE themes
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - INSPIRE themes, version 1.0']/gmd:keyword/gco:CharacterString", "I");
        // check for GEMET keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='GEMET - Concepts, version 2.1']/gmd:keyword/gco:CharacterString", "G");
        // check for UMTHES keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords[gmd:thesaurusName/gmd:CI_Citation/gmd:title/gco:CharacterString='UMTHES Thesaurus']/gmd:keyword/gco:CharacterString", "T");
        // check for other keywords
        addKeywords(".//gmd:descriptiveKeywords/gmd:MD_Keywords/gmd:keyword/gco:CharacterString", "F");
        return this.getSingleEntryOrArray(result);
    }

    getT0110_avail_format() {
        let formats = CswMapper.select("./gmd:distributionInfo/gmd:MD_Distribution/gmd:distributionFormat/gmd:MD_Format", this.baseMapper.record);
        let result = formats?.map(format => ({
            name: this.text("./gmd:name/gco:CharacterString", format),
            version: this.text("./gmd:version/gco:CharacterString", format),
            file_decompression_technique: this.text("./gmd:fileDecompressionTechnique/gco:CharacterString", format),
            specification: this.text("./gmd:specification/gco:CharacterString", format)
        }));
        return this.getSingleEntryOrArray(result);
    }

    getT011_obj_geo() {
        let lineage = CswMapper.select("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage", this.baseMapper.record, true);
        let report = CswMapper.select("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:report", this.baseMapper.record, true);
        let result: any = {
            datasource_uuid: this.text("./*/gmd:citation/gmd:CI_Citation/gmd:identifier/*/gmd:code/gco:CharacterString", this.baseMapper.idInfo),
            referencesystem_id: this.getReferenceSystems(),
            hierarchy_level: this.transformGeneric(this.text("./gmd:hierarchyLevelName/gmd:MD_ScopeCode/@codeListValue", this.baseMapper.record), {"dataset":"5", "series":"6"}, false),
            vector_topology_level: this.transformToIgcDomainId(this.text("./gmd:spatialRepresentationInfo/gmd:MD_VectorSpatialRepresentation/gmd:topologyLevel/gmd:MD_TopologyLevelCode/@codeListValue", this.baseMapper.record), "528"),
            keyc_incl_w_dataset: this.transformGeneric(this.text("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:includedWithDataset/gco:Boolean", this.baseMapper.record), {"true":"1", "false":"0"}, false)
        };
        if (lineage) {
            result = {
                ...result,
                special_base: this.text("./gmd:statement/gco:CharacterString", lineage),
                data_base: this.text("./gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString", lineage),
                method: this.text("./gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString", lineage),
            };
        }
        if (report) {
            result = {
                ...result,
                rec_exact: this.text("./gmd:DQ_RelativeInternalPositionalAccuracy/gmd:DQ_QuantitativeResult/gmd:value/gco:Record", report),
                rec_grade: this.text("./gmd:DQ_CompletenessCommission/gmd:DQ_QuantitativeResult/gmd:value/gco:Record", report),
                pos_accuracy_vertical: this.text("./gmd:DQ_RelativeInternalPositionalAccuracy[gmd:measureDescription/gco:CharacterString='vertical']/gmd:DQ_QuantitativeResult/gmd:value/gmd:Record", report),
            };
        }
        return result;
    }

    getT011_obj_geo_keyc() {
        let fcCitations = CswMapper.select("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:featureCatalogueCitation/gmd:CI_Citation", this.baseMapper.record);
        return fcCitations?.map(citation => ({
            symbol_cat: this.text("./gmd:title/gco:CharacterString", citation),
            symbol_date: this.formatDate(new Date(Date.parse(this.text("./gmd:date/gmd:CI_Date/gmd:date/gco:Date", citation)))),
            edition: this.text("./gmd:edition/gco:CharacterString", citation)
        }));
    }

    getT011_obj_geo_symc() {
        let pcCitations = CswMapper.select("./gmd:portrayalCatalogueInfo/gmd:MD_PortrayalCatalogueReference/gmd:portrayalCatalogueCitation/gmd:CI_Citation", this.baseMapper.record);
        return pcCitations?.map(citation => ({
            symbol_cat: this.text("./gmd:title/gco:CharacterString", citation),
            symbol_date: this.formatDate(new Date(Date.parse(this.text("./gmd:date/gmd:CI_Date/gmd:date/gco:Date", citation)))),
            edition: this.text("./gmd:edition/gco:CharacterString", citation)
        }));
    }

    getT011_obj_geo_scale() {
        let resolutions = CswMapper.select("./gmd:MD_DataIdentification/gmd:spatialResolution/gmd:MD_Resolution", this.baseMapper.idInfo)
        return resolutions?.map(resolution => ({
            scale: this.text("./gmd:equivalentScale/gmd:MD_RepresentativeFraction/gmd:denominator/gco:Integer", resolution),
            resolution_ground: this.text("./gmd:distance/gmd:Distance[@uom='meter']", resolution),
            resolution_scan: this.text("./gmd:distance/gmd:Distance[@uom='dpi']", resolution)
        }));
    }

    getT011_obj_geo_spatial_rep() {
        return {
            type: this.transformToIgcDomainId(this.text("./gmd:MD_DataIdentification/gmd:spatialRepresentationType/MD_SpatialRepresentationTypeCode/@codeListValue", this.baseMapper.idInfo), "526")
        };
    }

    getT011_obj_geo_vector() {
        let geometricObjects = CswMapper.select("./gmd:spatialRepresentationInfo/gmd:MD_VectorSpatialRepresentation/gmd:geometricObjects/gmd:MD_GeometricObjects", this.baseMapper.record);
        return geometricObjects?.map(geometricObject => ({
            geometric_object_type: this.transformToIgcDomainId(this.text("./gmd:geometricObjectType/gmd:MD_GeometricObjectTypeCode/@codeListValue", geometricObject), "515"),
            geometric_object_count: this.text("./gmd:geometricObjectCount/gco:Integer", geometricObject)
        }));
    }

    getT011_obj_geo_supplinfo() {
        return {
            feature_type: this.text("./gmd:contentInfo/gmd:MD_FeatureCatalogueDescription/gmd:featureTypes/gco:LocalName", this.baseMapper.record)
        };
    }

    getT011_obj_serv() {
        return {
            base: this.text("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:source/gmd:LI_Source/gmd:description/gco:CharacterString", this.baseMapper.record),
            history: this.text("./gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:lineage/gmd:LI_Lineage/gmd:processStep/gmd:LI_ProcessStep/gmd:description/gco:CharacterString", this.baseMapper.record),
            type: this.text("./srv:SV_ServiceIdentification/srv:serviceType/gco:LocalName", this.baseMapper.idInfo)
        };
    }

    getT011_obj_serv_version() {
        let serviceTypeVersions = CswMapper.select("./srv:SV_ServiceIdentification/srv:serviceTypeVersion/gco:CharacterString", this.baseMapper.idInfo);
        if (serviceTypeVersions) {
            return { version_value: serviceTypeVersions?.map(serviceTypeVersion => serviceTypeVersion.textContent)?.join(", ") };
        }
        return undefined;
    }

    getT011_obj_serv_op_connpoint() {
        let operationsMetadata = CswMapper.select('./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata', this.baseMapper.idInfo);
        return operationsMetadata?.map(operationMetadata => ({
            connect_point: this.text("./srv:connectPoint/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", operationMetadata)
        }));
    }

    getT011_obj_serv_op_depends() {
        let dependsOn = this.text("./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata/srv:dependsOn/srv:SV_OperationMetadata/srv:operationName/gco:CharacterString", this.baseMapper.idInfo);
        return this.hasValue(dependsOn) ? { depends_on: dependsOn } : undefined;
    }

    getT011_obj_serv_op_para() {
        let svParameter = CswMapper.select("./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata/srv:parameters/srv:SV_Parameter", this.baseMapper.idInfo, true);
        if (!svParameter) {
            return undefined;
        }
        return {
            name: this.text("./srv:name", svParameter),
            direction: this.text("./srv:direction/srv:SV_ParameterDirection", svParameter),
            descr: this.text("./gmd:description/gco:CharacterString", svParameter),
            optional: this.transformGeneric(this.text("./srv:optionality/gco:CharacterString", svParameter), {"optional":"1", "mandatory":"0"}, false),
            repeatability: this.transformGeneric(this.text("./srv:repeatability/gco:Boolean", svParameter), {"true":"1", "false":"0"}, false)
        };
    }

    getT011_obj_serv_operation() {
        let operationsMetadata = CswMapper.select('./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata', this.baseMapper.idInfo);
        return operationsMetadata?.map(operationMetadata => ({
            name: this.text("./srv:operationName/gco:CharacterString", operationMetadata),
            descr: this.text("./srv:operationDescription/gco:CharacterString", operationMetadata),
            invocation_name: this.text("./srv:invocationName/gco:CharacterString", operationMetadata)
        }));
    }

    getT011_obj_serv_op_platform() {
        let operationsMetadata = CswMapper.select('./srv:SV_ServiceIdentification/srv:containsOperations/srv:SV_OperationMetadata', this.baseMapper.idInfo);
        return operationsMetadata?.map(operationMetadata => ({
            platform: this.text("./srv:DCP/srv:DCPList/@codeListValue", operationMetadata)
        }));
    }

    getT011_obj_topic_cat() {
        let topicCategories = CswMapper.select("./gmd:MD_DataIdentification/gmd:topicCategory/gmd:MD_TopicCategoryCode", this.baseMapper.idInfo);
        return topicCategories?.map(topicCategory => ({
            topic_category: this.transformToIgcDomainId(topicCategory.textContent, "527")
        }));
    }

    getT012_obj_adr() {
        let roles = CswMapper.select(".//gmd:CI_ResponsibleParty", this.baseMapper.record);
        return roles?.map(role => ({
            special_ref: "0", // explicitly set to 0
            typ: this.transformToIgcDomainId(this.text("./gmd:role/gmd:CI_RoleCode/@codeListValue", role), "505")
        }));
    }

    getT0113_dataset_reference() {
        let dates = CswMapper.select("./gmd:MD_DataIdentification/gmd:citation/gmd:CI_Citation/gmd:date/gmd:CI_Date", this.baseMapper.idInfo);
        return dates?.map(dateNode => {
            let date = this.text("./gmd:date/gco:Date|./gmd:date/gco:DateTime", dateNode);
            return {
                reference_date: date ? this.formatDate(new Date(Date.parse(date))) : null,
                type: this.transformToIgcDomainId(this.text("./gmd:dateType/gmd:CI_DateTypeCode/@codeListValue", dateNode), "502")
            };
        });
    }

    getT017_url_ref() {
        let onlineResources = CswMapper.select("./gmd:distributionInfo/gmd:MD_Distribution/gmd:transferOptions/gmd:MD_DigitalTransferOptions/gmd:onLine/gmd:CI_OnlineResource", this.baseMapper.record);
        let result = onlineResources?.map(onlineResource => ({
            url_link : this.text("./gmd:linkage/gmd:URL", onlineResource),
            content: this.text("./gmd:name/gco:CharacterString", onlineResource) ?? "",
            descr: this.text("./gmd:description/gco:CharacterString", onlineResource) ?? "",
            special_ref: this.transformToIgcDomainId(this.text("gmd:function/gmd:CI_OnLineFunctionCode/@codeListValue", onlineResource), "2000") ?? ""
        }));
        return result.filter(resource => this.hasValue(resource.url_link));
    }

    getT021_communication(): any[] {
        let results = [];
        let contacts = CswMapper.select(".//*/gmd:CI_ResponsibleParty", this.baseMapper.record);
        contacts?.forEach(contact => {
            const extractEntries = (path: string, commType: string) => {
                CswMapper.select(path, contact)?.forEach(entry => {
                    const commValue = entry.textContent;
                    if (this.hasValue(commValue)) {
                        results.push({
                            comm_type: commType,
                            comm_value: commValue,
                        });
                    }
                });
            };
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:phone/gmd:CI_Telephone/gmd:voice/gco:CharacterString", "Telefon");
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:phone/gmd:CI_Telephone/gmd:facsimile/gco:CharacterString", "Fax");
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:address/gmd:CI_Address/gmd:electronicMailAddress/gco:CharacterString", "Email");
            extractEntries("./gmd:contactInfo/gmd:CI_Contact/gmd:onlineResource/gmd:CI_OnlineResource/gmd:linkage/gmd:URL", "URL");
        });
        return results;
    }

    getLicenses(): IngridLicense[] {
        const licenses: IngridLicense[] = [];

        // gmd:useLimitation itself (IGE writes it into a MD_LegalConstraints of its own); not via getObjectUse(), which
        // feeds the deprecated object_use from the gmd:otherConstraints next to a gmd:useLimitation
        const useLimitations = CswMapper.select('./*/gmd:resourceConstraints/*/gmd:useLimitation/gco:CharacterString', this.baseMapper.idInfo)
            ?.map(node => node.textContent?.trim()).filter(Boolean);
        if (useLimitations?.length) {
            licenses.push({
                type: 'useLimitations',
                items: useLimitations.map(v => ({ name: v }))
            });
        }

        const useConstraintItems = this.getUseConstraintItems();
        if (useConstraintItems?.length) {
            licenses.push({ type: 'useConstraints', items: useConstraintItems });
        }

        const accessItems = this.getAccessConstraintItems();
        if (accessItems?.length) {
            licenses.push({ type: 'accessConstraints', items: accessItems });
        }

        return licenses.length ? licenses : undefined;
    }

    // not via getObjectAccess() (shared with the deprecated shape): also reads INSPIRE gmx:Anchor values
    // and resolves codelist 6010, which has no ISO value, by the anchor url or the text; a GDI-DE JSON license
    // text is no access constraint (the license is listed under useConstraints)
    private getAccessConstraintItems(): IngridLicense['items'] {
        const accessNodes = CswMapper.select('./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:accessConstraints]/*[self::gco:CharacterString or self::gmx:Anchor]', this.baseMapper.idInfo);
        return accessNodes?.map(node => {
            const name = node.textContent?.trim();
            const url = node.getAttribute('xlink:href') || undefined;
            return { name, name_ref_uri: this.codelistRef('6010', Codelist.getInstance().getIdByUrlOrText('6010', url, name)) };
        }).filter(item => item.name && !ingridCswMapper.parseLicenseJson(item.name));
    }

    // index-ingrid: true if an access constraint is given - "no limitations" (codelist 6010 entry 1,
    // INSPIRE LimitationsOnPublicAccess/noLimitations) is none; any other 6010 entry, an unknown text or a restriction
    // code other than otherRestrictions counts as one. Not via getObjectAccess() (deprecated shape, ignores Anchors).
    private hasAccessConstraints(): boolean {
        const noLimitations = this.codelistRef('6010', '1');
        const restrictingItem = this.getAccessConstraintItems()?.some(item => item.name_ref_uri !== noLimitations);
        const restrictionCodes = CswMapper.select('./*/gmd:resourceConstraints/*/gmd:accessConstraints/gmd:MD_RestrictionCode/@codeListValue', this.baseMapper.idInfo)
            ?.map(node => node.textContent?.trim()).filter(Boolean);
        return !!restrictingItem || !!restrictionCodes?.some(code => code !== 'otherRestrictions');
    }

    getConformanceResult(): IngridConformanceResult[] {
        const nodes = CswMapper.select(
            './gmd:dataQualityInfo/gmd:DQ_DataQuality/gmd:report//gmd:DQ_ConformanceResult',
            this.baseMapper.record
        );
        if (!nodes?.length) return undefined;
        return nodes.map(node => {
            const passVal = this.text('./gmd:pass/gco:Boolean', node);
            const specTitle = this.text('./gmd:specification/gmd:CI_Citation/gmd:title/gco:CharacterString', node);
            return {
                pass: passVal === 'true' ? 'conformant' : passVal === 'false' ? 'not-conformant' : 'not-evaluated',
                specification: specTitle || undefined,
                specification_ref_uri: specTitle ? this.codelistRef('6005', Codelist.getInstance().getIdByUrlOrText('6005', undefined, specTitle.trim())) : undefined,
                publication_date: this.text('./gmd:specification/gmd:CI_Citation/gmd:date/gmd:CI_Date/gmd:date/gco:Date', node) ?? undefined,
                explanation: this.text('./gmd:explanation/gco:CharacterString', node) ?? undefined,
            };
        });
    }

    getDataQuality(): IngridDataQuality {
        const dqNode = CswMapper.select('./gmd:dataQualityInfo/gmd:DQ_DataQuality', this.baseMapper.record, true);
        if (!dqNode) return undefined;

        const parseNum = (val: string | undefined) => { const n = Number(val); return isNaN(n) || val == null ? undefined : n; };

        const qualityTypeMap: Record<string, IngridDataQuality['qualities'][number]['type']> = {
            'DQ_CompletenessCommission':              'completenessComission',
            'DQ_ConceptualConsistency':               'conceptualConsistency',
            'DQ_DomainConsistency':                   'domainConsistency',
            'DQ_FormatConsistency':                   'formatConsistency',
            'DQ_TopologicalConsistency':              'topologicalConsistency',
            'DQ_TemporalConsistency':                 'temporalConsistency',
            'DQ_ThematicClassificationCorrectness':   'thematicClassificationCorrectness',
            'DQ_NonQuantitativeAttributeAccuracy':    'nonQuantitativeAttributeAccuracy',
            'DQ_QuantitativeAttributeAccuracy':       'quantitativeAttributeAccuracy',
            'DQ_RelativeInternalPositionalAccuracy':  'relativeInternalPositionalAccuracy',
        };
        // codelist of the measure type per quality type, as IGE GeodatasetModelTransformer.qualitytypeCodelistMap
        const measureTypeCodelistMap: Record<string, string> = {
            'DQ_CompletenessCommission':              '7109',
            'DQ_ConceptualConsistency':               '7112',
            'DQ_DomainConsistency':                   '7113',
            'DQ_FormatConsistency':                   '7114',
            'DQ_TopologicalConsistency':              '7115',
            'DQ_TemporalConsistency':                 '7120',
            'DQ_ThematicClassificationCorrectness':   '7125',
            'DQ_NonQuantitativeAttributeAccuracy':    '7126',
            'DQ_QuantitativeAttributeAccuracy':       '7127',
            'DQ_RelativeInternalPositionalAccuracy':  '7128',
        };

        const completenessOmission = parseNum(this.text(
            './gmd:report/gmd:DQ_CompletenessOmission/gmd:result/gmd:DQ_QuantitativeResult/gmd:value/gco:Record', dqNode
        ));
        // IGE writes both accuracies as DQ_AbsoluteExternalPositionalAccuracy, told apart by gmd:measureDescription
        // ('vertical' / 'geographic') and gml:valueUnit/*/gml:quantityType (read by the IGE ISO import);
        // an unlabeled report counts as horizontal, a 'vertical' DQ_RelativeInternalPositionalAccuracy as vertical
        const absolute = './gmd:report/gmd:DQ_AbsoluteExternalPositionalAccuracy';
        const quantityType = "gmd:result/gmd:DQ_QuantitativeResult/gmd:valueUnit/*/*[local-name()='quantityType']";
        const isVertical = `(gmd:measureDescription/gco:CharacterString='vertical' or ${quantityType}='absolute external positional accuracy, vertical accuracy')`;
        const isHorizontal = `(gmd:measureDescription/gco:CharacterString='geographic' or ${quantityType}='absolute external positional accuracy, geographic accuracy')`;
        const value = '/gmd:result/gmd:DQ_QuantitativeResult/gmd:value/gco:Record';
        const horizontal = parseNum(
            this.text(`${absolute}[${isHorizontal}]${value}`, dqNode)
            || this.text(`${absolute}[not(${isVertical})]${value}`, dqNode)
        );
        const vertical = parseNum(
            this.text(`${absolute}[${isVertical}]${value}`, dqNode)
            || this.text(`./gmd:report/gmd:DQ_RelativeInternalPositionalAccuracy[gmd:measureDescription/gco:CharacterString='vertical']${value}`, dqNode)
        );
        const reportNodes = CswMapper.select('./gmd:report/*', dqNode);
        const qualities = reportNodes
            // only reports with a quantitative result; INSPIRE conformity reports (DQ_ConformanceResult) are conformance_result
            ?.filter(node => node.localName in qualityTypeMap && CswMapper.select('./gmd:result/gmd:DQ_QuantitativeResult', node)?.length)
            .map(node => {
                const measureType = this.text('./gmd:nameOfMeasure/gco:CharacterString', node) || undefined;
                const codelistId = measureTypeCodelistMap[node.localName];
                return {
                    type: qualityTypeMap[node.localName],
                    measure_type: measureType,
                    measure_type_ref_uri: measureType ? this.codelistRef(codelistId, Codelist.getInstance().getIdByUrlOrText(codelistId, undefined, measureType.trim())) : undefined,
                    value: parseNum(this.text('./gmd:result/gmd:DQ_QuantitativeResult/gmd:value/gco:Record', node)),
                    parameter: this.text('./gmd:measureDescription/gco:CharacterString', node) ?? undefined,
                };
            });

        const result: IngridDataQuality = {};
        if (completenessOmission != null) result.completeness_omission = completenessOmission;
        if (horizontal != null || vertical != null) result.positional_accuracy = { horizontal, vertical };
        if (qualities?.length) result.qualities = qualities;
        return Object.keys(result).length ? result : undefined;
    }

    getObjectUse() {
        let constraints = CswMapper.select("./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:useLimitation]/gco:CharacterString", this.baseMapper.idInfo);
        let result = constraints?.map(constraint => constraint.textContent).filter(text => text?.trim());
        return result?.length ? { terms_of_use_value: result } : undefined;
    }

    // GDI-DE convention: a license is written into gmd:otherConstraints as license text, optional note, optional
    // "Quellenvermerk: <source>" and a JSON { id, name, url, quelle }. As the IGE ISO import
    // (GeneralMapper.getUseConstraints()): if an element has JSON texts, only these become items (name, codelist 6500
    // ref by url or name, source from quelle); the plain texts are their human-readable duplicates. Grouped per
    // MD_LegalConstraints element (not by position as IGE), so a text after its JSON (nokis) is no extra item.
    getUseConstraintItems(): IngridLicense['items'] {
        const items: IngridLicense['items'] = [];
        for (const element of CswMapper.select('./*/gmd:resourceConstraints/*[gmd:useConstraints]', this.baseMapper.idInfo) ?? []) {
            const texts = CswMapper.select('./gmd:otherConstraints/*[self::gco:CharacterString or self::gmx:Anchor]', element)
                ?.map(node => node.textContent?.trim()).filter(Boolean) ?? [];
            const sourceNote = texts.map(text => text.match(/^Quellenvermerk:\s*(.+)$/)?.[1]?.trim()).find(Boolean);
            const licenses = texts.map(text => ingridCswMapper.parseLicenseJson(text)).filter(Boolean);
            if (licenses.length) {
                for (const license of licenses) {
                    if (!license.name) continue;
                    items.push({
                        name: license.name,
                        name_ref_uri: this.codelistRef('6500', Codelist.getInstance().getIdByUrlOrText('6500', license.url, license.name)),
                        source: license.quelle || sourceNote,
                    });
                }
                continue;
            }
            for (const text of texts.filter(text => !/^Quellenvermerk:/.test(text))) {
                items.push({
                    name: text,
                    name_ref_uri: this.codelistRef('6500', Codelist.getInstance().getIdByUrlOrText('6500', undefined, text)),
                    source: sourceNote,
                });
            }
        }
        return items.length ? items : undefined;
    }

    // a GDI-DE JSON license text ({ id, name, url, quelle }), otherwise undefined
    private static parseLicenseJson(text: string): { id?: string, name?: string, url?: string, quelle?: string } | undefined {
        if (!text?.startsWith('{')) return undefined;
        try {
            const json = JSON.parse(text);
            return json && typeof json === 'object' && !Array.isArray(json) ? json : undefined;
        }
        catch {
            return undefined;
        }
    }

    getObjectUseConstraintDeprecated() {
        let constraints = CswMapper.select("./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:useConstraints]/gmx:Anchor | ./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:useConstraints]/gco:CharacterString", this.baseMapper.idInfo);
        let result = constraints?.map(constraint => constraint.textContent).filter(text => text?.trim());
        return result?.length ? { license_value: result } : undefined;
    }

    getObjectAccess() {
        let restrictionValues = CswMapper.select("./*/gmd:resourceConstraints/*/gmd:otherConstraints[../gmd:accessConstraints]/gco:CharacterString", this.baseMapper.idInfo);
        return {
            restriction_key: restrictionValues?.map(restrictionValue => this.transformToIgcDomainId(restrictionValue.textContent, "6010") ?? "-1"),
            restriction_value: restrictionValues?.map(restrictionValue => restrictionValue.textContent),
            terms_of_use: this.text("./*/gmd:resourceConstraints/gmd:MD_LegalConstraints/gmd:useLimitation/gco:CharacterString", this.baseMapper.idInfo)
        };
    }

    isHvd(): boolean {
        let isOpendata = this.baseMapper.getKeywords()?.some(keyword => ['opendata', 'opendataident'].includes(keyword));
        let descriptiveKeywordsElems = CswMapper.select('./*/gmd:descriptiveKeywords/gmd:MD_Keywords', this.baseMapper.idInfo);
        if (isOpendata && descriptiveKeywordsElems?.length > 0) {
            for (let descriptiveKeywordsElem of descriptiveKeywordsElems) {
                let thesaurusName = this.text("./gmd:thesaurusName/gmd:CI_Citation/gmd:title/*[self::gco:CharacterString or self::gmx:Anchor]", descriptiveKeywordsElem);
                let keywords = CswMapper.select('./gmd:keyword', descriptiveKeywordsElem);
                if (thesaurusName?.toLowerCase()?.startsWith('high-value') && keywords?.length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    getHierarchyLevel() {
        return this.baseMapper.getHierarchyLevel();
    }

    private getReferenceSystems(): string[] {
        let rsIdentifiers = CswMapper.select("./gmd:referenceSystemInfo/gmd:MD_ReferenceSystem/gmd:referenceSystemIdentifier/gmd:RS_Identifier", this.baseMapper.record);
        return rsIdentifiers?.map(rsIdentifier => {
            let code = this.text("./gmd:code/gco:CharacterString", rsIdentifier);
            let codeSpace = this.text("../gmd:codeSpace/gco:CharacterString", rsIdentifier);
            return codeSpace ? `${codeSpace}:${code}` : code;
        });
    }

    getSpatialSystem() {
        return {
            referencesystem_value: this.getReferenceSystems()
        };
    }

    private getSingleEntryOrArray(result){
        if (result?.length > 1) return result;
        if (result?.length == 1) return result[0]
        return undefined;
    }

    private text(path: string, node: Element) {
        return CswMapper.select(path, node, true)?.textContent;
    }
}
